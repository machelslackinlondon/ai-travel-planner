# Approved content operations

The public seed is intentionally small and versioned. It is not a content management system. Every included record is visibly marked `Sample` and points to `example.com`; none represents a real business.

## Replace the samples

1. Ask the Jamaica Tourist Board content owner to approve each title, summary, source, image, price status and checked date.
2. Replace records in `content/seed/items.json` without changing the `ContentItem` shape in `src/lib/schemas.ts`.
3. Put approved image files under `public/images/`. Do not hotlink, scrape or include an official logo unless the exact asset has been supplied and approved.
4. Set `priceStatus` to `confirmed` only when the supplied source supports that wording. Otherwise use `estimated` or `check-with-provider`. Never infer a price.
5. Add the provider’s hostname to the small allowlist in `src/lib/provider.ts` only after approval. Worker and browser hand-offs accept HTTPS only.
6. Run `npm run seed`, then the full check set documented in the README.
7. Have the content owner review the rendered cards, source links, alt text and checked date before release.

The validator fails on duplicate IDs, missing or non-HTTPS sources, invalid dates, missing alt text, remote images, absent local files, malformed price data, or an unpublished record accidentally placed in the public seed.

Follow the monthly review in `docs/MAINTENANCE_AND_RELEASES.md`. Hide uncertain live content outside the public seed rather than guessing.
