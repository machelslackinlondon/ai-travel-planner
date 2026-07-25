import type { AiNarrative, ContentItem, TripBrief, TripPlan } from './schemas'
import { aiNarrativeSchema } from './schemas'

const spendRanks: Record<TripBrief['spendLevel'], number> = { value: 1, 'mid-range': 2, premium: 3, flexible: 0 }
const bandRanks: Record<ContentItem['priceBand'], number> = { free: 1, value: 1, 'mid-range': 2, premium: 3, unknown: 0 }

export function chooseArea(brief: TripBrief): ContentItem['resortArea'] {
  if (brief.resortArea !== 'help-me-choose') return brief.resortArea
  const negrilSignals = brief.interests.filter((interest) => ['beach', 'relaxation', 'nature'].includes(interest)).length
  return negrilSignals >= 2 ? 'negril' : 'montego-bay'
}

export function scoreContent(items: ContentItem[], brief: TripBrief): ContentItem[] {
  const selectedArea = chooseArea(brief)
  const targetSpend = spendRanks[brief.spendLevel]
  const hasChildren = brief.children > 0

  return [...items]
    .filter((item) => item.published && ['stay', 'experience'].includes(item.type))
    .map((item) => {
      let score = item.resortArea === selectedArea ? 20 : -10
      score += item.interests.filter((interest) => brief.interests.includes(interest as TripBrief['interests'][number])).length * 8
      if (item.pace === brief.pace || item.pace === 'any') score += 4
      if (hasChildren && (item.suitableFor.includes('children') || item.suitableFor.includes('families'))) score += 5
      if (!hasChildren && item.suitableFor.includes('adults')) score += 2
      if (targetSpend === 0 || bandRanks[item.priceBand] === targetSpend || item.priceBand === 'free') score += 4
      if (targetSpend && bandRanks[item.priceBand] > targetSpend) score -= 3
      const styleWords: Record<TripBrief['accommodationStyle'], string[]> = {
        'hotel-resort': ['hotel', 'resort'],
        'villa-apartment': ['villa', 'apartment'],
        'guest-house': ['guest house', 'guest rooms'],
        'no-preference': [],
      }
      if (item.type === 'stay' && styleWords[brief.accommodationStyle].some((word) => item.title.toLowerCase().includes(word))) score += 7
      return { item, score }
    })
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .map(({ item }) => item)
}

function reasonFor(item: ContentItem, brief: TripBrief) {
  const matches = item.interests.filter((interest) => brief.interests.includes(interest as TripBrief['interests'][number]))
  if (matches.length) return `Fits your ${matches.slice(0, 2).join(' and ')} priorities and ${brief.pace} pace.`
  if (item.type === 'stay') return `A ${item.priceBand} sample stay in the selected resort area.`
  return `Adds variety while keeping the outline centred on your selected resort area.`
}

export function buildFallbackNarrative(items: ContentItem[], brief: TripBrief): AiNarrative {
  const ranked = scoreContent(items, brief)
  const stay = ranked.find((item) => item.type === 'stay')
  const experiences = ranked.filter((item) => item.type === 'experience').slice(0, Math.min(6, Math.max(3, brief.nights)))
  const chosen = [...(stay ? [stay] : []), ...experiences]
  const area = chooseArea(brief) === 'montego-bay' ? 'Montego Bay' : 'Negril'
  const interestWords = brief.interests.slice(0, 2).join(' and ')

  return {
    summary: `A ${brief.pace} ${brief.nights}-night outline centred on ${area}, with more ${interestWords}.`,
    recommendations: chosen.map((item) => ({ contentId: item.id, reason: reasonFor(item, brief) })),
    days: Array.from({ length: brief.nights }, (_, index) => {
      const experience = experiences[index % Math.max(experiences.length, 1)]
      return {
        day: index + 1,
        title: index === 0 ? `Arrive and settle into ${area}` : index === brief.nights - 1 ? 'A lighter final day' : `Explore ${area}`,
        itemIds: experience ? [experience.id] : [],
      }
    }),
  }
}

export function validateNarrative(input: unknown, allowedIds: Set<string>, nights: number): AiNarrative {
  const narrative = aiNarrativeSchema.parse(input)
  if (narrative.days.length !== nights) throw new Error('AI returned the wrong number of days')
  const ids = [
    ...narrative.recommendations.map((item) => item.contentId),
    ...narrative.days.flatMap((day) => day.itemIds),
  ]
  if (ids.some((id) => !allowedIds.has(id))) throw new Error('AI returned an unknown content ID')
  return narrative
}

export function createPlan(brief: TripBrief, narrative: AiNarrative, generationMode: TripPlan['generationMode'], id: string = crypto.randomUUID()): TripPlan {
  return {
    ...narrative,
    id,
    brief,
    selectedArea: chooseArea(brief),
    generationMode,
    generatedAt: new Date().toISOString(),
    ...(generationMode === 'fallback' ? { fallbackMessage: 'We built this plan from your preferences. Personalised wording is temporarily unavailable.' } : {}),
  }
}

export function buildFallbackPlan(items: ContentItem[], brief: TripBrief, id?: string) {
  return createPlan(brief, buildFallbackNarrative(items, brief), 'fallback', id)
}
