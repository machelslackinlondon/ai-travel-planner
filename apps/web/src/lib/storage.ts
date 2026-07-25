import { aiPlannerResponseSchema, tripPlanSchema, type AiPlannerResponse, type TripPlan } from './schemas'

const currentKey = 'vj-current-trip'
const savedKey = 'vj-demo-saved-trips'
const sessionKey = 'vj-session-id'
const aiSavedKey = 'visit-jamaica-ai-itineraries'
const favouriteDestinationsKey = 'vj-favourite-destinations'

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

export function getAiSavedTrips(): AiPlannerResponse[] {
  try {
    const raw = localStorage.getItem(aiSavedKey)
    return raw ? aiPlannerResponseSchema.array().parse(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

export function saveAiTrip(plan: AiPlannerResponse) {
  const trips = getAiSavedTrips().filter((trip) => trip.id !== plan.id)
  localStorage.setItem(aiSavedKey, JSON.stringify([plan, ...trips].slice(0, 10)))
}

export function deleteAiTrip(id: string) {
  localStorage.setItem(aiSavedKey, JSON.stringify(getAiSavedTrips().filter((trip) => trip.id !== id)))
}

export function isDestinationFavourited(destinationId: string) {
  try {
    const ids = JSON.parse(localStorage.getItem(favouriteDestinationsKey) ?? '[]') as unknown
    return Array.isArray(ids) && ids.includes(destinationId)
  } catch {
    return false
  }
}

export function setDestinationFavourited(destinationId: string, favourited: boolean) {
  let ids: string[] = []
  try {
    const stored = JSON.parse(localStorage.getItem(favouriteDestinationsKey) ?? '[]') as unknown
    if (Array.isArray(stored)) ids = stored.filter((id): id is string => typeof id === 'string')
  } catch {
    // Replace corrupt demo-only state with a valid list.
  }
  const next = favourited ? [...new Set([...ids, destinationId])] : ids.filter((id) => id !== destinationId)
  localStorage.setItem(favouriteDestinationsKey, JSON.stringify(next))
}

export function getSessionId() {
  let id = localStorage.getItem(sessionKey)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(sessionKey, id)
  }
  return id
}
