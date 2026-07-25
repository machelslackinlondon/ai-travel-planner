# Stack and cost controls

## Services

| Need | Service | Boundary |
|---|---|---|
| Web UI | Next.js and React | `apps/web`, deployable to Vercel |
| API | FastAPI | `apps/api`, containerised for Fly.io |
| CRUD | MongoDB | Async PyMongo repository; memory fallback locally |
| Search | Elasticsearch | Official async Python client; catalogue fallback locally |
| AI wording | Vercel AI Gateway | Optional and never the recommendation source of truth |
| Shared content | Versioned JSON | `libs/catalog`, validated by Nx |

MongoDB Atlas documents a no-credit-card free deployment for small development workloads. Elastic's durable free option is the self-managed Basic tier; Elastic Cloud hosted/serverless pricing is usage-based and should not be described as a permanent free tier. Fly.io, Vercel, MongoDB, Elastic, and model allowances can change, so verify official pricing before launch.

## Cost and failure controls

- Keep `DEMO_MODE=true`, `AI_ENABLED=false`, and hosted connection URLs empty by default.
- Bound AI input, output, retries, request time, per-device calls, and daily calls.
- Use MongoDB indexes and cap trip lists at 50 records per device.
- Keep Elasticsearch query size at 50 or fewer and protect reindexing with an admin secret.
- Use Fly auto-stop for the pilot, while accepting cold-start latency.
- Configure provider billing alerts and never enable unapproved automatic overages.
- Keep the deterministic planner, in-memory CRUD, and catalogue search usable during provider outages.

## Production boundaries

- A random browser UUID is not authentication. Add verified identity before multi-device or sensitive data use.
- A single Fly Machine is not high availability. Increase the minimum machine count only when uptime justifies the cost.
- Self-managed Elasticsearch moves hosting cost into operational work. Choose managed Elastic only with an approved budget.
- In-memory rate limits are per process. Use a shared limiter before horizontally scaling a public AI endpoint.
