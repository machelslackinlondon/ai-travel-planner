import { searchDocuments } from './index.js'

const url = process.env.ELASTICSEARCH_URL?.replace(/\/$/, '')
const index = process.env.ELASTICSEARCH_TRAVEL_INDEX ?? 'visit-jamaica-travel'
if (!url) throw new Error('ELASTICSEARCH_URL is required to populate the search index.')

const headers: Record<string, string> = { 'content-type': 'application/json' }
if (process.env.ELASTICSEARCH_API_KEY) headers.authorization = `ApiKey ${process.env.ELASTICSEARCH_API_KEY}`
else if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
  headers.authorization = `Basic ${Buffer.from(`${process.env.ELASTICSEARCH_USERNAME}:${process.env.ELASTICSEARCH_PASSWORD}`).toString('base64')}`
}

const exists = await fetch(`${url}/${encodeURIComponent(index)}`, { method: 'HEAD', headers })
if (exists.status === 404) {
  const created = await fetch(`${url}/${encodeURIComponent(index)}`, {
    method: 'PUT', headers, body: JSON.stringify({ mappings: { dynamic: 'strict', properties: {
      id: { type: 'keyword' }, type: { type: 'keyword' }, name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      description: { type: 'text' }, regionId: { type: 'keyword' }, destinationId: { type: 'keyword' },
      tags: { type: 'keyword' }, category: { type: 'keyword' }, popularity: { type: 'integer' }, rating: { type: 'float' },
      priceLevel: { type: 'keyword' },
    } } }),
  })
  if (!created.ok) throw new Error(`Could not create Elasticsearch index: ${created.status} ${await created.text()}`)
} else if (!exists.ok) throw new Error(`Could not reach Elasticsearch: ${exists.status} ${await exists.text()}`)

const body = searchDocuments.flatMap((document) => [JSON.stringify({ index: { _index: index, _id: document.id } }), JSON.stringify(document)]).join('\n') + '\n'
const response = await fetch(`${url}/_bulk?refresh=true`, { method: 'POST', headers: { ...headers, 'content-type': 'application/x-ndjson' }, body })
if (!response.ok) throw new Error(`Elasticsearch bulk request failed: ${response.status} ${await response.text()}`)
const result = await response.json() as { errors?: boolean }
if (result.errors) throw new Error('Elasticsearch indexed one or more records with errors.')
console.log(`Indexed ${searchDocuments.length} mock-data records into ${index}.`)
