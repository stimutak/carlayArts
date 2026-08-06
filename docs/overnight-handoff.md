# Noir Gallery v2 overnight handoff

## Completed implementation

- 69 static pages: homepage, complete 60-work catalog, 60 unique artwork routes,
  artist, contact, client-needs, cart, demo checkout, confirmation, and 404.
- Real URL-backed series and availability filtering with live counts and browser
  history restoration.
- Truthful media inspection: every legacy crop is labeled, full-work media gaps are
  visible, and the accessible lightbox only exposes files actually provided.
- Shared desktop/mobile navigation, global cart drawer, footer, focus states,
  reduced motion, fail-visible content, and no-JavaScript essential content.
- Versioned unique-work cart and demo checkout architecture with a build-time
  owner-approved allowlist. Current catalog eligibility is intentionally empty.
- Artist/contact placeholder surfaces and `/client-a-fournir`, generated from the
  artwork review report with counts, affected slugs, placement instructions, and
  activation blockers.
- Client intake templates under `client-input/` for artwork, artist, site, and policy
  deliveries.
- Canonicals, per-page descriptions/titles, Open Graph basics, filtered sitemap,
  crawler block, 404, image dimensions, lazy loading, and a 300KB image budget.
- Cloud-ready GitHub Actions quality workflow. It will run after an authorized push;
  no remote push or public deployment was performed implicitly.

## Passing checks

- 38 unit/content/commerce/gallery/client tests.
- 6 built-distribution checks covering routes, links, assets, image budget, metadata,
  sitemap, shared chrome, and purchase boundaries.
- Astro production build: 69 pages, including every artwork route.
- Browser journeys at 320×800, 390×844, and 1440×900: navigation, filter URL/history,
  empty availability, lightbox focus return, global cart safety, disabled empty
  checkout, confirmation truth, horizontal overflow, console errors, and no-JavaScript
  catalog visibility.
- Accessibility: zero critical or serious Axe findings across ten representative routes
  plus mobile representatives.
- Production dependency audit: zero vulnerabilities.

## Remaining intervention-only blockers

See `docs/blockers.md` and `/client-a-fournir`. In summary: approved artwork identity,
availability, price, facts and full media; approved artist/public-contact content;
approved policies/legal ownership; live-commerce decision and infrastructure; and
explicit publication/indexing approval.

The Astro 5 development toolchain still reports two high and one low advisory in the
full development audit. Production dependencies audit cleanly. Clearing the remaining
development advisories requires a separately reviewed Astro 7 major upgrade rather than
an automatic forced update.
