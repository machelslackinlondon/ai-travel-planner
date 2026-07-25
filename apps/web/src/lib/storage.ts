import { tripPlanSchema, type TripPlan } from './schemas'

const currentKey = 'vj-current-trip'
const savedKey = 'vj-demo-saved-trips'
const sessionKey = 'vj-session-id'

export function saveDraft(plan: TripPlan) {
  sessionStorage.setItem(currentKey, JSON.stringify(plan))
}

export function getDraft(id?: string): TripPlan | null {
  try {
    const raw = sessionStorage.getItem(currentKey)
    if (!raw) return null
    const plan = tripPlanSchema.parse(JSON.parse(raw))
    return !id || plan.id === id ? plan : null
  } catch {
    return null
  }
}

export function clearDraft() {
  sessionStorage.removeItem(currentKey)
}

export function getDemoSavedTrips(): TripPlan[] {
  try {
    const raw = localStorage.getItem(savedKey)
    return raw ? tripPlanSchema.array().parse(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

export function saveDemoTrip(plan: TripPlan) {
  const trips = getDemoSavedTrips().filter((trip) => trip.id !== plan.id)
  localStorage.setItem(savedKey, JSON.stringify([plan, ...trips]))
}

export function deleteDemoTrip(id: string) {
  localStorage.setItem(savedKey, JSON.stringify(getDemoSavedTrips().filter((trip) => trip.id !== id)))
}

export function getSessionId() {
  let id = localStorage.getItem(sessionKey)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(sessionKey, id)
  }
  return id
}
