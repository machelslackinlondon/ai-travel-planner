import type { Metadata } from 'next'
import { TripCustomiser } from '../../features/ai-planner/TripCustomiser'

export const metadata: Metadata = {
  title: 'Customise your trip',
  description: 'Revise an existing Jamaica itinerary using grounded sample content.',
}

export default async function AiPlannerPage({ searchParams }: { searchParams: Promise<{ tripId?: string }> }) {
  const { tripId } = await searchParams
  return <TripCustomiser tripId={tripId} />
}
