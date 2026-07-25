'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { trackEvent } from '../../lib/events'
import { getDraft } from '../../lib/storage'
import { getCurrentUser, isSupabaseConfigured, saveConnectedTrip } from '../../lib/supabase'

export function AuthCallbackPage() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'no-draft' | 'error'>('checking')
  const router = useRouter()
  const draft = getDraft()

  useEffect(() => {
    async function check() {
      if (!isSupabaseConfigured) { setStatus('error'); return }
      const user = await getCurrentUser()
      if (!user) { setStatus('error'); return }
      setStatus(draft ? 'ready' : 'no-draft')
    }
    void check()
  }, [draft])

  async function associateDraft() {
    if (!draft) return
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('No signed-in user')
      await saveConnectedTrip(draft, user)
      await trackEvent('plan_saved', { saveMode: 'connected' })
      router.push(`/trip/${draft.id}`)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="narrow-page">
      {status === 'checking' && <><h1>Completing sign-in</h1><p role="status">Checking your secure link…</p></>}
      {status === 'ready' && <><div className="eyebrow">Welcome back</div><h1>Save the trip on this device to your account?</h1><p>We will never merge or overwrite a saved plan silently.</p><div className="button-row"><button className="button button-primary" type="button" onClick={() => void associateDraft()}>Save this trip</button><Link className="button button-secondary" href="/saved">Not now</Link></div></>}
      {status === 'no-draft' && <><div className="eyebrow">Welcome back</div><h1>You are signed in</h1><p>There is no unsaved draft on this device.</p><Link className="button button-primary" href="/saved">View saved trips</Link></>}
      {status === 'error' && <><h1>We could not complete sign-in</h1><p>The link may have expired or connected mode may not be configured. Your draft remains on this device.</p><Link className="button button-primary" href={draft ? `/trip/${draft.id}` : '/plan'}>{draft ? 'Return to my plan' : 'Build a plan'}</Link></>}
    </div>
  )
}
