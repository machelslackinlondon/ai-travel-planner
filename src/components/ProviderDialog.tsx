'use client'

import { priceStatusLabel, typeLabel } from '../lib/content'
import { getProviderLink, openProvider } from '../lib/provider'
import type { ContentItem } from '../lib/schemas'
import { trackEvent } from '../lib/events'

export function ProviderDialog({ item, onClose }: { item: ContentItem; onClose: () => void }) {
  const link = getProviderLink(item)

  async function continueToProvider() {
    if (!link) return
    await trackEvent('provider_handoff_opened', { contentType: item.type, providerDomain: link.domain })
    openProvider(link)
    onClose()
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="provider-title">
        <div className="eyebrow">{link?.label ?? 'Link unavailable'}</div>
        <h2 id="provider-title">{link ? `Continue to ${link.providerName}` : 'This provider link is unavailable'}</h2>
        {link ? (
          <>
            <p>You are leaving Visit Jamaica to check this {typeLabel(item.type).toLowerCase()}. The provider controls live availability, final price, payment and cancellation terms.</p>
            <dl className="trust-list">
              <div><dt>Price status</dt><dd>{priceStatusLabel(item.priceStatus)}</dd></div>
              <div><dt>Last checked</dt><dd>{item.checkedAt}</dd></div>
            </dl>
            <div className="button-row">
              <button className="button button-primary" type="button" onClick={continueToProvider}>Continue to provider</button>
              <button className="button button-secondary" type="button" onClick={onClose}>Stay with my plan</button>
            </div>
          </>
        ) : (
          <>
            <p>Nothing has been booked or charged. Return to your plan and choose another option.</p>
            <button className="button button-primary" type="button" onClick={onClose}>Return to my plan</button>
          </>
        )}
      </section>
    </div>
  )
}
