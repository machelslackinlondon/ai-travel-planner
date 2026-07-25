import { Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthCallbackPage } from './features/auth/AuthCallbackPage'
import { SavedPage } from './features/auth/SavedPage'
import { PlanPage } from './features/onboarding/PlanPage'
import { TripPage } from './features/planner/TripPage'
import { AccessibilityPage, HelpPage, HomePage, NotFoundPage, PrivacyPage } from './features/static/Pages'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="trip/:id" element={<TripPage />} />
        <Route path="saved" element={<SavedPage />} />
        <Route path="auth/callback" element={<AuthCallbackPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="accessibility" element={<AccessibilityPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
