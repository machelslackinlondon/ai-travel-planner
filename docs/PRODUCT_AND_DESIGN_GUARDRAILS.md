# Product and design guardrails

## The one job of the MVP

Help a leisure visitor turn a few preferences into a clear, editable Jamaica trip plan and continue to trusted accommodation or experience providers.

The product is an extension of VisitJamaica.com, not a separate travel brand or a general Caribbean marketplace.

## First target user

An English-speaking leisure visitor who is interested in Jamaica, is comfortable planning online, and needs help choosing an area, accommodation and experiences. The pilot should favour visitors planning a three-to-seven-night trip to one or two resort areas.

## The single problem being tested

Visitors have inspiration and choices spread across many pages and providers. They need a quicker way to turn their interests, dates, group and budget into a practical shortlist with clear next steps.

## Included in the MVP

- A short, guided trip brief.
- AI-assisted suggestions grounded in approved Visit Jamaica content.
- A day-by-day outline that the visitor can edit.
- Shortlists of resort areas, accommodation and experiences.
- Plain-language price notes: confirmed, estimated or check with provider.
- Saved trips through passwordless email sign-in.
- Clearly labelled hand-offs to approved external providers.
- A mobile-first experience with basic consented analytics.

## Explicitly excluded

- Flight search, booking, price alerts, status updates or disruption support.
- Taking payments or completing accommodation or experience bookings inside the MVP.
- A new content management system.
- Live inventory aggregation across many suppliers.
- A native mobile application.
- Loyalty points, social feeds, reviews, chat between travellers or complex collaboration.
- Automatic scraping or republishing of VisitJamaica.com.
- Claims that the AI has confirmed live price or availability.

## Information architecture

Mirror the language visitors already see on VisitJamaica.com:

- Discover Jamaica
- Resort Areas
- Experiences
- Places to Stay
- Plan Your Trip
- My Trip

Use the official site's content-first pattern: generous destination imagery, welcoming introductory copy, category cards, resort-area cards and clear routes into things to do, places to stay, food and culture. The planner should feel like a useful new part of the existing site rather than a separate application bolted onto it.

## Visual foundation

Use these project tokens as a maintainable starting point modelled on the current VisitJamaica.com interface. The official site currently declares Montserrat for body/display text, a bright green (`#228913`), gold (`#ffb81d`), black, white and restrained greys. The pilot uses a geometric system-font stack and a darker green only where contrast requires it; it does not copy or hotlink the site's hosted fonts. These tokens are implementation guidance, not a replacement for the official brand specification.

```css
:root {
  --vj-green-900: #155e0d;
  --vj-green-600: #228913;
  --vj-gold-500: #ffb81d;
  --vj-cream-100: #fff8e8;
  --vj-mint-100: #f3fff1;
  --vj-ink-900: #171717;
  --vj-white: #ffffff;
  --vj-grey-100: #f2f2f2;
  --vj-grey-600: #666666;
  --vj-danger-600: #b42318;
  --radius-card: 2px;
  --shadow-card: 0 14px 36px rgb(0 0 0 / 9%);
}
```

- Use white navigation, black editorial headings and a black footer.
- Use bright green for section labels, progress and selected states.
- Use gold sparingly for the main navigation action and emphasis.
- Use white and light grey for spacious editorial sections and cards.
- Do not use colour as the only way to communicate status.
- Use a system font stack so there is no font-service dependency.
- Use one-column layouts on small screens and visible focus states everywhere.

The final production build must use official brand assets, colour values, typography and photography approved by the Jamaica Tourist Board. Do not include or redraw the official logo unless the approved asset has been supplied.

## Reusable interface patterns

- Header: Visit Jamaica identity area, compact site navigation and a prominent “Plan my trip” action.
- Hero: one strong approved Jamaica image, a short welcome line and one primary action.
- Category cards: image, name, one-sentence description and a clear action.
- Planner steps: one decision per screen, visible progress, Back and Continue controls.
- Recommendation cards: reason for recommendation, location, price status, source and Save action.
- My Trip: day-by-day list, estimated on-island total, assumptions, edit controls and partner hand-offs.
- Trust panel: “How suggestions are made”, content date and link to the official source.

## AI behaviour

The AI is an organiser, not the source of truth.

- Retrieve only from approved content records.
- Return structured data that the application validates before display.
- State why each suggestion fits the trip brief.
- Do not invent providers, prices, availability, opening hours or safety guidance.
- Send visitors to the official source for time-sensitive details.
- If evidence is missing, say “Check with provider” and leave the detail open.
- Do not keep raw free-text prompts longer than necessary to make the response.
- Provide the same core journey through a rule-based fallback when AI is unavailable.

## Pricing and trust

Early cost clarity is a central product promise. Separate each total into:

- known prices supplied by an approved source;
- estimates with an explanation of the assumption;
- items not included;
- charges that must be confirmed with the provider.

Show the provider's cancellation and change terms before a user leaves the platform where those terms are available. Never describe an estimated price as a quote.

Do not call a currency-conversion service in the MVP. Keep JMD and USD subtotals separate, show the source currency, and let the user plan by value, mid-range or premium spend level. This is clearer than presenting a stale converted total.

## Content record minimum

Every destination, stay, experience or event should have:

- a unique ID and content type;
- a title and short summary;
- resort area and relevant interests;
- an official source URL;
- date last checked;
- price status and optional price range;
- accessibility notes when known;
- approved local image path and alt text;
- published or hidden status.

## Scope decision rule

Before adding anything, ask: “Does this help a visitor create or act on a useful Jamaica plan?” If the answer is not clearly yes, leave it out of the MVP.

## Reference

The information architecture and content patterns above are modelled on [VisitJamaica.com](https://www.visitjamaica.com/), which currently presents Discover Jamaica, Resort Areas, Experiences, Places to Stay and Plan Your Trip as primary visitor routes. Check the live site and official design guidance again before launch.
