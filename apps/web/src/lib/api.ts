import { contentItems } from './content'
import { buildFallbackPlan } from './recommendations'
import { aiPlannerResponseSchema, customisationResultSchema, tripBriefSchema, tripPlanSchema, type AiPlannerResponse, type CustomisationResult, type TripBrief, type TripPlan } from './schemas'
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

export async function generateTripCustomisation(plan: TripPlan, requestedChange: string): Promise<CustomisationResult> {
  const trimmed = requestedChange.trim()
  if (trimmed.length < 3 || trimmed.length > 500) throw new Error('Describe the change in 3 to 500 characters.')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(apiUrl(`/api/trips/${encodeURIComponent(plan.id)}/customise`), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-session-id': getSessionId() },
      body: JSON.stringify({
        tripId: plan.id,
        originalItinerary: plan,
        originalBrief: plan.brief,
        requestedChange: trimmed,
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const message = response.status === 429 ? 'Customisation limit reached. Please try again later.' : 'The customiser is temporarily unavailable. Your original trip is unchanged.'
      throw new Error(message)
    }
    return customisationResultSchema.parse(await response.json())
  } finally {
    window.clearTimeout(timeout)
  }
}
