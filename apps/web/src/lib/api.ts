import { contentItems } from './content'
import { buildFallbackPlan } from './recommendations'
import { aiPlannerResponseSchema, tripBriefSchema, tripPlanSchema, type AiPlannerResponse, type TripBrief, type TripPlan } from './schemas'
import { getSessionId } from './storage'
import { apiUrl } from './api-url'

export async function generatePlan(input: TripBrief): Promise<TripPlan> {
  const brief = tripBriefSchema.parse(input)
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8_000)

  try {
    const response = await fetch(apiUrl('/api/plan'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-session-id': getSessionId() },
      body: JSON.stringify(brief),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error('Plan API unavailable')
    return tripPlanSchema.parse(await response.json())
  } catch {
    return buildFallbackPlan(contentItems, brief)
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function generateConversationalPlan(request: string): Promise<AiPlannerResponse> {
  const trimmed = request.trim()
  if (trimmed.length < 3 || trimmed.length > 500) throw new Error('Describe your trip in 3 to 500 characters.')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10_000)
  try {
    const response = await fetch(apiUrl('/api/ai-planner'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-session-id': getSessionId() },
      body: JSON.stringify({ request: trimmed }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(response.status === 429 ? 'Planner limit reached. Please try again later.' : 'The planner is temporarily unavailable.')
    return aiPlannerResponseSchema.parse(await response.json())
  } finally {
    window.clearTimeout(timeout)
  }
}
