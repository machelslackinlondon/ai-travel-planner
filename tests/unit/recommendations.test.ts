import { describe, expect, it } from 'vitest'
import { contentItems } from '../../src/lib/content'
import { buildFallbackPlan, chooseArea, scoreContent, validateNarrative } from '../../src/lib/recommendations'
import type { TripBrief } from '../../src/lib/schemas'

const brief: TripBrief = {
  timingMode: 'nights', nights: 5, adults: 2, children: 0, resortArea: 'negril',
  interests: ['beach', 'relaxation'], pace: 'relaxed', spendLevel: 'mid-range',
  accommodationStyle: 'hotel-resort', accessibility: [], note: '',
}

describe('deterministic recommendations', () => {
  it('keeps all recommendations inside the published catalogue', () => {
    const plan = buildFallbackPlan(contentItems, brief, 'test-plan')
    const ids = new Set(contentItems.map((item) => item.id))
    expect(plan.recommendations.length).toBeGreaterThanOrEqual(4)
    expect(plan.recommendations.every((item) => ids.has(item.contentId))).toBe(true)
    expect(plan.days).toHaveLength(5)
  })

  it('prioritises the selected area and child-suitable content', () => {
    const familyBrief = { ...brief, resortArea: 'montego-bay' as const, children: 2, interests: ['family' as const] }
    const ranked = scoreContent(contentItems, familyBrief)
    expect(ranked[0].resortArea).toBe('montego-bay')
    expect(ranked.some((item) => item.suitableFor.includes('children'))).toBe(true)
  })

  it('uses priorities to help choose an area', () => {
    expect(chooseArea({ ...brief, resortArea: 'help-me-choose', interests: ['beach', 'relaxation'] })).toBe('negril')
    expect(chooseArea({ ...brief, resortArea: 'help-me-choose', interests: ['culture', 'food'] })).toBe('montego-bay')
  })
})

describe('AI response boundary', () => {
  it('rejects unknown content IDs', () => {
    expect(() => validateNarrative({
      summary: 'A short outline.',
      recommendations: [{ contentId: 'invented-provider', reason: 'Invented.' }],
      days: Array.from({ length: 5 }, (_, index) => ({ day: index + 1, title: 'Day', itemIds: [] })),
    }, new Set(contentItems.map((item) => item.id)), 5)).toThrow(/unknown content ID/)
  })

  it('rejects malformed and wrong-length output', () => {
    expect(() => validateNarrative({ summary: 'Missing arrays' }, new Set(), 5)).toThrow()
    const known = contentItems[0].id
    expect(() => validateNarrative({
      summary: 'A short outline.', recommendations: [{ contentId: known, reason: 'Known.' }],
      days: [{ day: 1, title: 'Only one day', itemIds: [known] }],
    }, new Set([known]), 5)).toThrow(/wrong number of days/)
  })
})
