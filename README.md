# Visit Jamaica AI Trip Planner

An Nx monorepo containing a Next.js/React web application and a FastAPI service. The API provides deterministic or AI-assisted trip planning, MongoDB CRUD, privacy-filtered event intake, and Elasticsearch-backed catalogue search.

## Workspace

```text
apps/web/       Next.js 16 and React 19 frontend
apps/api/       Python 3.11+ FastAPI service and Fly.io configuration
apps/web-e2e/   Playwright browser tests
libs/catalog/   Versioned content shared by TypeScript and Python
```

Nx owns the task graph and caching. MongoDB and Elasticsearch are adapters behind FastAPI; when their URLs are absent, local development uses in-memory trip storage and direct catalogue search.

## Local setup

Prerequisites: Node.js 20.19+, npm 11+, Python 3.11+, and [uv](https://docs.astral.sh/uv/).

```bash
npm install
uv sync --project apps/api --dev
cp .env.example .env
cp apps/web/.env.example apps/web/.env.local
npm run seed
npm run dev
```

Open `http://localhost:3000`. FastAPI runs at `http://127.0.0.1:4000`; its development OpenAPI page is `/docs`. No hosted account is needed for the default demo configuration.

## Commands

```bash
npm run dev            # run web and API together through Nx
npm run dev:web        # run only Next.js
npm run dev:api        # run only FastAPI
npm run lint           # ESLint, Ruff, and catalogue checks
npm run typecheck      # TypeScript and mypy
npm test               # Vitest and pytest
npm run build          # Next production build and Python bytecode validation
npm run test:e2e       # Playwright happy path
npm run graph          # inspect the Nx project graph
npx nx run api:docker-build
```

## API surface

- `POST /api/plan` — validate a brief and return an AI-organised or deterministic plan.
- `GET|POST /api/trips` and `GET|PUT|DELETE /api/trips/{id}` — MongoDB CRUD scoped by `x-session-id`.
- `GET /api/search` — Elasticsearch search with a catalogue fallback.
- `POST /api/search/reindex` — protected catalogue indexing.
- `POST /api/events` — allowlisted product events only.
- `GET /health/live` and `GET /health/ready` — Fly.io health endpoints.

The browser stores a random device UUID and sends it as `x-session-id`. That is useful for an account-free pilot, but it is not production-grade identity or multi-device access. Add real authentication before storing sensitive or long-lived customer data.

## Connected services

- MongoDB Atlas supports a managed free deployment for pilot CRUD.
- Elastic provides a free self-managed Basic tier; hosted Elastic Cloud is metered and may only offer a trial. The adapter supports API-key or basic authentication.
- Vercel AI Gateway is optional. Failures, invalid output, quotas, and timeouts always return the deterministic plan.
- Fly.io deploys `apps/api/Dockerfile`; Vercel can deploy `apps/web` with `NEXT_PUBLIC_API_URL` set to the Fly origin.

See [connected-mode setup](docs/CONNECTED_MODE.md), [stack and cost controls](docs/STACK_AND_COSTS.md), and [maintenance and releases](docs/MAINTENANCE_AND_RELEASES.md).

## Content trust

`libs/catalog/seed/items.json` contains visibly labelled sample records. Runtime suggestions may reference only their IDs. Prices, URLs, checked dates, and provider details come from the catalogue rather than model output. Follow [approved content operations](docs/CONTENT_OPERATIONS.md) before replacing samples.
