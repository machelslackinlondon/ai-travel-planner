export type PriceLevel = 'free' | 'value' | 'mid-range' | 'premium'

export interface SearchableRecord {
  id: string
  name: string
  description: string
  regionId: string
  destinationId: string
  tags: string[]
  popularity: number
  rating: number
  priceLevel: PriceLevel
}

export interface Destination extends SearchableRecord {
  category: string[]
  activities: string[]
}

export interface Attraction extends SearchableRecord { category: string }
export interface Hotel extends SearchableRecord { amenities: string[] }
export interface Restaurant extends SearchableRecord { cuisine: string[] }
export interface Activity extends SearchableRecord { durationHours: number }
export interface TravelEvent extends SearchableRecord { month: string }
export interface Region { id: string; name: string; description: string; country: string }
export interface MockItinerary { id: string; name: string; destinationId: string; days: number; tags: string[]; itemIds: string[] }

export type SearchDocumentType = 'destination' | 'attraction' | 'hotel' | 'restaurant' | 'activity' | 'event'
export interface SearchDocument extends SearchableRecord { type: SearchDocumentType; category: string[] }
