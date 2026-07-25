import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { TripPlan } from './schemas'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && publishableKey)
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url, publishableKey, {
  auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
}) : null

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function saveConnectedTrip(plan: TripPlan, user: User) {
  if (!supabase) throw new Error('Saving is not connected')
  const { error } = await supabase.from('trips').upsert({
    id: plan.id,
    owner_id: user.id,
    name: `${plan.selectedArea === 'montego-bay' ? 'Montego Bay' : 'Negril'} trip`,
    brief: plan.brief,
    itinerary: plan,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

export async function deleteConnectedTrip(id: string) {
  if (!supabase) throw new Error('Saving is not connected')
  const { error } = await supabase.from('trips').delete().eq('id', id)
  if (error) throw error
}
