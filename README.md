# Visit Jamaica AI Trip Planner MVP

A production-shaped, mobile-first pilot that turns a short trip brief into a trustworthy, editable Jamaica outline. The complete journey works without cloud accounts. Every bundled place, price, link and image is visibly labelled sample content and does not represent a real provider.

The pilot covers Montego Bay and Negril, uses deterministic recommendations as its source of truth, optionally lets Cloudflare Workers AI organise the shortlist, and optionally uses Supabase magic links and Row Level Security for saving.

## 15-minute local setup

Prerequisites: Node.js 20.19 or newer (Node 22 LTS recommended) and npm 11 or newer.

```bash
nvm install
nvm use
cp .env.example .env.local
npm install
npm run seed
npm run dev
```

Open the local URL printed by Vite. No Cloudflare or Supabase account is required: the defaults are `DEMO_MODE=true` and `AI_ENABLED=false`. Build a plan, edit it, and save a demo copy to this browser.

If your shell selects an older Node installation, switch Node before running npm. The repository’s `engines` field enforces the minimum.

## Useful commands

```bash
npm run dev          # Vite + local Cloudflare Worker
npm run seed         # validate all public content and image paths
npm run lint         # ESLint and content validation
npm run typecheck    # strict TypeScript check
npm test             # focused Vitest unit tests
npm run build        # production Worker/static-assets build
npm run test:e2e     # Playwright mobile happy path
npm run deploy       # manual Cloudflare deployment
```

Install the Playwright browser once with `npm exec playwright -- install chromium`. Production deployment is deliberately manual; review a preview and the release checklist in `docs/MAINTENANCE_AND_RELEASES.md` first.

## Demo mode and connected mode

Demo mode is honest and fully useful: it uses the checked-in 18-record sample catalogue, deterministic wording, in-memory development events, session-storage drafts and browser-local saved copies. It sends no email and makes no live-provider claims.

Local development deliberately uses `wrangler.demo.jsonc`, which omits the remote AI binding and therefore needs no Cloudflare login. Connected AI development is an intentional opt-in described below.

Connected mode adds only two hosted providers:

- Cloudflare Workers AI through the `AI` binding. The deterministic shortlist remains authoritative. Disabled AI, missing bindings, quota, timeouts, malformed output and unknown IDs all fall back safely.
- Supabase passwordless email and saved trips. The browser receives only a publishable key; Row Level Security limits each user to their own trips.

Follow [connected-mode setup](docs/CONNECTED_MODE.md) for exact variables, redirect URLs, migration and RLS verification. Copy configuration names from `.env.example`; keep real values in ignored `.env.local` and `.dev.vars` files.

## Content and trust

`content/seed/items.json` has six sample stays, eight sample experiences and four sample destination/information records. Runtime suggestions can reference only their IDs. Prices, source URLs, checked dates and hand-off details always come from those records rather than model output.

Follow [approved content operations](docs/CONTENT_OPERATIONS.md) to replace samples. Official Jamaica Tourist Board photography, logo files, brand tokens, approved provider records, production legal copy and public support/security contacts are still required before launch.

## Architecture

- React 19, TypeScript and React Router provide the single-page interface.
- Vite and the official Cloudflare Vite plugin build static assets and `src/worker/index.ts` together.
- Zod validates trip briefs, public content, AI JSON, stored plans and events.
- The Worker caps payload size, AI calls, retries, output and event intake; it applies same-origin API routes and security headers.
- One Supabase migration creates `trips` and `product_events`, including foreign keys and Row Level Security.
- Vitest covers recommendation and safety boundaries; Playwright covers the 360-pixel first-use journey.

## Preview and release

1. Run every command in the check set above.
2. Test once with AI disabled and once enabled, if connected.
3. Test signed-out demo saving, magic-link saving, account deletion and an allowlisted provider hand-off.
4. Run `npm exec wrangler -- versions upload` for a preview version or use the Cloudflare dashboard’s preview workflow.
5. Check keyboard order, visible focus, reduced motion and the 360-pixel layout.
6. Deploy manually with `npm run deploy` only after review. Keep the previous successful Worker version available for rollback.

No payment is accepted and no reservation is described as complete. Provider availability, final price, payment and cancellation terms apply after the disclosed hand-off.

## Free-tier risks

Cloudflare and Supabase allowances can change. AI quota exhaustion returns the deterministic plan, but Worker request limits can still make the whole site unavailable. Supabase free projects may pause, magic-link email delivery is rate-limited, and database/egress limits can interrupt connected saving. Review official limits and usage weekly, add billing alerts before any paid plan, and do not allow unapproved automatic overages.

## First pilot

Observe five target visitors and ask:

1. What did you expect after selecting “Plan my trip”?
2. Which question, if any, was difficult to answer?
3. What part of the plan felt useful or untrustworthy?
4. What information did you need before continuing to a provider?
5. Would you return to this planner for a real Jamaica trip? Why or why not?

The smallest next validation step is to observe five target visitors attempting the core journey, then remove friction before adding functionality.
