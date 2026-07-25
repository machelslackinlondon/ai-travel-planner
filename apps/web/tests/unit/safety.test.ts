import { describe, expect, it } from 'vitest'
import { contentItems } from '../../src/lib/content'
import { sanitiseEvent } from '../../src/lib/events'
import { getProviderLink } from '../../src/lib/provider'

describe('privacy and external-link controls', () => {
  it('removes event properties outside the per-event allowlist', () => {
    expect(sanitiseEvent('brief_completed', {
      resortArea: 'negril', interestCount: 2, email: 'visitor@example.com', note: 'private', accessibility: 'private',
    })).toEqual({ resortArea: 'negril', interestCount: 2 })
  })

  it('never includes the free-text customisation request in analytics', () => {
    expect(sanitiseEvent('trip_customisation_generated', {
      resultMode: 'demo', changeCount: 2, validationOutcome: 'valid', elapsedTimeBand: 'under-2s', request: 'private text',
    })).toEqual({ resultMode: 'demo', changeCount: 2, validationOutcome: 'valid', elapsedTimeBand: 'under-2s' })
  })

  it('allows sample provider pages and rejects unknown domains', () => {
    expect(getProviderLink(contentItems[0])?.demo).toBe(true)
    expect(getProviderLink({ ...contentItems[0], sourceUrl: 'https://malicious.invalid/leave' })).toBeNull()
    expect(getProviderLink({ ...contentItems[0], sourceUrl: 'http://example.com/not-secure' })).toBeNull()
  })
})
