import { access, readFile } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const file = path.join(root, 'libs/catalog/seed/items.json')
const items = JSON.parse(await readFile(file, 'utf8'))
const errors = []
const ids = new Set()
const required = ['id', 'type', 'title', 'summary', 'resortArea', 'interests', 'pace', 'suitableFor', 'sourceUrl', 'checkedAt', 'priceStatus', 'priceBand', 'imagePath', 'imageAlt', 'published']

for (const [index, item] of items.entries()) {
  const label = item.id || `record ${index + 1}`
  for (const key of required) if (item[key] === undefined || item[key] === '') errors.push(`${label}: missing ${key}`)
  if (ids.has(item.id)) errors.push(`${label}: duplicate id`)
  ids.add(item.id)
  if (!item.title?.toLowerCase().includes('sample')) errors.push(`${label}: demo title must be visibly marked sample`)
  if (!['destination', 'stay', 'experience', 'information'].includes(item.type)) errors.push(`${label}: invalid type`)
  if (!['montego-bay', 'negril'].includes(item.resortArea)) errors.push(`${label}: invalid resortArea`)
  if (!['relaxed', 'balanced', 'active', 'any'].includes(item.pace)) errors.push(`${label}: invalid pace`)
  if (!['confirmed', 'estimated', 'check-with-provider'].includes(item.priceStatus)) errors.push(`${label}: invalid priceStatus`)
  if (!['free', 'value', 'mid-range', 'premium', 'unknown'].includes(item.priceBand)) errors.push(`${label}: invalid priceBand`)
  if (!/^https:\/\//.test(item.sourceUrl)) errors.push(`${label}: sourceUrl must use https`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.checkedAt) || Number.isNaN(Date.parse(`${item.checkedAt}T00:00:00Z`))) errors.push(`${label}: invalid checkedAt`)
  if (!item.imageAlt?.trim()) errors.push(`${label}: missing image alt text`)
  if (!item.imagePath?.startsWith('/images/') || /^https?:/.test(item.imagePath)) errors.push(`${label}: image must be a local /images path`)
  else {
    try { await access(path.join(root, 'apps/web/public', item.imagePath)) } catch { errors.push(`${label}: local image does not exist (${item.imagePath})`) }
  }
  if (item.published !== true) errors.push(`${label}: public seed includes an unpublished record`)
  if (item.priceAmount !== undefined && (!item.currency || item.priceAmount < 0)) errors.push(`${label}: priced record requires non-negative amount and currency`)
}

const count = (type) => items.filter((item) => item.type === type).length
if (count('stay') < 6) errors.push('seed requires at least six stays')
if (count('experience') < 8) errors.push('seed requires at least eight experiences')
if (count('destination') + count('information') < 4) errors.push('seed requires at least four destination/information records')

if (errors.length) {
  console.error(`Content validation failed:\n- ${errors.join('\n- ')}`)
  process.exit(1)
}

console.log(`Validated ${items.length} published sample content records.`)
