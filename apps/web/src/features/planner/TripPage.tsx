'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ContentCard } from '../../components/ContentCard'
import { ProviderDialog } from '../../components/ProviderDialog'
import { areaLabel } from '../../lib/content'
import { contentById, contentItems } from '../../lib/content'
import { trackEvent } from '../../lib/events'
import { scoreContent } from '../../lib/recommendations'
import { deleteRemoteTrip, getRemoteTrip, saveRemoteTrip } from '../../lib/remote-trips'
import type { ContentItem, TripPlan } from '../../lib/schemas'
import { clearDraft, deleteDemoTrip, getDemoSavedTrips, getDraft, saveDemoTrip, saveDraft } from '../../lib/storage'

export function TripPage({ id, customisationApplied = false }: { id: string; customisationApplied?: boolean }) {
  const [plan, setPlan] = useState<TripPlan | null>(() => getDraft(id) ?? getDemoSavedTrips().find((trip) => trip.id === id) ?? null)
  const [handoffItem, setHandoffItem] = useState<ContentItem | null>(null)
  const [showSave, setShowSave] = useState(false)
  const [pinned, setPinned] = useState<string[]>([])
  const [deleteError, setDeleteError] = useState('')
  const [loadingRemote, setLoadingRemote] = useState(plan === null)
  const offered = useRef(false)
  const router = useRouter()

  useEffect(() => { if (plan) saveDraft(plan) }, [plan])
  useEffect(() => {
    if (plan && !offered.current) {
      offered.current = true
      void trackEvent('trip_customisation_offered', { entryPoint: 'first-itinerary' })
    }
  }, [plan])
  useEffect(() => {
    if (plan) return
    getRemoteTrip(id)
      .then((savedPlan) => setPlan(savedPlan))
      .catch(() => undefined)
      .finally(() => setLoadingRemote(false))
  }, [id, plan])
  const recommendedItems = useMemo(() => plan?.recommendations.map((recommendation) => ({ recommendation, item: contentById.get(recommendation.contentId) })).filter((entry): entry is { recommendation: TripPlan['recommendations'][number]; item: ContentItem } => Boolean(entry.item)) ?? [], [plan])
  const totals = useMemo(() => {
    const result = { JMD: 0, USD: 0, unknown: 0 }
    for (const { item } of recommendedItems) {
      if (item.priceAmount !== undefined && item.currency) result[item.currency] += item.priceAmount
      else result.unknown += 1
    }
    return result
  }, [recommendedItems])

  if (!plan && loadingRemote) return <div className="narrow-page"><p role="status">Loading trip…</p></div>

  if (!plan) return (
    <div className="narrow-page">
      <div className="eyebrow">Trip unavailable</div><h1>We could not find this plan</h1>
      <p>An anonymous draft lasts only for this browser session. Build another plan or open a saved copy.</p>
      <div className="button-row"><Link className="button button-primary" href="/plan">Build a plan</Link><Link className="button button-secondary" href="/saved">View saved trips</Link></div>
    </div>
  )

  function removeItem(contentId: string) {
    setPlan((current) => current ? {
      ...current,
      recommendations: current.recommendations.filter((item) => item.contentId !== contentId),
      days: current.days.map((day) => ({ ...day, itemIds: day.itemIds.filter((itemId) => itemId !== contentId) })),
    } : current)
  }

  function replaceItem(contentId: string) {
    if (!plan) return
    const oldItem = contentById.get(contentId)
    if (!oldItem) return
    const usedIds = new Set(plan.recommendations.map((item) => item.contentId))
    const replacement = scoreContent(contentItems, plan.brief).find((item) => item.type === oldItem.type && item.resortArea === plan.selectedArea && !usedIds.has(item.id))
    if (!replacement) return
    setPlan({
      ...plan,
      recommendations: plan.recommendations.map((item) => item.contentId === contentId ? { contentId: replacement.id, reason: `Another ${replacement.priceBand} sample option that fits the selected area.` } : item),
      days: plan.days.map((day) => ({ ...day, itemIds: day.itemIds.map((itemId) => itemId === contentId ? replacement.id : itemId) })),
    })
  }

  function moveItem(index: number, direction: -1 | 1) {
    if (!plan) return
    const destination = index + direction
    if (destination < 0 || destination >= plan.recommendations.length) return
    const recommendations = [...plan.recommendations]
    ;[recommendations[index], recommendations[destination]] = [recommendations[destination], recommendations[index]]
    setPlan({ ...plan, recommendations })
  }

  async function deleteTrip() {
    if (!plan) return
    setDeleteError('')
    try {
      await deleteRemoteTrip(plan.id)
    } catch {
      deleteDemoTrip(plan.id)
      clearDraft()
      setDeleteError('The browser copy was removed, but the API could not confirm remote deletion. Try again when connected.')
      return
    }
    deleteDemoTrip(plan.id)
    clearDraft()
    router.push('/saved')
  }

  return (
    <>
      <section className="section-cream">
        <div className="page">
          <div className="plan-header">
            <div><div className="eyebrow">Your first Jamaica plan</div><h1>{areaLabel(plan.selectedArea)} in {plan.brief.nights} nights</h1><p className="lede">{plan.summary}</p></div>
          </div>
          {customisationApplied && <div className="notice" role="status"><strong>Changes applied successfully.</strong> Your customised itinerary is now the current trip.</div>}
        </div>
      </section>

      <div className="page" id="trip-outline">
        <div className="eyebrow">Day by day</div><h2>Your outline</h2>
        <ol className="day-list">
          {plan.days.map((day) => <li className="day-card" key={day.day}><div className="day-number">Day {day.day}</div><div><h3>{day.title}</h3>{day.itemIds.length ? day.itemIds.map((itemId) => <p key={itemId}>{contentById.get(itemId)?.title ?? 'Open time'}</p>) : <p>Open time to shape later.</p>}</div></li>)}
        </ol>
      </div>

      <section className="section-mint">
        <div className="page">
          <div className="eyebrow">Approved-content shortlist</div><h2>Edit your suggestions</h2>
          <p>Save a favourite, replace or remove an idea, or use the arrows to change shortlist order.</p>
          {recommendedItems.length ? <div className="card-grid">
            {recommendedItems.map(({ recommendation, item }, index) => (
              <ContentCard key={item.id} item={item} reason={recommendation.reason} onSource={() => setHandoffItem(item)} actions={<>
                <button className="button button-secondary" type="button" aria-pressed={pinned.includes(item.id)} onClick={() => setPinned((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}>{pinned.includes(item.id) ? 'Saved' : 'Save'}</button>
                <button className="text-button" type="button" onClick={() => replaceItem(item.id)}>Replace</button>
                <button className="text-button" type="button" onClick={() => removeItem(item.id)}>Remove</button>
                <button className="text-button" type="button" disabled={index === 0} aria-label={`Move ${item.title} earlier`} onClick={() => moveItem(index, -1)}>↑</button>
                <button className="text-button" type="button" disabled={index === recommendedItems.length - 1} aria-label={`Move ${item.title} later`} onClick={() => moveItem(index, 1)}>↓</button>
              </>} />
            ))}
          </div> : <div className="notice"><h3>Let us widen the options</h3><p>There are no remaining suggestions. Adjust your choices to build another shortlist.</p><Link href="/plan">Adjust my choices</Link></div>}
        </div>
      </section>

      <div className="page">
        <div className="card-grid">
          <section className="cost-panel">
            <div className="eyebrow">Cost assumptions</div><h2>Planning subtotals</h2>
            <p className="cost-total">USD {totals.USD.toLocaleString()}</p><p className="cost-total">JMD {totals.JMD.toLocaleString()}</p>
            <p>{totals.unknown} {totals.unknown === 1 ? 'item needs' : 'items need'} a provider price check.</p>
            <p className="helper">Each visible sample amount is added once. These figures are not converted, multiplied by travellers or nights, or presented as quotes. Transport to Jamaica is not included.</p>
          </section>
          <section className="trust-panel">
            <div className="eyebrow">How suggestions are made</div><h2>Approved records stay in control</h2>
            <p>The planner filters the catalogue first. AI can only organise those IDs and write short reasons. Prices, source links and provider details always come from the record.</p>
            <Link href="/help">Read the planner help</Link>
          </section>
        </div>
        <div className="button-row"><button className="button button-primary" type="button" onClick={() => setShowSave(true)}>Save this trip</button><Link className="button button-secondary" href="/plan">Keep editing my choices</Link><Link className="button button-secondary" href={`/ai-planner?tripId=${encodeURIComponent(plan.id)}`}>Customise this trip</Link><button className="button button-danger" type="button" onClick={() => void deleteTrip()}>Delete trip</button></div>
        {deleteError && <p className="field-error" role="alert">{deleteError}</p>}
      </div>

      {handoffItem && <ProviderDialog item={handoffItem} onClose={() => setHandoffItem(null)} />}
      {showSave && <SaveDialog plan={plan} onClose={() => setShowSave(false)} />}
    </>
  )
}

function SaveDialog({ plan, onClose }: { plan: TripPlan; onClose: () => void }) {
  const [status, setStatus] = useState<'ready' | 'sending' | 'saved'>('ready')
  const [remoteSaved, setRemoteSaved] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function save() {
    setError('')
    setStatus('sending')
    try {
      await saveRemoteTrip(plan)
      setRemoteSaved(true)
      saveDemoTrip(plan)
      await trackEvent('plan_saved', { saveMode: 'connected' })
    } catch {
      saveDemoTrip(plan)
      await trackEvent('plan_saved', { saveMode: 'demo-local' })
      setError('The API was unavailable, so this copy was saved only in this browser.')
    } finally {
      setStatus('saved')
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose() }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="save-title">
        {status === 'saved' ? <><h2 id="save-title">Your trip is saved</h2><p>{remoteSaved ? 'The API stored this plan in MongoDB for this device.' : 'This copy is stored only in this browser.'}</p>{error && <p className="field-error" role="alert">{error}</p>}<div className="button-row"><button className="button button-primary" type="button" onClick={() => router.push('/saved')}>View saved trips</button><button className="button button-secondary" type="button" onClick={onClose}>Keep editing</button></div></>
          : <><div className="eyebrow">Save after seeing value</div><h2 id="save-title">Save your plan to this device</h2><div className="notice"><strong>No account required</strong><p>Connected mode stores the plan in MongoDB under a random device identifier. A browser copy remains available if the API is offline.</p></div><div className="button-row"><button className="button button-primary" type="button" disabled={status === 'sending'} onClick={() => void save()}>{status === 'sending' ? 'Saving…' : 'Save this trip'}</button><button className="button button-secondary" type="button" onClick={onClose}>Continue without saving</button></div></>}
      </section>
    </div>
  )
}
