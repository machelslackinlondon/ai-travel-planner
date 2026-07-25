# Security policy

## Pilot data handling

Anonymous drafts use session storage. The browser keeps a random device UUID and local fallback saves in local storage. Connected saves contain that pseudonymous UUID, a structured trip brief, and a validated itinerary in MongoDB. The UUID is not authentication; do not treat this pilot as suitable for sensitive data or cross-device accounts.

Optional notes and accessibility choices must never be copied into product events or logs. AI input exists only for the request and is not logged by application code. Event names and coarse properties are allowlisted in both browser and API. External links require HTTPS and an approved hostname.

## Secrets

Browser code may contain only `NEXT_PUBLIC_API_URL`. Keep MongoDB, Elasticsearch, search-admin, and AI credentials in the FastAPI/Fly.io environment. Keep `.env` and `.env.local` untracked and inspect production browser bundles before release.

If a credential is exposed, disable the affected feature, rotate it at the provider, remove it from every environment, review access logs, and redeploy. Rewriting Git history does not replace rotation.

## Reporting a vulnerability

Before a public pilot, replace this paragraph with the Jamaica Tourist Board’s approved private security-reporting address and response commitment. Do not invite sensitive reports into public issues.

Stop the affected feature immediately if one visitor can access another visitor’s plan, a secret is exposed, a hand-off bypasses the allowlist, or unapproved content is shown as confirmed.

## Dependency maintenance

Review npm and Python advisories monthly. Use a branch, inspect release notes, and run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` before a manual release.
