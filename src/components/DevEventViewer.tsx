'use client'

import { useEffect, useState } from 'react'

export function DevEventViewer() {
  const [events, setEvents] = useState<unknown[]>([])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    fetch('/api/dev/events')
      .then(async (response) => response.ok ? await response.json() as unknown[] : [])
      .then(setEvents)
      .catch(() => setEvents([]))
  }, [])

  if (process.env.NODE_ENV !== 'development') return null

  return <section className="dev-events" aria-label="Development event viewer"><strong>Development-only event viewer</strong><pre>{JSON.stringify(events, null, 2)}</pre></section>
}
