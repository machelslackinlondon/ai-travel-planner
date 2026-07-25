import { describe, expect, it, vi } from 'vitest'
import worker from '../../src/worker/index'
import { tripPlanSchema, type TripBrief } from '../../src/lib/schemas'

const brief: TripBrief = {
  timingMode: 'nights', nights: 3, adults: 2, children: 0, resortArea: 'montego-bay',
  interests: ['culture'], pace: 'balanced', spendLevel: 'flexible',
  accommodationStyle: 'no-preference', accessibility: [], note: '',
}

function request() {
  return new Request('http://local.test/api/plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-session-id': crypto.randomUUID() },
    body: JSON.stringify(brief),
  })
}

async function planFor(env: Parameters<typeof worker.fetch>[1]) {
  const response = await worker.fetch(request(), env)
  expect(response.status).toBe(200)
  return tripPlanSchema.parse(await response.json())
}

describe('Worker AI fallbacks', () => {
  it('does not call the binding when AI is disabled', async () => {
    const run = vi.fn()
    const plan = await planFor({ AI_ENABLED: 'false', AI: { run } })
    expect(plan.generationMode).toBe('fallback')
    expect(run).not.toHaveBeenCalled()
  })

  it('falls back after malformed responses and one retry', async () => {
    const run = vi.fn().mockResolvedValue({ response: '{"not":"a plan"}' })
    const plan = await planFor({ AI_ENABLED: 'true', AI: { run }, AI_TIMEOUT_MS: '50' })
    expect(plan.generationMode).toBe('fallback')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('falls back on timeout', async () => {
    const run = vi.fn(() => new Promise<never>(() => undefined))
    const plan = await planFor({ AI_ENABLED: 'true', AI: { run }, AI_TIMEOUT_MS: '1' })
    expect(plan.generationMode).toBe('fallback')
  })

  it('falls back when the daily application allowance is zero', async () => {
    const run = vi.fn()
    const plan = await planFor({ AI_ENABLED: 'true', AI: { run }, AI_MAX_DAILY_CALLS: '0' })
    expect(plan.generationMode).toBe('fallback')
    expect(run).not.toHaveBeenCalled()
  })
})
