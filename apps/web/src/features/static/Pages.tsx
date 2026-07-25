import Image from 'next/image'
import Link from 'next/link'
import { ContentCard } from '../../components/ContentCard'
import { DevEventViewer } from '../../components/DevEventViewer'
import { contentItems } from '../../lib/content'

export function HomePage() {
  const destinations = contentItems.filter((item) => item.type === 'destination')
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">Plan your trip · Pilot</div>
          <h1>Build your Jamaica trip</h1>
          <p className="lede">Tell us what feels right for your visit. We will turn your choices into a simple plan using approved Jamaica travel content.</p>
          <div className="button-row">
            <Link className="button button-primary" href="/plan">Plan my trip</Link>
            <Link className="button button-secondary" href="/help">See how it works</Link>
          </div>
          <p className="trust-note">No account is needed to start. Transport to Jamaica is not included.</p>
        </div>
        <div className="hero-media">
          <Image src="/images/sample-montego-bay.svg" alt="Labelled sample destination illustration with green hills and water" width={1200} height={675} priority />
          <span className="image-label">Sample destination image</span>
        </div>
      </section>

      <section className="page">
        <div className="eyebrow">A useful outline in minutes</div>
        <h2>From preferences to a plan you control</h2>
        <div className="intro-grid">
          <article className="intro-card"><div className="number">01</div><h3>Share the essentials</h3><p>Choose your trip shape, priorities, pace and on-island spend level.</p></article>
          <article className="intro-card"><div className="number">02</div><h3>See grounded ideas</h3><p>Every suggestion comes from the small approved-content catalogue.</p></article>
          <article className="intro-card"><div className="number">03</div><h3>Edit before saving</h3><p>Replace, remove and reorder ideas, then keep the plan on this device.</p></article>
        </div>
      </section>

      <section className="section-mint">
        <div className="page">
          <div className="eyebrow">Resort areas</div>
          <h2>Start with a place, or let your priorities guide you</h2>
          <div className="card-grid">
            {destinations.map((item) => <ContentCard key={item.id} item={item} />)}
          </div>
        </div>
      </section>
    </>
  )
}

export function HelpPage() {
  return (
    <div className="narrow-page legal-copy">
      <div className="eyebrow">Planner help</div>
      <h1>How the pilot works</h1>
      <h2>How are suggestions chosen?</h2>
      <p>The planner first scores only published, approved records against resort area, group, interests, pace and spend level. When enabled, AI can organise that shortlist and write short reasons. It cannot introduce another place or provider.</p>
      <h2>Are prices and availability live?</h2>
      <p>No. Amounts marked estimated are planning assumptions from the content record, not quotes. Availability is always controlled by the provider. JMD and USD totals stay separate.</p>
      <h2>What does “check with provider” mean?</h2>
      <p>The catalogue does not contain a reliable amount. Confirm price, opening details, accessibility, availability and terms before making arrangements.</p>
      <h2>Do I need an account to save?</h2>
      <p>No. Connected mode stores the plan in MongoDB under a random identifier kept by this browser. Demo mode stores only a clearly labelled local copy.</p>
      <h2>How do I delete my trip?</h2>
      <p>Open My trip or the saved plan and use Delete trip. The API scopes deletion to this browser’s random device identifier.</p>
      <h2>What information should I avoid entering?</h2>
      <p>Do not enter passport, health, payment, medical, precise home-address or other sensitive information. The optional note is temporary planning context only.</p>
      <h2>What happens when I visit a provider’s site?</h2>
      <p>A confirmation names the provider and explains what you are leaving to view. Its live availability, final price, payment and cancellation terms apply. The pilot never claims a reservation is complete.</p>
      <DevEventViewer />
    </div>
  )
}

export function PrivacyPage() {
  return (
    <div className="narrow-page legal-copy">
      <div className="eyebrow">Pilot privacy notice</div>
      <h1>Privacy</h1>
      <p>You can build a plan without an account. Before sign-in, the current draft stays in this browser’s session storage. In demo mode, saved copies use local browser storage.</p>
      <h2>What connected mode stores</h2>
      <p>If you choose to save, MongoDB stores a pseudonymous device identifier, structured brief and validated itinerary. A retention period and production authentication design must be approved before a live pilot accepts real visitors.</p>
      <h2>Measurement</h2>
      <p>The pilot records only five coarse journey events with a pseudonymous session identifier. Events exclude email, names, raw notes, accessibility choices, exact dates, party details and itinerary contents.</p>
      <h2>Your control</h2>
      <p>You can delete a saved trip. Closing the browser session clears the anonymous current draft. Contact the pilot owner before launch for account-level access or deletion requests.</p>
    </div>
  )
}

export function AccessibilityPage() {
  return (
    <div className="narrow-page legal-copy">
      <div className="eyebrow">Accessibility statement</div>
      <h1>Using this planner</h1>
      <p>This pilot is designed for keyboard use, visible focus, large touch targets, reduced motion, semantic headings, labelled controls and a single-column layout at small screen sizes.</p>
      <h2>Practical arrangements</h2>
      <p>Structured accessibility preferences help prioritise information where it exists, but sample records do not confirm facilities. Always verify arrangements directly with the provider.</p>
      <h2>Report a problem</h2>
      <p>Before the public pilot, replace this paragraph with the Jamaica Tourist Board’s approved accessibility contact and response time.</p>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="narrow-page">
      <div className="eyebrow">Page not found</div>
      <h1>Let us get you back to planning</h1>
      <p>The page you requested is not part of this small pilot.</p>
      <Link className="button button-primary" href="/">Return home</Link>
    </div>
  )
}
