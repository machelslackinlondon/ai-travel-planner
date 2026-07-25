import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="wordmark" aria-label="Visit Jamaica trip planner home">
            <span>Visit Jamaica</span>
            <small>Trip planner pilot</small>
          </NavLink>
          <nav aria-label="Primary navigation">
            <NavLink to="/help">How it works</NavLink>
            <NavLink to="/saved">My trip</NavLink>
            <NavLink className="button button-gold header-action" to="/plan">Plan my trip</NavLink>
          </nav>
        </div>
      </header>
      <div className="sample-banner" role="note">Prototype · All places, providers, prices and images are clearly labelled sample content.</div>
      <main id="main-content"><Outlet /></main>
      <footer className="site-footer">
        <div>
          <p><strong>Visit Jamaica trip planner pilot</strong></p>
          <p>Suggestions are planning ideas, not live availability or completed reservations.</p>
        </div>
        <nav aria-label="Footer navigation">
          <NavLink to="/help">Help</NavLink>
          <NavLink to="/privacy">Privacy</NavLink>
          <NavLink to="/accessibility">Accessibility</NavLink>
        </nav>
      </footer>
    </div>
  )
}
