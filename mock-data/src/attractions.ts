import type { Attraction } from './types.js'

export const attractions: Attraction[] = [
  { id: 'doctor-cave-beach', name: "Doctor's Cave Beach", description: 'Sample beach stop close to central Montego Bay.', regionId: 'western-jamaica', destinationId: 'montego-bay', category: 'beach', tags: ['beach', 'family', 'swimming'], popularity: 91, rating: 4.6, priceLevel: 'value' },
  { id: 'seven-mile-beach', name: 'Seven Mile Beach', description: 'Sample long-beach experience for a relaxed Negril day.', regionId: 'western-jamaica', destinationId: 'negril', category: 'beach', tags: ['beach', 'romantic', 'sunset'], popularity: 98, rating: 4.9, priceLevel: 'free' },
  { id: 'dunns-river', name: "Dunn's River Falls", description: 'Sample waterfall and outdoor attraction near Ocho Rios.', regionId: 'north-coast-jamaica', destinationId: 'ocho-rios', category: 'nature', tags: ['nature', 'active', 'family'], popularity: 97, rating: 4.7, priceLevel: 'mid-range' },
]
