import type { Restaurant } from './types.js'

export const restaurants: Restaurant[] = [
  { id: 'mobay-market-kitchen', name: 'Montego Bay Market Kitchen', description: 'Sample casual stop for Jamaican flavours and local produce.', regionId: 'western-jamaica', destinationId: 'montego-bay', cuisine: ['Jamaican', 'Caribbean'], tags: ['food', 'family', 'local'], popularity: 84, rating: 4.5, priceLevel: 'value' },
  { id: 'negril-sunset-table', name: 'Negril Sunset Table', description: 'Sample dinner setting for couples overlooking the west coast.', regionId: 'western-jamaica', destinationId: 'negril', cuisine: ['Seafood', 'Caribbean'], tags: ['food', 'romantic', 'sunset', 'luxury'], popularity: 89, rating: 4.7, priceLevel: 'premium' },
  { id: 'ocho-jerk-garden', name: 'Ocho Rios Jerk Garden', description: 'Sample relaxed Jamaican lunch after an active morning.', regionId: 'north-coast-jamaica', destinationId: 'ocho-rios', cuisine: ['Jamaican'], tags: ['food', 'family', 'local'], popularity: 80, rating: 4.4, priceLevel: 'value' },
]
