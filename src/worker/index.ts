import { contentItems } from '../lib/content'
import { buildFallbackNarrative, createPlan, scoreContent, validateNarrative } from '../lib/recommendations'
import { productEventSchema, tripBriefSchema, type AiNarrative, type ProductEvent, type TripBrief } from '../lib/schemas'

export type Env = {
  AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> }
  DEMO_MODE?: string
  AI_ENABLED?: string
  AI_MODEL?: string
  AI_TIMEOUT_MS?: string
  AI_MAX_DAILY_CALLS?: string
  AI_MAX_SESSION_CALLS_PER_HOUR?: string
  EVENT_MAX_SESSION_CALLS_PER_HOUR?: string
  SUPABASE_URL?: string
  SUPABASE_PUBLISHABLE_KEY?: string
}

type RateEntry = { windowStart: number; count: number }
type WorkerState = {
  aiRates: Map<string, RateEntry>
  eventRates: Map<string, RateEntry>
  narrativeCache: Map<string, AiNarrative>
  developmentEvents: Array<ProductEvent & { receivedAt: string }>
  dailyAi: { day: string; count: number }
}

const runtimeGlobal = globalThis as typeof globalThis & { __visitJamaicaWorkerState?: WorkerState }
const workerState: WorkerState = runtimeGlobal.__visitJamaicaWorkerState ??= {
  aiRates: new Map(),
  eventRates: new Map(),
  narrativeCache: new Map(),
  developmentEvents: [],
  dailyAi: { day: '', count: 0 },
}
const { aiRates, eventRates, narrativeCache, developmentEvents } = workerState

const securityHeaders = {
  'content-security-policy': "default-src 'self'; img-src 'self' data:; connect-src 'self' https://*.supabase.co; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()'
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { ...securityHeaders, 'cache-control': 'no-store' } })
}

function withinLimit(store: Map<string, RateEntry>, key: string, limit: number) {
  if (limit <= 0) return false
  const now = Date.now()
  const entry = store.get(key)
  if (!entry || now - entry.windowStart >= 3_600_000) {
    store.set(key, { windowStart: now, count: 1 })
    return true
  }
  if (entry.count >= limit) return false
  entry.count += 1
  return true
}

async function readSmallJson(request: Request, maxBytes: number) {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > maxBytes) throw new Error('Payload too large')
  const text = await request.text()
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new Error('Payload too large')
  return JSON.parse(text) as unknown
}

function safeSessionId(request: Request) {
  const id = request.headers.get('x-session-id') ?? ''
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : 'invalid-session'
}

function cacheKey(brief: TripBrief) {
  if (brief.note || brief.accessibility.length) return ''
  return JSON.stringify({
    nights: brief.nights, adultsBand: brief.adults > 2 ? '3+' : brief.adults, hasChildren: brief.children > 0,
    resortArea: brief.resortArea, interests: [...brief.interests].sort(), pace: brief.pace,
    spendLevel: brief.spendLevel, accommodationStyle: brief.accommodationStyle,
  })
}

function systemInstruction() {
  return `You organise a Jamaica trip shortlist supplied by the application. Return JSON only, with no Markdown. Never invent or change IDs, prices, URLs, availability, hours, ratings, safety claims, accessibility, provider rules, or other facts. Use only supplied content. If the content cannot answer something, omit the claim or say "Check with provider". Keep reasons under 180 characters and the summary under 240. Output exactly: {"summary":string,"recommendations":[{"contentId":string,"reason":string}],"days":[{"day":number,"title":string,"itemIds":string[]}]}. Include exactly the requested number of days.`
}

function parseAiText(result: unknown) {
  if (typeof result === 'string') return result
  if (result && typeof result === 'object' && 'response' in result && typeof result.response === 'string') return result.response
  throw new Error('AI returned no text')
}

async function runAi(env: Env, brief: TripBrief, sessionId: string): Promise<AiNarrative | null> {
  if (env.AI_ENABLED !== 'true' || !env.AI) return null
  const sessionLimit = Number(env.AI_MAX_SESSION_CALLS_PER_HOUR ?? 3)
  if (!withinLimit(aiRates, sessionId, sessionLimit)) return null
  const today = new Date().toISOString().slice(0, 10)
  if (workerState.dailyAi.day !== today) workerState.dailyAi = { day: today, count: 0 }
  if (workerState.dailyAi.count >= Number(env.AI_MAX_DAILY_CALLS ?? 100)) return null

  const shortlist = scoreContent(contentItems, brief).slice(0, 9)
  const allowedIds = new Set(shortlist.map((item) => item.id))
  const userInput = {
    tripBrief: {
      nights: brief.nights, adults: brief.adults, children: brief.children, resortArea: brief.resortArea,
      interests: brief.interests, pace: brief.pace, spendLevel: brief.spendLevel,
      accommodationStyle: brief.accommodationStyle, accessibility: brief.accessibility,
      ...(brief.note ? { note: brief.note } : {}),
    },
    shortlist: shortlist.map(({ id, type, title, summary, resortArea, interests, pace, suitableFor, priceStatus, priceBand }) => ({ id, type, title, summary, resortArea, interests, pace, suitableFor, priceStatus, priceBand })),
  }
  const timeoutMs = Number(env.AI_TIMEOUT_MS ?? 4500)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    workerState.dailyAi.count += 1
    try {
      const result = await Promise.race([
        env.AI.run(env.AI_MODEL ?? '@cf/meta/llama-3.1-8b-instruct', {
          messages: [{ role: 'system', content: systemInstruction() }, { role: 'user', content: JSON.stringify(userInput) }],
          max_tokens: 650,
          temperature: 0.2,
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), timeoutMs)),
      ])
      const text = parseAiText(result).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
      if (text.length > 12_000) throw new Error('AI output too large')
      return validateNarrative(JSON.parse(text), allowedIds, brief.nights)
    } catch {
      // One bounded retry is allowed; the caller always has a deterministic fallback.
    }
  }
  return null
}

async function planRoute(request: Request, env: Env) {
  let brief: TripBrief
  try {
    brief = tripBriefSchema.parse(await readSmallJson(request, 12_000))
  } catch {
    return json({ error: 'Check the trip details and try again.' }, 400)
  }
  const key = cacheKey(brief)
  const cached = key ? narrativeCache.get(key) : undefined
  const narrative = cached ?? await runAi(env, brief, safeSessionId(request))
  if (narrative && key) narrativeCache.set(key, narrative)
  return json(createPlan(brief, narrative ?? buildFallbackNarrative(contentItems, brief), narrative ? 'ai' : 'fallback'))
}

const eventProperties: Record<ProductEvent['eventName'], readonly string[]> = {
  planner_started: ['entryPage'],
  brief_completed: ['resortArea', 'tripLengthBand', 'interestCount', 'pace'],
  plan_generated: ['generationMode', 'itemCount'],
  plan_saved: ['saveMode'],
  provider_handoff_opened: ['contentType', 'providerDomain'],
}

function sanitiseEvent(event: ProductEvent): ProductEvent {
  const allowed = new Set(eventProperties[event.eventName])
  const validValue = (key: string, value: string | number | boolean) => {
    if (key === 'entryPage') return value === 'planner'
    if (key === 'resortArea') return ['montego-bay', 'negril', 'help-me-choose'].includes(String(value))
    if (key === 'tripLengthBand') return ['1-3', '4-7', '8+'].includes(String(value))
    if (key === 'interestCount') return typeof value === 'number' && value >= 1 && value <= 3
    if (key === 'pace') return ['relaxed', 'balanced', 'active'].includes(String(value))
    if (key === 'generationMode') return ['ai', 'fallback'].includes(String(value))
    if (key === 'itemCount') return typeof value === 'number' && value >= 0 && value <= 9
    if (key === 'saveMode') return ['connected', 'demo-local'].includes(String(value))
    if (key === 'contentType') return ['stay', 'experience'].includes(String(value))
    if (key === 'providerDomain') return ['example.com', 'visitjamaica.com', 'www.visitjamaica.com'].includes(String(value))
    return false
  }
  return { ...event, properties: Object.fromEntries(Object.entries(event.properties).filter(([key, value]) => allowed.has(key) && validValue(key, value))) }
}

async function persistEvent(event: ProductEvent, env: Env) {
  if (env.DEMO_MODE === 'true') {
    developmentEvents.unshift({ ...event, receivedAt: new Date().toISOString() })
    developmentEvents.splice(50)
    return
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return
  await fetch(`${env.SUPABASE_URL}/rest/v1/product_events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ session_id: event.sessionId, event_name: event.eventName, properties: event.properties }),
  })
}

async function eventRoute(request: Request, env: Env) {
  let event: ProductEvent
  try {
    event = sanitiseEvent(productEventSchema.parse(await readSmallJson(request, 3_000)))
  } catch {
    return json({ error: 'Invalid event' }, 400)
  }
  const limit = Number(env.EVENT_MAX_SESSION_CALLS_PER_HOUR ?? 30)
  if (!withinLimit(eventRates, event.sessionId, limit)) return json({ accepted: false }, 429)
  await persistEvent(event, env)
  return json({ accepted: true }, 202)
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method === 'POST' && url.pathname === '/api/plan') return planRoute(request, env)
    if (request.method === 'POST' && url.pathname === '/api/events') return eventRoute(request, env)
    if (request.method === 'GET' && url.pathname === '/api/dev/events' && env.DEMO_MODE === 'true') return json(developmentEvents)
    return json({ error: 'Not found' }, 404)
  },
}

export default worker
