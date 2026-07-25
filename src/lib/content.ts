import rawContent from '../../content/seed/items.json'
import { contentItemSchema, type ContentItem } from './schemas'

export const contentItems: ContentItem[] = rawContent
  .map((item) => contentItemSchema.parse(item))
  .filter((item) => item.published)

export const contentById = new Map(contentItems.map((item) => [item.id, item]))

export function areaLabel(area: ContentItem['resortArea']) {
  return area === 'montego-bay' ? 'Montego Bay' : 'Negril'
}

export function typeLabel(type: ContentItem['type']) {
  return ({ destination: 'Resort area', stay: 'Accommodation', experience: 'Experience', information: 'Practical information' })[type]
}

export function priceStatusLabel(status: ContentItem['priceStatus']) {
  return ({ confirmed: 'Confirmed at last check', estimated: 'Estimated sample cost', 'check-with-provider': 'Check with provider' })[status]
}
