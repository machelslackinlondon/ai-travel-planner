'use client'

import Image from 'next/image'
import { areaLabel, priceStatusLabel, typeLabel } from '../lib/content'
import type { ContentItem } from '../lib/schemas'

type Props = {
  item: ContentItem
  reason?: string
  actions?: React.ReactNode
  onSource?: () => void
}

export function ContentCard({ item, reason, actions, onSource }: Props) {
  return (
    <article className="content-card">
      <Image src={item.imagePath} alt={item.imageAlt} width={1200} height={675} sizes="(max-width: 760px) 100vw, 33vw" />
      <div className="content-card-body">
        <div className="eyebrow">{areaLabel(item.resortArea)} · {typeLabel(item.type)}</div>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
        {reason && <p className="fit-reason"><strong>Why it fits:</strong> {reason}</p>}
        <dl className="trust-list">
          <div><dt>Price confidence</dt><dd>{priceStatusLabel(item.priceStatus)}</dd></div>
          {item.priceAmount !== undefined && item.currency && <div><dt>Sample amount</dt><dd>{item.currency} {item.priceAmount.toLocaleString()}</dd></div>}
          <div><dt>Checked</dt><dd><time dateTime={item.checkedAt}>{new Date(`${item.checkedAt}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time></dd></div>
        </dl>
        <div className="card-actions">
          {actions}
          {onSource
            ? <button className="text-button" type="button" onClick={onSource}>View demo source <span aria-hidden="true">↗</span></button>
            : <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">View demo source <span aria-hidden="true">↗</span></a>}
        </div>
      </div>
    </article>
  )
}
