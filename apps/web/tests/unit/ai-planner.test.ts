import { describe, expect, it } from 'vitest'
import { aiPlannerResponseSchema } from '../../src/lib/schemas'

describe('AI planner response contract', () => {
  it('rejects unstructured or out-of-range itinerary output', () => {
    const result = aiPlannerResponseSchema.safeParse({ id: 'not-a-uuid', days: [] })
    expect(result.success).toBe(false)
  })
})
