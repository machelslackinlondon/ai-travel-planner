import type { Activity } from './types.js'

export const activities: Activity[] = [
  { id: 'mobay-history-walk', name: 'Montego Bay History Walk', description: 'Sample guided introduction to local history and culture.', regionId: 'western-jamaica', destinationId: 'montego-bay', durationHours: 2, tags: ['culture', 'history', 'family'], popularity: 76, rating: 4.5, priceLevel: 'value' },
  { id: 'negril-sunset-sail', name: 'Negril Sunset Sail', description: 'Sample coastal sailing experience designed for a slower evening.', regionId: 'western-jamaica', destinationId: 'negril', durationHours: 3, tags: ['romantic', 'sunset', 'relaxation'], popularity: 90, rating: 4.8, priceLevel: 'premium' },
  { id: 'ocho-waterfall-day', name: 'Ocho Rios Waterfall Day', description: 'Sample active excursion combining waterfalls and gardens.', regionId: 'north-coast-jamaica', destinationId: 'ocho-rios', durationHours: 6, tags: ['nature', 'active', 'family'], popularity: 92, rating: 4.7, priceLevel: 'mid-range' },
]
