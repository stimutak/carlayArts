# Noir Gallery v2 foundation status

This foundation is based on commit `aae865bb84c9e1f0ec03fbb3e875efa081dc7c6c`.
The five files in `previews/` remain unchanged visual references, not production
behavior or approved content.

## Implemented scope

- Astro static output with the required top-level routes and one generated route
  for every legacy catalog artwork.
- Build-time collection schema plus cross-record validation for duplicate identity,
  price validity, asset resolution, alt text, and faithful media for any work ever
  promoted to `available`.
- Shared metadata, Base layout, local Space Grotesk and Playfair Display fonts,
  resilient Clash Display fallback, design tokens, navigation, mobile menu, footer,
  focus states, reduced motion, and fail-visible reveals.
- Unit, generated-route, internal-link, asset, mobile keyboard, 320px overflow, and
  no-JavaScript checks.

## Deliberately unresolved inputs

`docs/artwork-inventory-review.json` is the generated owner-review queue. It records
missing facts and media per artwork, plus legacy card images reused by more than one
catalog work. Until those inputs are approved:

- historical sold states remain `sold`;
- every other work is `not-for-sale`, never `available`;
- catalog crops are labeled as previews and never represented as faithful full-work
  media;
- work notes and series statements are visibly labeled drafts;
- all pages carry `noindex, nofollow`;
- no cart, checkout, or payment behavior is active.

## Commands

- `npm run extract` regenerates artwork records, copied assets, and the review queue
  from the pinned legacy catalog.
- `npm test` runs schema and foundation unit tests.
- `npm run build && npm run test:dist` validates all generated routes, links, and
  assets.
- `npm run test:browser` runs the built-site mobile keyboard and no-JavaScript checks
  (Playwright Chromium must be installed).
