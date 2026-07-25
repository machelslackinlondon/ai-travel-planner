import type { Destination } from './types.js'

export const destinations: Destination[] = [
  { id: 'montego-bay', name: 'Montego Bay', description: 'A lively coastal base for beaches, food, culture and family trips.', regionId: 'western-jamaica', destinationId: 'montego-bay', category: ['coast', 'city', 'family'], activities: ['beach', 'food', 'culture'], tags: ['family', 'food', 'beach', 'luxury'], popularity: 96, rating: 4.7, priceLevel: 'mid-range' },
  { id: 'negril', name: 'Negril', description: 'A relaxed west-coast destination known for long beaches and sunsets.', regionId: 'western-jamaica', destinationId: 'negril', category: ['coast', 'romantic', 'relaxed'], activities: ['beach', 'nature', 'food'], tags: ['romantic', 'beach', 'relaxation', 'luxury'], popularity: 94, rating: 4.8, priceLevel: 'mid-range' },
  { id: 'ocho-rios', name: 'Ocho Rios', description: 'A north-coast base for waterfalls, gardens and active excursions.', regionId: 'north-coast-jamaica', destinationId: 'ocho-rios', category: ['coast', 'adventure'], activities: ['nature', 'waterfalls', 'family'], tags: ['family', 'nature', 'active'], popularity: 88, rating: 4.6, priceLevel: 'mid-range' },
]
