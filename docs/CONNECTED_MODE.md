# Connected-mode setup

Demo mode uses no account. Cloudflare Workers AI and Supabase are optional enhancements to the same journey.

## Supabase

1. Create one Supabase project and apply `supabase/migrations/202607240001_initial_pilot.sql` in the SQL editor.
2. In Authentication, keep email magic links enabled. Add `http://localhost:3000/auth/callback`, the local port you actually use, and the production `/auth/callback` URL to the redirect allowlist.
3. Copy the project URL and publishable key (legacy projects may call it the anon key) into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. For Worker event intake, set `SUPABASE_URL` as a Worker variable and run `npm exec wrangler -- secret put SUPABASE_PUBLISHABLE_KEY`. Never use or expose `service_role`.
5. Set `DEMO_MODE=false` in `.dev.vars` locally and in the production Worker environment.
6. Run the documented queries in `supabase/verify_rls.sql` with two disposable test users. User B must see and modify zero rows owned by User A.

## Workers AI

1. Authenticate Wrangler with the pilot Cloudflare account.
2. Keep the `AI` binding in `wrangler.jsonc` and confirm the configured model is available in that account/region.
3. Set `AI_ENABLED=true` in `.dev.vars` and set `CLOUDFLARE_DEV_BINDINGS=true` in `.env.local`, then set the production Worker variable separately. Authenticate Wrangler before `npm run dev` so the OpenNext development bridge can use the remote `AI` binding. Leave both settings disabled for an account-free local demo.
4. Keep the timeout, per-session and daily limits conservative. Quota, timeout, malformed JSON, unsupported IDs and binding failures all return the deterministic plan.
5. Do not enable paid overages until the product owner has configured billing alerts and approved a ceiling.

For a connected local run, the browser values belong in `.env.local`; Worker-only values belong in `.dev.vars`. Both files are ignored by Git.
