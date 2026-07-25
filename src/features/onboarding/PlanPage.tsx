import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generatePlan } from '../../lib/api'
import { trackEvent, tripLengthBand } from '../../lib/events'
import { tripBriefSchema, type TripBrief } from '../../lib/schemas'
import { saveDraft } from '../../lib/storage'

const interestOptions = [
  ['beach', 'Beaches and water'], ['food', 'Jamaican food'], ['culture', 'Music and culture'],
  ['nature', 'Nature and adventure'], ['family', 'Family time'], ['relaxation', 'Rest and wellness'],
] as const

const accessibilityOptions = [
  ['step-free', 'Step-free routes'], ['mobility-support', 'Mobility support'], ['visual-support', 'Visual support'],
  ['hearing-support', 'Hearing support'], ['quiet-space', 'Quieter spaces'],
] as const

const initialBrief: TripBrief = {
  timingMode: 'nights', nights: 5, adults: 2, children: 0, resortArea: 'help-me-choose',
  interests: [], pace: 'balanced', spendLevel: 'flexible', accommodationStyle: 'no-preference', accessibility: [], note: '',
}

export function PlanPage() {
  const [step, setStep] = useState(1)
  const [brief, setBrief] = useState<TripBrief>(initialBrief)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [slow, setSlow] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { void trackEvent('planner_started', { entryPage: 'planner' }) }, [])
  useEffect(() => {
    if (!loading) return
    const timer = window.setTimeout(() => setSlow(true), 8_000)
    return () => window.clearTimeout(timer)
  }, [loading])

  function update<K extends keyof TripBrief>(key: K, value: TripBrief[K]) {
    setBrief((current) => ({ ...current, [key]: value }))
  }

  function toggleInterest(value: TripBrief['interests'][number]) {
    setErrors([])
    setBrief((current) => {
      if (current.interests.includes(value)) return { ...current, interests: current.interests.filter((item) => item !== value) }
      if (current.interests.length >= 3) {
        setErrors(['Choose no more than three interests. Remove one before adding another.'])
        return current
      }
      return { ...current, interests: [...current.interests, value] }
    })
  }

  function calculateDateNights() {
    if (!brief.startDate || !brief.endDate) return brief.nights
    return Math.ceil((Date.parse(`${brief.endDate}T00:00:00Z`) - Date.parse(`${brief.startDate}T00:00:00Z`)) / 86_400_000)
  }

  function validateStep() {
    const nextErrors: string[] = []
    if (step === 1) {
      const nights = brief.timingMode === 'dates' ? calculateDateNights() : brief.nights
      if (brief.timingMode === 'dates' && (!brief.startDate || !brief.endDate)) nextErrors.push('Choose approximate start and end dates.')
      if (!Number.isInteger(nights) || nights < 1 || nights > 21) nextErrors.push('Choose a trip length from 1 to 21 nights.')
      if (brief.adults < 1 || brief.adults > 12) nextErrors.push('Choose between 1 and 12 adults.')
      if (brief.children < 0 || brief.children > 12) nextErrors.push('Choose between 0 and 12 children.')
      if (!nextErrors.length && brief.timingMode === 'dates') update('nights', nights)
    }
    if (step === 2 && brief.interests.length === 0) nextErrors.push('Choose at least one interest to shape your plan.')
    setErrors(nextErrors)
    return nextErrors.length === 0
  }

  function nextStep() {
    if (!validateStep()) return
    setStep((current) => Math.min(4, current + 1))
    setErrors([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit() {
    setErrors([])
    const parsed = tripBriefSchema.safeParse({ ...brief, nights: brief.timingMode === 'dates' ? calculateDateNights() : brief.nights })
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message))
      return
    }
    setLoading(true)
    void trackEvent('brief_completed', {
      resortArea: parsed.data.resortArea,
      tripLengthBand: tripLengthBand(parsed.data.nights),
      interestCount: parsed.data.interests.length,
      pace: parsed.data.pace,
    })
    const plan = await generatePlan(parsed.data)
    saveDraft(plan)
    void trackEvent('plan_generated', { generationMode: plan.generationMode, itemCount: plan.recommendations.length })
    navigate(`/trip/${plan.id}`)
  }

  if (loading) return (
    <div className="planner-shell loading-panel" aria-live="polite">
      <div>
        <div className="eyebrow">Matching approved sample content</div>
        <h1>Putting your Jamaica plan together</h1>
        <div className="loading-pulse" aria-hidden="true" />
        <p>We are matching your choices with approved places and experiences.</p>
        {slow && <p>Your choices are safe on this device. This is taking a little longer.</p>}
      </div>
    </div>
  )

  return (
    <div className="section-mint">
      <div className="planner-shell">
        <div className="progress-wrap" aria-label={`Step ${step} of 4`}>
          <div className="progress-label"><span>Step {step} of 4</span><span>{step * 25}%</span></div>
          <div className="progress-track"><span style={{ width: `${step * 25}%` }} /></div>
        </div>
        <form className="planner-form" onSubmit={(event) => event.preventDefault()}>
          {errors.length > 0 && <div className="error-summary" role="alert"><strong>Check your answers:</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}

          {step === 1 && <StepOne brief={brief} update={update} />}
          {step === 2 && (
            <>
              <div className="eyebrow">Your priorities</div><h1>What would make this trip feel special?</h1>
              <p>Choose up to three. We will use your priorities to shape the plan.</p>
              <fieldset className="form-group"><legend>Interests (choose 1–3)</legend><div className="choice-grid">
                {interestOptions.map(([value, label]) => <label className="choice" key={value}><input type="checkbox" checked={brief.interests.includes(value)} onChange={() => toggleInterest(value)} /><span>{label}</span></label>)}
              </div></fieldset>
            </>
          )}
          {step === 3 && <StepThree brief={brief} update={update} />}
          {step === 4 && (
            <>
              <div className="eyebrow">Stay and practical needs</div><h1>A few final preferences</h1>
              <fieldset className="form-group"><legend>Accommodation style</legend><div className="choice-grid">
                {([['hotel-resort', 'Hotel or resort'], ['villa-apartment', 'Villa or apartment'], ['guest-house', 'Guest house'], ['no-preference', 'No preference']] as const).map(([value, label]) => <label className="choice" key={value}><input type="radio" name="style" checked={brief.accommodationStyle === value} onChange={() => update('accommodationStyle', value)} /><span>{label}</span></label>)}
              </div></fieldset>
              <fieldset className="form-group"><legend>Accessibility preferences <span className="optional">(optional)</span></legend><p className="helper">We will use this to filter suggestions where information is available. Always confirm arrangements directly with the provider.</p><div className="choice-grid">
                {accessibilityOptions.map(([value, label]) => <label className="choice" key={value}><input type="checkbox" checked={brief.accessibility.includes(value)} onChange={() => update('accessibility', brief.accessibility.includes(value) ? brief.accessibility.filter((item) => item !== value) : [...brief.accessibility, value])} /><span>{label}</span></label>)}
              </div></fieldset>
              <div className="form-group"><label htmlFor="note">Anything else? <span className="optional">(optional)</span></label><p className="helper">Do not include passport, payment, medical or other sensitive information.</p><textarea id="note" maxLength={300} value={brief.note} onChange={(event) => update('note', event.target.value)} /><div className="helper">{brief.note.length}/300 characters</div></div>
            </>
          )}

          <div className="button-row">
            {step > 1 && <button className="button button-secondary" type="button" onClick={() => { setStep((current) => current - 1); setErrors([]) }}>Back</button>}
            {step < 4
              ? <button className="button button-primary" type="button" onClick={nextStep}>Continue</button>
              : <button className="button button-primary" type="button" onClick={() => void submit()}>Build my plan</button>}
          </div>
        </form>
      </div>
    </div>
  )
}

type StepProps = { brief: TripBrief; update: <K extends keyof TripBrief>(key: K, value: TripBrief[K]) => void }

function StepOne({ brief, update }: StepProps) {
  return (
    <>
      <div className="eyebrow">Trip shape</div><h1>First, the shape of your trip</h1><p>Approximate details are fine. You can change them later.</p>
      <fieldset className="form-group"><legend>How would you like to describe the timing?</legend><div className="choice-grid">
        <label className="choice"><input type="radio" name="timing" checked={brief.timingMode === 'nights'} onChange={() => update('timingMode', 'nights')} /><span>Number of nights</span></label>
        <label className="choice"><input type="radio" name="timing" checked={brief.timingMode === 'dates'} onChange={() => update('timingMode', 'dates')} /><span>Approximate dates</span></label>
      </div></fieldset>
      {brief.timingMode === 'nights'
        ? <div className="form-group"><label htmlFor="nights">Number of nights</label><input id="nights" type="number" min={1} max={21} value={brief.nights} onChange={(event) => update('nights', Number(event.target.value))} /></div>
        : <div className="field-row"><div className="form-group"><label htmlFor="start-date">Approximate start</label><input id="start-date" type="date" value={brief.startDate ?? ''} onChange={(event) => update('startDate', event.target.value)} /></div><div className="form-group"><label htmlFor="end-date">Approximate end</label><input id="end-date" type="date" value={brief.endDate ?? ''} onChange={(event) => update('endDate', event.target.value)} /></div></div>}
      <div className="field-row"><div className="form-group"><label htmlFor="adults">Adults</label><input id="adults" type="number" min={1} max={12} value={brief.adults} onChange={(event) => update('adults', Number(event.target.value))} /></div><div className="form-group"><label htmlFor="children">Children</label><input id="children" type="number" min={0} max={12} value={brief.children} onChange={(event) => update('children', Number(event.target.value))} /></div></div>
      <fieldset className="form-group"><legend>Preferred resort area</legend><div className="choice-grid">
        {([['montego-bay', 'Montego Bay'], ['negril', 'Negril'], ['help-me-choose', 'Help me choose']] as const).map(([value, label]) => <label className="choice" key={value}><input type="radio" name="area" checked={brief.resortArea === value} onChange={() => update('resortArea', value)} /><span>{label}</span></label>)}
      </div></fieldset>
    </>
  )
}

function StepThree({ brief, update }: StepProps) {
  return (
    <>
      <div className="eyebrow">Pace and spend</div><h1>Set the pace</h1>
      <fieldset className="form-group"><legend>Preferred pace</legend><div className="choice-grid">
        {([['relaxed', 'Relaxed', 'Plenty of open time'], ['balanced', 'Balanced', 'One or two plans each day'], ['active', 'Active', 'Make the most of each day']] as const).map(([value, label, detail]) => <label className="choice" key={value}><input type="radio" name="pace" checked={brief.pace === value} onChange={() => update('pace', value)} /><span><strong>{label}</strong><small>{detail}</small></span></label>)}
      </div></fieldset>
      <fieldset className="form-group"><legend>Preferred on-island spend level</legend><div className="choice-grid">
        {([['value', 'Value'], ['mid-range', 'Mid-range'], ['premium', 'Premium'], ['flexible', 'Flexible']] as const).map(([value, label]) => <label className="choice" key={value}><input type="radio" name="spend" checked={brief.spendLevel === value} onChange={() => update('spendLevel', value)} /><span>{label}</span></label>)}
      </div></fieldset>
      <p className="notice">This covers accommodation and on-island experiences. It does not include transport to Jamaica. Prices shown later may be confirmed, estimated or require a provider check.</p>
    </>
  )
}
