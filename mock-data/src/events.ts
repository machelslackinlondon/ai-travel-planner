import type { TravelEvent } from './types.js'

export const events: TravelEvent[] = [
  { id: 'mobay-food-weekend', name: 'Montego Bay Food Weekend', description: 'Sample seasonal programme celebrating Jamaican food.', regionId: 'western-jamaica', destinationId: 'montego-bay', month: 'October', tags: ['food', 'culture', 'event'], popularity: 72, rating: 4.3, priceLevel: 'mid-range' },
  { id: 'negril-sunset-series', name: 'Negril Sunset Series', description: 'Sample evening music and food programme on the west coast.', regionId: 'western-jamaica', destinationId: 'negril', month: 'July', tags: ['music', 'food', 'romantic'], popularity: 75, rating: 4.4, priceLevel: 'value' },
]
