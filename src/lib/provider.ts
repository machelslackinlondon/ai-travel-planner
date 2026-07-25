import type { ContentItem } from './schemas'

const allowedDomains = new Set(['example.com', 'visitjamaica.com', 'www.visitjamaica.com'])

export type ProviderLink = {
  url: string
  domain: string
  providerName: string
  label: string
  demo: boolean
}

export function getProviderLink(item: ContentItem): ProviderLink | null {
  try {
    const url = new URL(item.sourceUrl)
    if (url.protocol !== 'https:' || !allowedDomains.has(url.hostname)) return null
    const demo = url.hostname === 'example.com'
    return {
      url: url.toString(),
      domain: url.hostname,
      providerName: demo ? 'Sample provider page' : 'Visit Jamaica approved source',
      label: demo ? 'Demo link' : 'Provider link',
      demo,
    }
  } catch {
    return null
  }
}

export function openProvider(link: ProviderLink) {
  const opened = window.open(link.url, '_blank', 'noopener,noreferrer')
  if (opened) opened.opener = null
}
