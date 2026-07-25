import type { Metadata } from 'next'
import { ConversationalPlanner } from '../../features/ai-planner/ConversationalPlanner'

export const metadata: Metadata = {
  title: 'AI travel planner',
  description: 'Describe a Jamaica trip and receive a repository-grounded sample itinerary.',
}

export default function AiPlannerPage() {
  return <ConversationalPlanner />
}
