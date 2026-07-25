import { apiUrl } from './api-url'
import { tripPlanSchema, type TripPlan } from './schemas'
import { getSessionId } from './storage'

function headers() {
  return { 'content-type': 'application/json', 'x-session-id': getSessionId() }
}

async function parsePlan(response: Response) {
  if (!response.ok) throw new Error('Trip API unavailable')
  return tripPlanSchema.parse(await response.json())
}

export async function listRemoteTrips(): Promise<TripPlan[]> {
  const response = await fetch(apiUrl('/api/trips'), { headers: headers() })
  if (!response.ok) throw new Error('Trip API unavailable')
  return tripPlanSchema.array().parse(await response.json())
}

export async function getRemoteTrip(id: string): Promise<TripPlan | null> {
  const response = await fetch(apiUrl(`/api/trips/${encodeURIComponent(id)}`), { headers: headers() })
  if (response.status === 404) return null
  return parsePlan(response)
}

export async function saveRemoteTrip(plan: TripPlan): Promise<TripPlan> {
  const response = await fetch(apiUrl(`/api/trips/${encodeURIComponent(plan.id)}`), {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(plan),
  })
  return parsePlan(response)
}

export async function deleteRemoteTrip(id: string): Promise<void> {
  const response = await fetch(apiUrl(`/api/trips/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: headers(),
  })
  if (!response.ok && response.status !== 404) throw new Error('Trip API unavailable')
}
