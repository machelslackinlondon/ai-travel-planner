import { describe, expect, it } from 'vitest'
import { searchDocuments } from './index.js'

describe('mock data', () => {
  it('has unique, filterable search records', () => {
    expect(new Set(searchDocuments.map(({ id }) => id)).size).toBe(searchDocuments.length)
    expect(searchDocuments.every(({ tags, rating, popularity }) => tags.length > 0 && rating <= 5 && popularity <= 100)).toBe(true)
  })
})
