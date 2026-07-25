'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { areaLabel } from '../../lib/content'
import { deleteDemoTrip, getDemoSavedTrips } from '../../lib/storage'
import { deleteRemoteTrip, listRemoteTrips } from '../../lib/remote-trips'
import type { TripPlan } from '../../lib/schemas'

export function SavedPage() {
  const [trips, setTrips] = useState<TripPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const remoteTrips = await listRemoteTrips()
        const merged = new Map([...getDemoSavedTrips(), ...remoteTrips].map((trip) => [trip.id, trip]))
        setTrips([...merged.values()])
      } catch {
        setTrips(getDemoSavedTrips())
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function remove(id: string) {
    setError('')
    try {
      await deleteRemoteTrip(id)
    } catch {
      setError('The browser copy was removed, but the API could not confirm remote deletion.')
    }
    deleteDemoTrip(id)
    setTrips((current) => current.filter((trip) => trip.id !== id))
  }

  return (
    <div className="narrow-page">
      <div className="eyebrow">My trip</div><h1>Saved trips</h1>
      {!loading && <div className="notice"><strong>Saved to this device.</strong><p>Connected mode stores plans in MongoDB under a random device identifier. Clearing browser storage or changing device will remove access.</p></div>}
      {error && <p className="field-error" role="alert">{error}</p>}
      {loading ? <p role="status">Loading saved trips…</p> : trips.length ? <div className="saved-list">
        {trips.map((trip) => <article className="saved-row" key={trip.id}><div><div className="eyebrow">{trip.generationMode === 'ai' ? 'AI-organised' : 'Preference-matched'}</div><h2>{areaLabel(trip.selectedArea)} · {trip.brief.nights} nights</h2><p>{trip.summary}</p></div><div className="button-row"><Link className="button button-primary" href={`/trip/${trip.id}`}>Open trip</Link><button className="button button-danger" type="button" onClick={() => void remove(trip.id)}>Delete trip</button></div></article>)}
      </div> : <div><h2>Your next Jamaica idea starts here</h2><p>Build a plan, then save it here when it feels right.</p><Link className="button button-primary" href="/plan">Plan a trip</Link></div>}
    </div>
  )
}
