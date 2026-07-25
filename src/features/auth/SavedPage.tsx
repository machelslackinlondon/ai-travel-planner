import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { areaLabel } from '../../lib/content'
import { deleteDemoTrip, getDemoSavedTrips } from '../../lib/storage'
import { deleteConnectedTrip, getCurrentUser, isSupabaseConfigured, supabase } from '../../lib/supabase'
import { tripPlanSchema, type TripPlan } from '../../lib/schemas'

export function SavedPage() {
  const [trips, setTrips] = useState<TripPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const user = await getCurrentUser()
        setSignedIn(Boolean(user))
        if (isSupabaseConfigured && user && supabase) {
          const { data, error: queryError } = await supabase.from('trips').select('itinerary').order('updated_at', { ascending: false })
          if (queryError) throw queryError
          setTrips((data ?? []).map((row) => tripPlanSchema.parse(row.itinerary)))
        } else {
          setTrips(getDemoSavedTrips())
        }
      } catch {
        setError('We could not load saved trips just now.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function remove(id: string) {
    try {
      if (isSupabaseConfigured && signedIn) await deleteConnectedTrip(id)
      else deleteDemoTrip(id)
      setTrips((current) => current.filter((trip) => trip.id !== id))
    } catch {
      setError('We could not delete that trip just now.')
    }
  }

  return (
    <div className="narrow-page">
      <div className="eyebrow">My trip</div><h1>Saved trips</h1>
      {isSupabaseConfigured && !signedIn && !loading && <div className="notice"><strong>You are not signed in.</strong><p>Build a plan and choose Save this trip to request a secure email link. We ask only after the plan is useful.</p></div>}
      {loading ? <p role="status">Loading saved trips…</p> : error ? <p className="field-error" role="alert">{error}</p> : trips.length ? <div className="saved-list">
        {trips.map((trip) => <article className="saved-row" key={trip.id}><div><div className="eyebrow">{trip.generationMode === 'ai' ? 'AI-organised' : 'Preference-matched'}</div><h2>{areaLabel(trip.selectedArea)} · {trip.brief.nights} nights</h2><p>{trip.summary}</p></div><div className="button-row"><Link className="button button-primary" to={`/trip/${trip.id}`}>Open trip</Link><button className="button button-danger" type="button" onClick={() => void remove(trip.id)}>Delete trip</button></div></article>)}
      </div> : <div><h2>Your next Jamaica idea starts here</h2><p>Build a plan, then save it here when it feels right.</p><Link className="button button-primary" to="/plan">Plan a trip</Link></div>}
    </div>
  )
}
