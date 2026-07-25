import { searchDocuments } from './index.js'

const ids = new Set<string>()
for (const item of searchDocuments) {
  if (ids.has(item.id)) throw new Error(`Duplicate mock-data id: ${item.id}`)
  if (item.rating < 0 || item.rating > 5) throw new Error(`Invalid rating: ${item.id}`)
  if (item.popularity < 0 || item.popularity > 100) throw new Error(`Invalid popularity: ${item.id}`)
  ids.add(item.id)
}
console.log(`Validated ${searchDocuments.length} searchable mock-data records.`)
