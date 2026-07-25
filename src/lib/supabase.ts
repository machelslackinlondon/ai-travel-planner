import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { TripPlan } from './schemas'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabase: SupabaseClient | null = url && publishableKey ? createClient(url, publishableKey, {
  auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
}) : null
export const isSupabaseConfigured = Boolean(supabase)

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
