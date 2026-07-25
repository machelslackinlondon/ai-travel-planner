import { contentItems } from './content'
import { buildFallbackPlan } from './recommendations'
import { tripBriefSchema, tripPlanSchema, type TripBrief, type TripPlan } from './schemas'
import { getSessionId } from './storage'

export async function generatePlan(input: TripBrief): Promise<TripPlan> {
  const brief = tripBriefSchema.parse(input)
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8_000)

  try {
    const response = await fetch('/api/plan', {
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
