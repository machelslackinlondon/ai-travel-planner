# Freemium stack and cost controls

## Recommended services

Use two hosted providers for the pilot. Everything else should be source code or approved content in the repository.

| Need | Service | Why it fits the MVP |
|---|---|---|
| Web app, API and preview deployments | Cloudflare Workers with static assets | One small deployment for the React app and server routes; no separate server to maintain. |
| AI-assisted wording and itinerary organisation | Cloudflare Workers AI | Uses a Worker binding, needs no separate model provider key and has a free daily allocation. |
| Passwordless sign-in and saved trips | Supabase | Managed authentication and a small Postgres database with Row Level Security. |
| Approved destination content | Versioned JSON in the repository | No new CMS, subscription, runtime scrape or fragile integration. |
| Product measurement | A small `product_events` table in Supabase | Five allowlisted events; no third analytics account or tracking script. |
| Images | Approved files in the application | No hotlinking, image CDN contract or dependency on a stock-photo API. |

Do not add a maps platform to the first release. Use resort-area labels, travel-time notes supplied by the content owner and safe links to an approved mapping site only when useful.

## Free-plan reference

The figures below were checked on 24 July 2026 and can change. Confirm them on the official pages before launch.

### Cloudflare

- Workers Free currently permits 100,000 requests per day and 10 milliseconds of CPU time per invocation. Static asset requests are free and unlimited. See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).
- Workers AI currently includes 10,000 neurons per day at no charge. On the Free plan, requests fail after the daily allocation is used, so the deterministic planner is a required fallback. See [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- Cloudflare's official React starter and Vite plugin should be used so the web app and Worker share one build and deployment. See [Cloudflare Vite plugin documentation](https://developers.cloudflare.com/workers/vite-plugin/).

### Supabase

- The Free plan currently lists 50,000 monthly active users, a 500 MB database, 1 GB of storage and 5 GB of egress. It supports two active free projects; inactive free projects may be paused. See [Supabase pricing](https://supabase.com/pricing).
- Email magic links are enabled by default. Redirect URLs must be configured; default request and expiry limits apply. See [Supabase passwordless email documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless).

Starting software cost can be £0 per month while usage remains within these limits. A production domain, approved photography, legal review, email delivery growth and traffic above the free allowances may still create costs.

## Why this is maintainable

- One frontend and one small server layer are deployed together.
- There is one database migration and two application tables.
- The AI can be disabled without breaking the visitor journey.
- Content changes are reviewed as normal repository changes.
- There is no payment, flight, live inventory, mapping or currency-rate integration.
- The application has one external-provider adapter instead of provider-specific code throughout the interface.

## Cost controls to build in

- Default local and preview deployments to `DEMO_MODE=true`.
- Limit AI generation to three attempts per anonymous session per hour and one retry per request. Keep these values configurable.
- Set strict input and output sizes and a short timeout.
- Stop using AI automatically when the daily application allowance is reached; use the deterministic plan.
- Store only saved trips and the five allowlisted events.
- Do not store uploaded images or user files in the MVP.
- Hide unpublished content at build time.
- Review free-plan dashboards weekly during the pilot.
- Create billing alerts before enabling a paid plan; do not permit automatic paid overages without an owner.

## Environment separation

Use only two environments:

- **Local/demo:** no account required, fixture content, session storage, AI optional.
- **Pilot production:** one Cloudflare deployment and one Supabase project, approved content, magic links and controlled AI.

Avoid a permanent staging environment until the pilot has regular releases. Cloudflare preview deployments are sufficient for review.

## When to consider paying

Pay for capacity only after the core journey shows value. A review is warranted when one of these conditions is sustained:

- free allowances are regularly close to exhaustion;
- free-project pausing interrupts a real pilot;
- authentication email delivery is unreliable at the required volume;
- the team needs backups, longer logs or stronger support guarantees;
- active users are saving plans and opening provider hand-offs often enough to justify the spend.

Do not expand the product simply because a paid service makes a feature available.

## Services deliberately not selected

- A separate CMS: too much operating overhead for a small approved content set.
- A vector database: deterministic tags and a small shortlist are enough for the pilot.
- A live exchange-rate API: source-currency prices and spend bands are more transparent for the MVP.
- A dedicated analytics suite: five first-party events answer the initial product question.
- A booking engine: external provider hand-offs test intent without payment and supplier complexity.
- Any flight service: it is outside this product's scope.
