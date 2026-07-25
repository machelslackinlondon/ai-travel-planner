import { activities } from './activities.js'
import { attractions } from './attractions.js'
import { destinations } from './destinations.js'
import { events } from './events.js'
import { hotels } from './hotels.js'
import { restaurants } from './restaurants.js'
import type { SearchDocument } from './types.js'

export * from './activities.js'
export * from './attractions.js'
export * from './destinations.js'
export * from './events.js'
export * from './hotels.js'
export * from './itineraries.js'
export * from './regions.js'
export * from './restaurants.js'
export * from './types.js'

const toDocument = (type: SearchDocument['type'], item: Omit<SearchDocument, 'type' | 'category'> & { category?: string | string[]; cuisine?: string[]; amenities?: string[] }) => ({
  id: item.id,
  type,
  name: item.name,
  description: item.description,
  regionId: item.regionId,
  destinationId: item.destinationId,
  tags: item.tags,
  popularity: item.popularity,
  rating: item.rating,
  priceLevel: item.priceLevel,
  category: Array.isArray(item.category) ? item.category : item.category ? [item.category] : item.cuisine ?? item.amenities ?? item.tags,
}) satisfies SearchDocument

export const searchDocuments: SearchDocument[] = [
  ...destinations.map((item) => toDocument('destination', item)),
  ...attractions.map((item) => toDocument('attraction', item)),
  ...hotels.map((item) => toDocument('hotel', item)),
  ...restaurants.map((item) => toDocument('restaurant', item)),
  ...activities.map((item) => toDocument('activity', item)),
  ...events.map((item) => toDocument('event', item)),
]
