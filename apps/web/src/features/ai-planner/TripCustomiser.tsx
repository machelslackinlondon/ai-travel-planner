'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { generateTripCustomisation } from '../../lib/api'
import { contentById } from '../../lib/content'
import { trackEvent } from '../../lib/events'
import { getRemoteTrip, saveRemoteTrip } from '../../lib/remote-trips'
import type { CustomisationResult, TripPlan } from '../../lib/schemas'
import {
  clearCustomisationDraft,
  getCustomisationDraft,
  getDemoSavedTrips,
  getDraft,
  saveCustomisationDraft,
  saveDemoTrip,
  saveDraft,
} from '../../lib/storage'

const examples = [
  'Make the trip more family friendly.',
  'Reduce travel time and make the pace more relaxed.',
  'Replace one beach day with food and culture.',
]

const progressMessages = [
  'Understanding what matters to you…',
  'Searching approved sample content…',
  'Building a revised itinerary…',
  'Checking timing and practical constraints…',
]

function elapsedTimeBand(milliseconds: number) {
  if (milliseconds < 2_000) return 'under-2s'
  if (milliseconds <= 5_000) return '2-5s'
  return 'over-5s'
}

export function TripCustomiser({ tripId }: { tripId?: string }) {
  const [original, setOriginal] = useState<TripPlan | null>(null)
  const [request, setRequest] = useState(examples[0])
  const [result, setResult] = useState<CustomisationResult | null>(null)
  const [loadingTrip, setLoadingTrip] = useState(Boolean(tripId))
  const [loading, setLoading] = useState(false)
  const [progressIndex, setProgressIndex] = useState(0)
  const [error, setError] = useState('')
  const [wasSaved, setWasSaved] = useState(false)
  const applied = useRef(false)
  const generated = useRef(false)
  const stage = useRef<'request' | 'comparison' | 'validation'>('request')
  const router = useRouter()

  useEffect(() => {
    if (!tripId) return
    const activeTripId = tripId
    let cancelled = false
    async function loadTrip() {
      const localSaved = getDemoSavedTrips().find((trip) => trip.id === activeTripId)
      const local = getDraft(activeTripId) ?? localSaved
      const draft = getCustomisationDraft(activeTripId)
      let loaded = local ?? null
      if (!loaded) {
        try {
          loaded = await getRemoteTrip(activeTripId)
        } catch {
          loaded = null
        }
      } else {
        await Promise.resolve()
      }
      if (cancelled) return
      setOriginal(draft?.result.originalItinerary ?? loaded)
      setWasSaved(Boolean(localSaved || (!local && loaded)))
      setLoadingTrip(false)
      if (draft) {
        setRequest(draft.requestedChange)
        setResult(draft.result)
        generated.current = true
        stage.current = draft.result.status === 'valid' ? 'comparison' : 'validation'
      }
      if (loaded) void trackEvent('trip_customisation_started', { mode: 'customisation' })
    }
    void loadTrip()
    return () => { cancelled = true }
  }, [tripId])

  useEffect(() => {
    if (!loading) return
    const timer = window.setInterval(
      () => setProgressIndex((current) => Math.min(current + 1, progressMessages.length - 1)),
      1_000,
    )
    return () => window.clearInterval(timer)
  }, [loading])

  useEffect(() => () => {
    if (generated.current && !applied.current) {
      void trackEvent('trip_customisation_abandoned', { stage: stage.current })
    }
  }, [])

  async function submit() {
    if (!original) return
    const trimmed = request.trim()
    if (trimmed.length < 3 || trimmed.length > 500) {
      setError('Describe the change in 3 to 500 characters.')
      return
    }
    setError('')
    setProgressIndex(0)
    setLoading(true)
    stage.current = 'request'
    const startedAt = performance.now()
    try {
      const nextResult = await generateTripCustomisation(original, trimmed)
      setResult(nextResult)
      generated.current = true
      stage.current = nextResult.status === 'valid' ? 'comparison' : 'validation'
      saveCustomisationDraft({ tripId: original.id, requestedChange: trimmed, result: nextResult })
      void trackEvent('trip_customisation_generated', {
        resultMode: nextResult.resultMode,
        changeCount: nextResult.changes.length,
        validationOutcome: nextResult.status,
        elapsedTimeBand: elapsedTimeBand(performance.now() - startedAt),
      })
      if (nextResult.fallbackUsed) {
        void trackEvent('trip_customisation_fallback_used', { resultMode: nextResult.resultMode })
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The customiser is temporarily unavailable. Your original trip is unchanged.')
    } finally {
      setLoading(false)
    }
  }

  async function applyChanges() {
    if (!result?.proposedItinerary || result.status !== 'valid') return
    applied.current = true
    saveDraft(result.proposedItinerary)
    if (wasSaved) {
      saveDemoTrip(result.proposedItinerary)
      try {
        await saveRemoteTrip(result.proposedItinerary)
      } catch {
        // The browser copy remains available if connected persistence is unavailable.
      }
    }
    clearCustomisationDraft(result.originalItinerary.id)
    void trackEvent('trip_customisation_applied', { changeCount: result.changes.length })
    router.push(`/trip/${encodeURIComponent(result.proposedItinerary.id)}?customised=applied`)
  }

  function tryAgain() {
    if (original) clearCustomisationDraft(original.id)
    setResult(null)
    setError('')
    generated.current = false
    stage.current = 'request'
  }

  function returnToOriginal() {
    if (!original) return
    applied.current = true
    saveDraft(original)
    clearCustomisationDraft(original.id)
    void trackEvent('trip_customisation_abandoned', { stage: result ? 'comparison' : 'request' })
    router.push(`/trip/${encodeURIComponent(original.id)}`)
  }

  if (!tripId) return <MissingTrip />
  if (loadingTrip) return <div className="narrow-page"><p role="status">Loading your trip…</p></div>
  if (!original) return <MissingTrip />

  return (
    <div className="section-mint">
      <div className="ai-planner-page">
        <section className="planner-form" aria-labelledby="customise-title">
          <div className="eyebrow">Customise your current trip</div>
          <h1 id="customise-title">Your {original.brief.nights}-night {original.selectedArea === 'montego-bay' ? 'Montego Bay' : 'Negril'} plan</h1>
          <p className="lede">{original.summary}</p>
          <ul className="summary-list">
            {original.days.map((day) => <li key={day.day}><strong>Day {day.day}:</strong> {day.title}</li>)}
          </ul>
          <p className="trust-note">Your original itinerary stays unchanged until you choose Apply changes. Flights are outside this prototype.</p>
          <h2>What would you like to change?</h2>
          <div className="example-prompts" aria-label="Example changes">
            {examples.map((example) => <button type="button" key={example} onClick={() => setRequest(example)}>{example}</button>)}
          </div>
          <div className="form-group">
            <label htmlFor="customisation-request">Change request</label>
            <textarea id="customisation-request" value={request} maxLength={500} onChange={(event) => setRequest(event.target.value)} />
            <div className="helper">{request.length}/500 characters · Do not include sensitive information.</div>
          </div>
          {error && <div className="error-summary" role="alert">{error}</div>}
          {result?.status === 'needs-input' && <div className="notice" role="status"><strong>One more detail</strong><p>{result.followUpQuestion}</p></div>}
          {result?.status === 'no-results' && <div className="notice" role="status"><strong>No grounded alternatives found</strong><p>Try a broader change. Your original itinerary is still intact.</p></div>}
          {result?.status === 'invalid' && <div className="error-summary" role="alert"><strong>The proposal did not pass validation.</strong> Try a different change; the original remains unchanged.</div>}
          <div className="button-row">
            <button className="button button-primary" type="button" onClick={() => void submit()} disabled={loading}>{loading ? 'Customising…' : result ? 'Generate another option' : 'Customise this trip'}</button>
            <button className="button button-secondary" type="button" onClick={returnToOriginal}>Return to original itinerary</button>
          </div>
          {loading && <p className="notice" role="status" aria-live="polite">{progressMessages[progressIndex]}</p>}
        </section>

        {result?.status === 'valid' && result.proposedItinerary ? (
          <Comparison result={result} onApply={() => void applyChanges()} onTryAgain={tryAgain} onReturn={returnToOriginal} />
        ) : null}
      </div>
    </div>
  )
}

function MissingTrip() {
  return <div className="narrow-page"><div className="eyebrow">Start with a trip</div><h1>Build or open a trip before customising it</h1><p>The customiser needs your current brief and itinerary, so it never starts from an empty AI prompt.</p><div className="button-row"><Link className="button button-primary" href="/plan">Build a plan</Link><Link className="button button-secondary" href="/saved">Open saved trips</Link></div></div>
}

function Comparison({ result, onApply, onTryAgain, onReturn }: { result: CustomisationResult; onApply: () => void; onTryAgain: () => void; onReturn: () => void }) {
  const proposal = result.proposedItinerary
  if (!proposal) return null
  return (
    <section className="ai-itinerary" aria-labelledby="comparison-title" aria-live="polite">
      <div className="plan-header"><div><div className="eyebrow">{result.resultMode === 'demo' || result.fallbackUsed ? 'Demo data · ' : ''}Validated proposal</div><h2 id="comparison-title">Review changes before applying</h2></div></div>
      <p>The critic checked approved IDs, duplicates, day density, opening windows, activity overlap and transition time. One repair pass is allowed.</p>
      <ul className="change-list">
        {result.changes.map((change) => <li key={`${change.type}-${change.contentId}`}><strong>{change.type === 'added' ? 'Added' : change.type === 'removed' ? 'Removed' : 'Moved'}: {change.title}</strong><span>{change.fromDay ? ` From day ${change.fromDay}.` : ''}{change.toDay ? ` To day ${change.toDay}.` : ''} {change.reason}</span></li>)}
      </ul>
      <ol className="day-list">
        {proposal.days.map((day) => <li className="day-card" key={day.day}><div className="day-number">Day {day.day}</div><div><h3>{day.title}</h3>{day.itemIds.length ? day.itemIds.map((itemId) => <p key={itemId}>{contentById.get(itemId)?.title ?? itemId}</p>) : <p>Open time to rest or decide later.</p>}</div></li>)}
      </ol>
      {result.critic?.warnings.length ? <aside className="notice"><strong>Checks to make before booking</strong><ul>{result.critic.warnings.map((warning) => <li key={`${warning.code}-${warning.day}-${warning.contentId}`}>{warning.message}</li>)}</ul></aside> : null}
      <div className="button-row"><button className="button button-primary" type="button" onClick={onApply}>Apply changes</button><button className="button button-secondary" type="button" onClick={onTryAgain}>Try another customisation</button><button className="text-button" type="button" onClick={onReturn}>Return to original itinerary</button></div>
    </section>
  )
}
