# Bootstrap prompt

Copy the text below into Codex or another coding agent from the root of a new repository. Keep this documentation pack in the repository so the agent can read it.

---

## Build prompt

You are the product engineer and interaction designer for a small, testable MVP called **Visit Jamaica AI Trip Planner**.

Build a production-shaped pilot that can be demonstrated without paid services. Work through the phases below, run the relevant checks after each phase, and leave the repository in a working state. Make sensible low-risk decisions without asking for approval. If an external account or credential is unavailable, keep the feature working in demo mode and document the exact connection step.

Read these files before writing code:

- `README.md`
- `docs/PRODUCT_AND_DESIGN_GUARDRAILS.md`
- `docs/STACK_AND_COSTS.md`
- `docs/USER_ONBOARDING.md`
- `docs/MAINTENANCE_AND_RELEASES.md`
- `.env.example`

### Product hypothesis

If a visitor can turn a short description of their Jamaica trip into a trustworthy, editable shortlist and day-by-day outline, they will be more likely to save the plan and continue to an approved accommodation or experience provider.

### The one core journey

1. A visitor arrives from VisitJamaica.com and selects **Plan my trip**.
2. They enter dates or trip length, travellers, on-island budget, preferred pace, resort-area preferences and interests.
3. They receive a useful first plan made from approved Jamaica content.
4. They can replace, remove, save or reorder suggestions and see cost assumptions.
5. Only after the plan has shown value, they may use an email magic link to save it.
6. They can continue to a clearly named, approved external provider for accommodation or an experience.

### Non-negotiable boundaries

- This is an extension of VisitJamaica.com, not a new brand or general travel marketplace.
- Do not build flight search, flight booking, fare comparison, price alerts, flight status, disruption support or airline integrations.
- Do not include flight features in the roadmap, backlog, interface, data model or placeholder copy.
- Do not accept payments or claim a booking is complete.
- Do not scrape VisitJamaica.com at runtime or copy unapproved content.
- Do not invent live prices, availability, opening hours, ratings, safety claims or provider policies.
- Do not require registration before the visitor sees their first useful plan.
- Do not add chat, loyalty, reviews, social features, a new CMS, a native app or complex collaboration.
- Do not add a third hosted service unless the core journey cannot work without it.

### Technology

Use the latest stable, mutually compatible versions and commit a lockfile:

- React, TypeScript and Vite.
- The official Cloudflare Vite plugin and a Cloudflare Worker with static assets.
- Cloudflare Workers AI through a binding named `AI`.
- Supabase JavaScript client for passwordless authentication and saved trips.
- CSS variables plus small, component-level styles. Tailwind may be used only if it materially reduces code; do not add a large component framework.
- Zod or an equally small runtime schema validator for all AI responses and form payloads.
- Vitest for focused unit tests and Playwright for one end-to-end happy path.
- npm and simple scripts: `dev`, `build`, `typecheck`, `test`, `test:e2e`, `lint`, `deploy` and `seed`.

Keep the repository straightforward. Prefer clear feature folders over architectural layers. Do not create a monorepo, microservices, queues, a vector database or a custom design-system package.

### Suggested structure

Adapt the official Cloudflare React starter where needed, but keep the intent below:

```text
content/seed/             approved demo content in JSON
docs/                     product, onboarding and operating documents
public/images/            local placeholders or approved images
src/components/           shared interface components
src/features/onboarding/  trip brief steps
src/features/planner/     recommendations and trip editing
src/features/auth/        magic-link save flow
src/lib/                  schemas, content filter, Supabase client and helpers
src/styles/               tokens and global styles
src/worker/               API routes, AI adapter and event intake
supabase/migrations/      minimal schema and Row Level Security
tests/                    focused unit and end-to-end tests
```

### Pages

Build only these routes:

- `/` — Visit Jamaica-style introduction with destination categories and **Plan my trip**.
- `/plan` — the guided trip brief, one decision group at a time.
- `/trip/:id` — the generated plan, editing tools, cost notes and external hand-offs.
- `/saved` — the signed-in visitor's saved trips and an honest empty state.
- `/auth/callback` — magic-link completion.
- `/help` — how suggestions, prices, saving and external hand-offs work.
- Standard privacy, accessibility and not-found pages with concise pilot copy.

### Approved-content approach

Do not build a CMS for the pilot. Create a typed JSON content model and at least 18 clearly fictional or generic demo records spread across Montego Bay and Negril:

- six accommodation records;
- eight experience records across beach, culture, food, nature, family and relaxation;
- four destination or practical-information records.

Every record must contain:

```ts
type ContentItem = {
  id: string;
  type: 'destination' | 'stay' | 'experience' | 'information';
  title: string;
  summary: string;
  resortArea: 'montego-bay' | 'negril';
  interests: string[];
  pace: 'relaxed' | 'balanced' | 'active' | 'any';
  suitableFor: string[];
  sourceUrl: string;
  checkedAt: string;
  priceStatus: 'confirmed' | 'estimated' | 'check-with-provider';
  priceBand: 'free' | 'value' | 'mid-range' | 'premium' | 'unknown';
  priceAmount?: number;
  currency?: 'JMD' | 'USD';
  imagePath: string;
  imageAlt: string;
  published: boolean;
};
```

Demo records must be visibly marked as sample content and must not impersonate real businesses. Provide a content-validation script that fails for duplicate IDs, missing sources, invalid dates, missing alt text, non-local images or unpublished records accidentally included in the public seed. Document how the content owner replaces samples with approved records.

### Recommendation and AI design

Use a simple two-stage approach:

1. Deterministically filter and score approved content using destination, group, interests, pace and budget.
2. Give only that small shortlist and the structured trip brief to Workers AI so it can organise the choices and write short reasons.

The model must return JSON only. Validate it before use. Each recommendation must reference an existing content ID. Reject unknown IDs and unsupported values. Do not allow model output to supply prices, URLs or provider policies; those fields always come from the approved content record.

Set a short timeout and a strict output size. Do not log the visitor's raw free-text response. Include a server-side system instruction that prohibits invented facts and tells the model to return uncertainty when the content does not answer a question.

Create an `AI_ENABLED` switch. When it is false, the binding is unavailable, the quota is exhausted, output is invalid or the request fails, generate a useful plan with the deterministic scorer and fixed templates. The visitor should see a calm message such as: “We built this plan from your preferences. Personalised wording is temporarily unavailable.” The core journey must never depend on AI availability.

### Trip brief

Collect only what is needed:

- approximate dates or number of nights;
- number of adults and children;
- preferred resort area or “help me choose”;
- interests, with no more than three priorities;
- relaxed, balanced or active pace;
- preferred on-island spend level: value, mid-range, premium or flexible;
- accommodation style;
- optional accessibility needs in a structured list;
- an optional short note, capped at 300 characters.

Explain that transport to Jamaica is not part of the planner. Do not collect passport, health, payment or precise home-address data.

### Saved data

Generate one Supabase migration with the minimum tables:

- `trips`: ID, owner ID, name, structured brief, validated itinerary, created and updated timestamps.
- `product_events`: pseudonymous session ID, allowed event name, small allowlisted properties and timestamp.

Use UUIDs, foreign keys and Row Level Security. A signed-in user may read, create, update and delete only their own trips. Product events must never include names, email addresses, raw prompts, accessibility details or free text. Do not expose or require a Supabase service-role key in the app.

Before sign-in, keep the draft in session storage. After successful magic-link sign-in, ask before associating the draft with the new account. Offer a working **Delete trip** control.

### External hand-offs

Create a small provider-link adapter with an allowlist of approved domains. In demo mode, links point to safe placeholder pages and are labelled **Demo link**. A live hand-off must show:

- the provider's name;
- what the visitor is leaving Visit Jamaica to view;
- the price status and date last checked;
- a reminder that the provider's availability, payment and cancellation terms apply.

Open external links safely with `noopener` and record only the content ID, provider domain and timestamp.

### Visual and content direction

Follow `docs/PRODUCT_AND_DESIGN_GUARDRAILS.md`.

- Use the supplied green, gold, cream, pale green, white and dark-ink tokens.
- Keep the feel warm, image-led and editorial, modelled on VisitJamaica.com's destination, resort-area, experience and places-to-stay cards.
- Use a system font stack, large tap targets, short paragraphs and one clear primary action per screen.
- Use labelled placeholders until approved Jamaica Tourist Board images and brand assets are supplied. Do not hotlink images or redraw the official logo.
- Write direct, welcoming English. Avoid hype, stereotypes and claims that the AI “knows” the visitor.
- Support keyboard navigation, visible focus, reduced motion, semantic headings, form labels, error summaries and WCAG 2.2 AA colour contrast.

### Onboarding

Implement the exact first-use sequence and baseline copy in `docs/USER_ONBOARDING.md`. It must:

- preview the benefit before asking questions;
- show progress and allow Back without losing answers;
- make optional questions visibly optional;
- explain the on-island budget;
- show a plan before requesting email;
- include useful empty, loading, error and AI-fallback states;
- avoid a product tour or modal carousel.

### Measurement

Record only these consented MVP events:

- `planner_started`
- `brief_completed`
- `plan_generated`
- `plan_saved`
- `provider_handoff_opened`

Properties must be coarse and allowlisted, for example resort area, trip-length band, interest count, generation mode and content type. Add a simple development-only event viewer. Do not build an analytics dashboard for the MVP.

### Cost and safety controls

- Rate-limit AI generation and event intake by a privacy-preserving session token.
- Cache identical demo-content queries where safe.
- Cap AI input, output, retries and daily calls through configuration.
- Make `DEMO_MODE=true` and `AI_ENABLED=false` a fully usable local configuration.
- Add security headers, same-origin API calls, payload-size limits and an external-domain allowlist.
- Keep secrets out of browser code, logs, fixtures and version control.
- Add dependency-update instructions, but no automated production deployment.

### Build phases

#### Phase 1 — Demonstrable core

- Scaffold the application and apply the visual tokens.
- Add sample content and validation.
- Implement `/`, `/plan` and `/trip/:id`.
- Implement deterministic recommendations and session-storage drafts.
- Make the complete core journey work in demo mode.

Run type checking, unit tests, a production build and the happy-path end-to-end test.

#### Phase 2 — Saving and trust

- Add the Supabase migration and Row Level Security tests or documented verification queries.
- Add magic-link sign-in, saved trips and deletion.
- Add pricing states, source links, external hand-off disclosure and the help pages.
- Add the five privacy-safe events.

Re-run all checks and manually test a signed-out and signed-in journey.

#### Phase 3 — AI enhancement

- Add the Workers AI adapter and JSON validation.
- Keep deterministic selection as the source of allowed items and prices.
- Exercise timeout, malformed-response, quota and disabled-AI fallbacks.

Re-run all checks and compare AI and fallback output for the same trip brief.

#### Phase 4 — Hand-off quality

- Finish responsive and accessibility details.
- Add `wrangler.jsonc`, environment documentation and preview deployment steps.
- Update `README.md` with a 15-minute local setup, service connection, content replacement, test and deployment guide.
- Add `SECURITY.md` with data handling, secret rotation and vulnerability reporting.
- Confirm there are no flight features or misleading booking claims anywhere in the repository.

### Acceptance tests

The MVP is complete only when all of the following are true:

1. A new contributor can run the demo locally from the README without a cloud account.
2. A mobile visitor can finish the brief and receive a plan in under three minutes.
3. The result contains only IDs from approved content and clearly labels price confidence.
4. Disabling or breaking AI still produces a useful plan.
5. Registration is requested only when the visitor chooses to save.
6. Row Level Security prevents one user from reading or editing another user's trips.
7. External links are allowlisted, labelled and opened safely.
8. No raw prompt, email, accessibility note or personal data appears in product events or logs.
9. Keyboard navigation, focus order, error handling and a 360-pixel layout have been checked.
10. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and the happy-path end-to-end test pass.
11. The repository contains no flight product code, flight roadmap item or flight-booking workaround.
12. The app contains no real provider claim or copied brand asset that has not been explicitly approved.

### Handover

When finished, provide a short handover containing:

- what was built;
- how to run it locally;
- how demo mode differs from connected mode;
- which service credentials and official assets are still needed;
- test results;
- free-tier usage risks;
- the five target-user questions to ask in the first pilot.

Do not propose a larger feature roadmap. End with the smallest next validation step: observe five target visitors attempting the core journey, then remove friction before adding functionality.

---
