'use client'

import { useState } from 'react'
import { generateConversationalPlan } from '../../lib/api'
import { trackEvent } from '../../lib/events'
import type { AiPlannerResponse } from '../../lib/schemas'
import { isDestinationFavourited, saveAiTrip, setDestinationFavourited } from '../../lib/storage'

const examples = [
  'Plan a 5 day luxury trip to Jamaica',
  'Create a family itinerary in Montego Bay',
  'Find romantic experiences near Negril',
  'Build a food-focused weekend itinerary',
]

function requestLengthBand(length: number) {
  if (length < 60) return 'short'
  if (length < 180) return 'medium'
  return 'long'
}

export function ConversationalPlanner() {
  const [request, setRequest] = useState(examples[1])
  const [plan, setPlan] = useState<AiPlannerResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [favourited, setFavourited] = useState(false)

  async function submit() {
    const trimmed = request.trim()
    setError('')
    setSaved(false)
    if (trimmed.length < 3 || trimmed.length > 500) {
      setError('Describe your trip in 3 to 500 characters.')
      return
    }
    setLoading(true)
    void trackEvent('ai_planner_requested', { requestLengthBand: requestLengthBand(trimmed.length) })
    try {
      const nextPlan = await generateConversationalPlan(trimmed)
      setPlan(nextPlan)
      setFavourited(nextPlan.interpretedRequest.destination ? isDestinationFavourited(nextPlan.interpretedRequest.destination) : false)
      void trackEvent('search_performed', { resultCount: nextPlan.sources.length, searchMode: 'travel' })
      void trackEvent('itinerary_generated', { generationMode: nextPlan.generationMode, searchBackend: nextPlan.searchBackend, dayCount: nextPlan.days.length })
      if (nextPlan.interpretedRequest.destination) void trackEvent('destination_viewed', { destinationId: nextPlan.interpretedRequest.destination })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The planner is temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }

  function savePlan() {
    if (!plan) return
    saveAiTrip(plan)
    setSaved(true)
    void trackEvent('itinerary_saved', { saveMode: 'demo-local' })
  }

  function toggleFavourite() {
    const destinationId = plan?.interpretedRequest.destination
    if (!destinationId) return
    const nextValue = !favourited
    setFavourited(nextValue)
    setDestinationFavourited(destinationId, nextValue)
    void trackEvent('destination_favourited', { destinationId, favourited: nextValue })
  }

  return (
    <div className="section-mint">
      <div className="ai-planner-page">
        <section className="planner-form" aria-labelledby="ai-planner-title">
          <div className="eyebrow">Conversational planner</div>
          <h1 id="ai-planner-title">Describe the Jamaica trip you want</h1>
          <p className="lede">We retrieve matching sample content before generating the itinerary. The model does not supply travel facts.</p>
          <div className="example-prompts" aria-label="Example requests">
            {examples.map((example) => <button type="button" key={example} onClick={() => setRequest(example)}>{example}</button>)}
          </div>
          <div className="form-group">
            <label htmlFor="travel-request">Travel request</label>
            <textarea id="travel-request" value={request} maxLength={500} onChange={(event) => setRequest(event.target.value)} />
            <div className="helper">{request.length}/500 characters · Do not include sensitive information.</div>
          </div>
          {error ? <div className="error-summary" role="alert">{error}</div> : null}
          <button className="button button-primary" type="button" onClick={() => void submit()} disabled={loading}>
            {loading ? 'Building itinerary…' : 'Build itinerary'}
          </button>
        </section>

        {plan ? <ItineraryResult plan={plan} saved={saved} favourited={favourited} savePlan={savePlan} toggleFavourite={toggleFavourite} /> : null}
      </div>
    </div>
  )
}

type ResultProps = {
  plan: AiPlannerResponse
  saved: boolean
  favourited: boolean
  savePlan: () => void
  toggleFavourite: () => void
}

function ItineraryResult({ plan, saved, favourited, savePlan, toggleFavourite }: ResultProps) {
  return (
    <section className="ai-itinerary" aria-labelledby="itinerary-title" aria-live="polite">
      <div className="plan-header">
        <div><div className="eyebrow">{plan.duration} · {plan.searchBackend} retrieval</div><h2 id="itinerary-title">{plan.tripName}</h2></div>
        <div className="button-row">
          {plan.interpretedRequest.destination ? <button className="button button-secondary" type="button" onClick={toggleFavourite}>{favourited ? 'Favourited' : 'Favourite destination'}</button> : null}
          <button className="button button-gold" type="button" onClick={savePlan}>{saved ? 'Saved on this device' : 'Save itinerary'}</button>
        </div>
      </div>
      <p className="lede">{plan.summary}</p>
      {plan.generationMode === 'fallback' ? <p className="notice">The LLM is disabled or unavailable, so this safe deterministic itinerary was built from retrieved records.</p> : null}
      <ol className="activity-timeline">
        {plan.days.map((day) => <li key={day.day}>
          <div className="day-number">Day {day.day}</div><div><h3>{day.title}</h3>
          <div className="timeline-items">{day.activities.map((activity) => <article key={`${day.day}-${activity.id}`} className="destination-card"><div className="eyebrow">{activity.type} · {activity.priceLevel}</div><h3>{activity.name}</h3><p>{activity.description}</p><p><strong>Sample rating:</strong> {activity.rating.toFixed(1)}/5</p></article>)}</div>
          </div>
        </li>)}
      </ol>
      <aside className="budget-summary"><h3>Budget summary</h3><p>{plan.estimatedBudget}</p></aside>
      {plan.warnings.map((warning) => <p className="trust-note" key={warning}>{warning}</p>)}
    </section>
  )
}
