# Connected-mode setup

The default local mode needs no hosted account. Connected mode enables MongoDB persistence, Elasticsearch indexing, and optional Vercel AI Gateway wording behind the FastAPI service.

## MongoDB

1. Create a MongoDB Atlas free deployment or another compatible cluster.
2. Create a least-privilege database user and restrict network access to the required development or Fly.io sources.
3. Put `MONGODB_URI` and `MONGODB_DATABASE` in the root `.env` locally.
4. FastAPI creates unique owner/trip and updated-date indexes at startup. Product events have a 90-day TTL index.
5. Verify with two random `x-session-id` values that one identifier cannot list, read, update, or delete the other's plan.

The device UUID is pseudonymous access scoping, not authentication. Introduce a verified identity token before the pilot needs cross-device accounts or handles sensitive information.

## Elasticsearch

1. Use Elastic's free self-managed Basic tier, or provision a metered Elastic Cloud deployment.
2. Configure `ELASTICSEARCH_URL` plus either `ELASTICSEARCH_API_KEY` or `ELASTICSEARCH_USERNAME` and `ELASTICSEARCH_PASSWORD`.
3. Generate a high-entropy `SEARCH_ADMIN_KEY`. Keep `ELASTICSEARCH_AUTO_INDEX=false` unless indexing at every API start is intentional.
4. Start the API, then initialise or refresh the index:

```bash
curl -X POST http://127.0.0.1:4000/api/search/reindex \
  -H "x-admin-key: $SEARCH_ADMIN_KEY"
npm run search:index
```

The protected endpoint refreshes the legacy catalogue index; `npm run search:index` refreshes the conversational planner's typed mock-data index. Search automatically uses checked-in repository data when Elasticsearch is not configured or unavailable.

## Vercel AI Gateway

1. Create a scoped AI Gateway API key and set `AI_GATEWAY_API_KEY` only on FastAPI.
2. Set `AI_ENABLED=true` and confirm `AI_MODEL` is available.
3. Keep time, per-device, and daily limits conservative. Invalid JSON, unknown IDs, timeouts, and quota failures return the deterministic plan.
4. Configure billing alerts before enabling paid usage.

## Fly.io API

Review the application name and region in `apps/api/fly.toml`, then set secrets and deploy:

```bash
fly secrets set \
  MONGODB_URI="..." \
  ELASTICSEARCH_URL="..." \
  ELASTICSEARCH_API_KEY="..." \
  SEARCH_ADMIN_KEY="..." \
  AI_GATEWAY_API_KEY="..." \
  CORS_ORIGINS="https://your-web-app.example"
npm run deploy:api
```

Do not put database, Elastic, search-admin, or AI keys in `apps/web/.env.local` or any `NEXT_PUBLIC_*` variable.

## Next.js web

Deploy `apps/web` and set `NEXT_PUBLIC_API_URL` to the public HTTPS Fly.io origin. The web content-security policy and FastAPI CORS allowlist both derive from these configured origins, so update them together.
