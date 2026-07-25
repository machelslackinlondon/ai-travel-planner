# Maintenance and releases

## Ownership

Keep the pilot accountable to two named roles:

- **Product owner:** decides scope, reviews the five core events and organises user sessions.
- **Content owner:** approves records and images, checks source links and removes stale information.

A developer supports releases and incidents, but no standing engineering team should be required for ordinary content updates.

## Weekly check — 20 minutes

1. Open the production journey on a phone.
2. Complete one trip using AI and one with AI disabled.
3. Check MongoDB saving, trip deletion, Elasticsearch search and one provider hand-off.
4. Review Vercel, Fly.io, AI Gateway, MongoDB and Elastic usage against the approved allowances.
5. Review only the five product events for obvious drop-off or errors.
6. Record the result and any action in one shared issue.

Do not add a dashboard until this manual check is genuinely burdensome.

## Monthly content check — 45 minutes

1. Run the content-validation command.
2. Check source links and checked dates.
3. Review prices, provider policies and accessibility notes with their source.
4. Hide uncertain records rather than guessing.
5. Confirm images and copy are approved and have useful alt text.
6. Publish a small content-only release.

The application must make stale information visible through the checked date and “check with provider” status.

## Monthly technical check — 45 minutes

1. Review dependency update notices and security advisories.
2. Apply small, compatible updates in a branch.
3. Run lint, type checking, tests, the production build and the happy-path end-to-end test.
4. Build a Fly API image and a Vercel web preview, then check the 360-pixel layout and keyboard journey.
5. Merge and deploy manually after review.

Avoid automatic production deployment and large upgrade batches during the pilot.

## Release checklist

- The change supports the core planning journey.
- Sample or unapproved content is not presented as real.
- Price status, checked date and source remain visible.
- AI failure still falls back to a useful plan.
- Device-scoped saving and deletion work, with the identity limitation clearly disclosed.
- External domains are allowlisted.
- Privacy-safe event properties have not changed unexpectedly.
- Accessibility checks and automated tests pass.
- The repository contains no flight product work or workaround.
- The rollback point is known.

## Simple rollback

Keep the previous successful Vercel deployment and Fly.io release available. Roll back the affected service, set `AI_ENABLED=false` if the model path is involved, and record one incident issue. Do not attempt live data repair until the affected trip IDs and scope are understood.

## Incident priorities

### Stop the affected feature immediately

- another visitor's saved trip can be viewed;
- a secret appears in the browser, logs or repository;
- an external link can leave the allowlist;
- unapproved content or a fabricated price is shown as confirmed;
- the service implies a booking or charge occurred when it did not.

### Use the fallback and investigate

- AI quota, timeout or invalid output;
- unusually slow plan generation;
- a single content source becomes unavailable;
- analytics event intake fails.

The deterministic planner should allow the public journey to continue safely.

## Data housekeeping

- Keep anonymous draft data in session storage and clear it when the browser session ends or the visitor deletes it.
- Keep raw AI input only in memory for the request; do not add it to logs.
- Give each device-scoped visitor a working delete control.
- Define and publish a saved-trip retention period before the pilot accepts real users.
- Delete test trips after each formal test cycle.
- Rotate any compromised secret immediately and review access logs.

## Scope review after the first five users

Review recordings or notes and answer:

- Did visitors finish the brief?
- Did the plan help them make a choice?
- Did they understand price confidence and external provider terms?
- Did they save or open a provider hand-off?
- What should be removed or simplified?

Ship one small improvement cycle. Do not begin a wider roadmap until repeat use and genuine provider intent are visible.
