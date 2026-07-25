import { TripPage } from '../../../features/planner/TripPage'

export default async function Trip({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ customised?: string }> }) {
  const { id } = await params
  const { customised } = await searchParams
  return <TripPage id={id} customisationApplied={customised === 'applied'} />
}
