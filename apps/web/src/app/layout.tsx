import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import '../styles/global.css'

export const metadata: Metadata = {
  title: {
    default: 'Visit Jamaica Trip Planner',
    template: '%s | Visit Jamaica Trip Planner',
  },
  description: 'Build an editable Jamaica trip outline from approved sample travel content.',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <div className="app-shell">
          <a className="skip-link" href="#main-content">Skip to main content</a>
          <header className="site-header">
            <div className="header-inner">
              <Link href="/" className="wordmark" aria-label="Visit Jamaica trip planner home">
                <span>Visit Jamaica</span>
                <small>Trip planner pilot</small>
              </Link>
              <nav aria-label="Primary navigation">
                <Link href="/help">How it works</Link>
                <Link href="/ai-planner">AI planner</Link>
                <Link href="/saved">My trip</Link>
                <Link className="button button-gold header-action" href="/plan">Plan my trip</Link>
              </nav>
            </div>
          </header>
          <div className="sample-banner" role="note">Prototype · All places, providers, prices and images are clearly labelled sample content.</div>
          <main id="main-content">{children}</main>
          <footer className="site-footer">
            <div>
              <p><strong>Visit Jamaica trip planner pilot</strong></p>
              <p>Suggestions are planning ideas, not live availability or completed reservations.</p>
            </div>
            <nav aria-label="Footer navigation">
              <Link href="/help">Help</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/accessibility">Accessibility</Link>
            </nav>
          </footer>
        </div>
      </body>
    </html>
  )
}
