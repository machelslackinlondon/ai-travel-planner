# Security policy

## Pilot data handling

Anonymous drafts use session storage. Demo saves use local storage. Connected saves contain an authenticated owner UUID, structured trip brief and validated itinerary. The optional note and accessibility choices must never be copied into product events or logs. AI input exists only for the request and is not logged by application code.

The five event names and their coarse property keys are allowlisted in the browser, Worker and database policy. External links require HTTPS and an approved hostname. API bodies, AI output, retries, time and frequency are capped. Response headers restrict framing, browser capabilities and resource origins.

## Secrets

Browser code may contain only the Supabase publishable/anon key. Never add a service-role key. Put Worker secrets in Cloudflare with `wrangler secret put`, keep `.env.local` and `.dev.vars` untracked, and inspect the production bundle before release.

If a credential is exposed, disable the affected feature, rotate it at the provider, remove it from every environment, review access logs and redeploy. Rewriting Git history does not replace rotation.

## Reporting a vulnerability

Before a public pilot, replace this paragraph with the Jamaica Tourist Board’s approved private security-reporting address and response commitment. Do not invite sensitive reports into public issues.

Stop the affected feature immediately if one visitor can access another visitor’s plan, a secret is exposed, a hand-off bypasses the allowlist, or unapproved content is shown as confirmed.

## Dependency maintenance

Review advisories and small compatible upgrades monthly. Use a branch, inspect release notes, and run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run test:e2e`. Preview and manually release; there is no automated production deployment.
