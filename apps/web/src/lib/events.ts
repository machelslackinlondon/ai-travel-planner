import { allowedEventNames, type ProductEvent } from './schemas'
import { getSessionId } from './storage'
import { apiUrl } from './api-url'

type EventName = ProductEvent['eventName']
type SafeProperties = Record<string, string | number | boolean>

const allowedProperties: Record<EventName, readonly string[]> = {
  planner_started: ['entryPage'],
  brief_completed: ['resortArea', 'tripLengthBand', 'interestCount', 'pace'],
  plan_generated: ['generationMode', 'itemCount'],
  plan_saved: ['saveMode'],
  provider_handoff_opened: ['contentType', 'providerDomain'],
  search_performed: ['resultCount', 'searchMode'],
  destination_viewed: ['destinationId'],
  ai_planner_requested: ['requestLengthBand'],
  itinerary_generated: ['generationMode', 'searchBackend', 'dayCount'],
  itinerary_saved: ['saveMode'],
  destination_favourited: ['destinationId', 'favourited'],
  trip_customisation_offered: ['entryPoint'],
  trip_customisation_started: ['mode'],
  trip_customisation_generated: ['resultMode', 'changeCount', 'validationOutcome', 'elapsedTimeBand'],
  trip_customisation_applied: ['changeCount'],
  trip_customisation_abandoned: ['stage'],
  trip_customisation_fallback_used: ['resultMode'],
}

export function tripLengthBand(nights: number) {
  if (nights <= 3) return '1-3'
  if (nights <= 7) return '4-7'
  return '8+'
}

export function sanitiseEvent(eventName: EventName, properties: SafeProperties) {
  const allowed = new Set(allowedProperties[eventName])
  return Object.fromEntries(Object.entries(properties).filter(([key, value]) => allowed.has(key) && ['string', 'number', 'boolean'].includes(typeof value)))
}

export async function trackEvent(eventName: EventName, properties: SafeProperties = {}) {
  if (!allowedEventNames.includes(eventName)) return
  const payload = { sessionId: getSessionId(), eventName, properties: sanitiseEvent(eventName, properties) }
  try {
    await fetch(apiUrl('/api/events'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch {
    // Measurement must never interrupt the planning journey.
  }
}
