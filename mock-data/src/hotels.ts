import type { Hotel } from './types.js'

export const hotels: Hotel[] = [
  { id: 'mobay-family-resort', name: 'Montego Bay Family Resort', description: 'Sample family-friendly resort with pool and beach access.', regionId: 'western-jamaica', destinationId: 'montego-bay', amenities: ['pool', 'beach', 'family rooms'], tags: ['family', 'beach', 'resort'], popularity: 82, rating: 4.4, priceLevel: 'mid-range' },
  { id: 'negril-cliff-retreat', name: 'Negril Cliff Retreat', description: 'Sample premium stay for couples seeking a quiet sunset base.', regionId: 'western-jamaica', destinationId: 'negril', amenities: ['sea view', 'spa', 'restaurant'], tags: ['romantic', 'luxury', 'relaxation'], popularity: 86, rating: 4.7, priceLevel: 'premium' },
  { id: 'ocho-garden-hotel', name: 'Ocho Rios Garden Hotel', description: 'Sample value hotel close to north-coast attractions.', regionId: 'north-coast-jamaica', destinationId: 'ocho-rios', amenities: ['breakfast', 'pool'], tags: ['family', 'value', 'nature'], popularity: 74, rating: 4.2, priceLevel: 'value' },
]
