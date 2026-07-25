import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { searchDocuments } from './index.js'

const output = resolve(dirname(fileURLToPath(import.meta.url)), '../generated/search-documents.json')
await mkdir(dirname(output), { recursive: true })
await writeFile(output, `${JSON.stringify(searchDocuments, null, 2)}\n`, 'utf8')
console.log(`Exported ${searchDocuments.length} records to ${output}.`)
