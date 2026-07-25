import { TripPage } from '../../../features/planner/TripPage'

export default async function Trip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <TripPage id={id} />
}
