# Phase 5 frontend, performance, and technical SEO hardening

Baseline: public commit `a202d97`. Review date: 2026-08-06.

This audit covers the generated static site and local production preview. It does not authorize indexing, publish owner-unapproved artist or artwork facts, activate payment providers, or substitute for deployed-CDN and physical-device verification.

## Implemented hardening

- Kept every generated HTML page at `noindex, nofollow`. No structured data is emitted while artwork identity, media, availability, and policy facts remain under review.
- Added consistent canonical, Open Graph, theme, color-scheme, referrer, title, and description metadata. Canonicals and internal route links use trailing slashes consistently.
- Replaced the blocking Fontshare stylesheet with the existing locally bundled font family.
- Moved the 60-record cart inventory from repeated inline HTML to one static `/data/cart-inventory.json` asset. The fail-closed eligibility predicate and demo-only checkout remain unchanged.
- Added intrinsic dimensions and asynchronous decoding to rendered images, and lazy loading to deferred dialog/cart images.
- Replaced three unusually large public PNG artwork previews with reviewed WebP equivalents. The three tracked PNG copies were removed after their content paths were updated; Git history retains the originals.
- Added modal background inertness and dynamic menu-button naming, restored focus behavior, and made the skip-link target programmatically focusable.
- Removed developer filenames, conflict keys, missing-role codes, and the technical traceability panel from artwork detail pages. The audit evidence remains in `data/artwork-inventory.authoritative-candidate.json`, `docs/artwork-inventory-review.json`, and the Phase 0 audit.
- Kept one concise validation disclosure on artwork pages. Corrected the eligible-state copy to describe the existing demo-only cart instead of saying commerce integration is a future phase.
- Removed artwork-card `aria-label` overrides so visible title, status, metadata, and price text form the native accessible link name.

## Automated and browser evidence

### Repository checks

- `npm run check`: 33 unit tests passed; 3 generated-output tests passed; 67 static HTML pages built.
- `npm run audit:static`: 1,703 links/references and 353 rendered images checked. All local targets resolve; titles and canonicals are unique; Open Graph fields match canonical metadata; every page remains `noindex, nofollow`; no structured data or Fontshare dependency is emitted.
- Output budgets: maximum HTML 62.1 KiB (`/boutique/`), maximum JavaScript 8.5 KiB, maximum CSS 29.8 KiB, total static output 8.7 MiB.
- `npm run test:browser`: responsive, no-JavaScript, filter/history, fail-closed media/commerce, menu/drawer keyboard, persistence, validation, error/retry, and no-payment journeys passed.
- `npm run audit:screenshots`: exact 320×800, 390×844, and 1440×900 current-build screenshots captured with no horizontal document overflow or browser console/page errors.
- `npm audit --omit=dev`: 0 production dependency vulnerabilities.

### Lighthouse 12.8.2, mobile simulation

Scores are local-run evidence, not deployment guarantees. SEO remains intentionally reduced by the review-mode indexing block.

| Route | Performance | Accessibility | Best Practices | SEO | FCP | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 96 | 100 | 100 | 66 | 1.3 s | 2.7 s | 0 ms | 0.011 |
| `/boutique/` | 100 | 100 | 100 | 66 | 1.3 s | 1.6 s | 0 ms | 0.01 |

The only remaining binary Lighthouse failure on both routes is `is-crawlable`: the page is blocked from indexing by the required `noindex, nofollow` meta directive.

## Screenshot evidence

- [Homepage at 320×800](screenshots/phase-5/home-320.jpg)
- [Catalog at 390×844](screenshots/phase-5/boutique-390.jpg)
- [Artwork detail at 1440×900](screenshots/phase-5/artwork-1440.jpg)

## Remaining owner and deployment gates

1. **Indexing:** the owner must explicitly approve the artist biography, catalog identities, availability, pricing, faithful media, and final public copy before anyone removes `noindex, nofollow` or adds structured data/sitemaps.
2. **Commerce:** payment activation remains blocked on owner-approved inventory, shipping, taxes/duties, returns, damage, condition, framing, certificate, and privacy/security policies plus a separate server-side payment and inventory-reservation review.
3. **Hosting behavior:** verify the actual platform serves trailing-slash routes and 404s correctly, preserves the canonical host/HTTPS redirect, compresses text assets, applies immutable caching to hashed assets, uses appropriate HTML/data cache rules, and adds reviewed CSP/frame/content-type/security headers.
4. **Deployed audit:** rerun link, Lighthouse, console/network, and response-header checks against the deployed review URL. Local preview does not prove CDN, redirect, cache, or header behavior.
5. **Independent accessibility:** complete VoiceOver/Safari plus a second assistive-technology pairing, 200%/400% zoom, text spacing, forced colors/high contrast, reduced motion, virtual keyboard, and physical touch review.
6. **Build tooling:** full `npm audit` reports three development/build-tool advisories through Astro 5 (`astro` and transitive `sharp` high; `esbuild` low). The static runtime audit is clean, but upgrading to the available Astro 7 fix is a semver-major migration that needs a separately scoped compatibility pass before untrusted build inputs are accepted.
