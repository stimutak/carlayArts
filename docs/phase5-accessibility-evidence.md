# Phase 5 accessibility evidence

Date: 2026-08-06

Baseline: public commit `a202d97a5544890911c5765e2f377c2e754be6d5`

Target: WCAG 2.2 A/AA hardening, not certification

## Scope and claim boundary

This lane adds automated checks and fixes confirmed code-level failures. It does not certify WCAG conformance. Axe coverage is useful but cannot determine every success criterion, and automated browser assertions do not replace assistive-technology or human visual review.

The synthetic eligible artwork is available only when Astro builds with `CARLAY_ACCESSIBILITY_FIXTURE=1`. It is not present in content data, has no query-parameter activation path, and is excluded from a normal production build. Production regressions require zero synthetic routes/records, zero add/buy controls, and zero commerce-eligible authoritative works.

## Automated route and state coverage

`npm run test:a11y` builds the isolated test fixture, starts a local static preview, and runs Playwright with axe-core tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, and `wcag22aa`.

| Surface | States scanned |
| --- | --- |
| Accueil | Default desktop; mobile menu open; empty cart drawer; reduced-motion emulation; forced-colors emulation |
| Boutique | Default; series filter; empty available result; synthetic available result; 320 CSS px reflow; WCAG text-spacing override |
| Artiste | Default; 320 CSS px reflow |
| Contact | Default; 320 CSS px reflow |
| Panier | Empty; populated synthetic cart journey; 320 CSS px reflow |
| Commande | Empty/recovery; ready; required-field errors; simulated failure/retry; 320 CSS px reflow |
| Confirmation | No local session; completed synthetic demo; 320 CSS px reflow |
| Artwork detail | Real guarded `vortex-5`; synthetic eligible detail; verified lightbox open; 320 CSS px reflow |

The scanner reports rule IDs and WCAG criterion tags for every violation. The successful verification run evaluated 20 route/state snapshots and 63 distinct axe WCAG A/AA rules, plus 21 criterion-oriented browser assertions.

| Criterion or support area | Automated evidence |
| --- | --- |
| 1.4.10 Reflow | Eight representative routes have no document-level horizontal overflow at 320 CSS px. Existing foundation and commerce journeys also check 320/390/1440 px. |
| 1.4.12 Text spacing | Boutique is injected with 1.5 line height, 2em paragraph spacing, 0.12em letter spacing, and 0.16em word spacing; document overflow must remain absent. |
| 2.1.2 No keyboard trap | Mobile-menu background is inert while open and restored on close. Existing browser journeys exercise Tab wrapping and Escape for menu, drawer, and verified lightbox. |
| 2.4.3 Focus order | Menu, cart drawer, lightbox, checkout error summary, and confirmation restore or move focus programmatically. |
| 2.4.11 Focus not obscured | Restored menu focus and linked invalid-field focus must remain in the viewport and on top at a sampled point; anchored IDs receive sticky-header scroll margin. |
| 3.3.1 Error identification | Checkout summary links move focus to the associated invalid field while inline errors and `aria-invalid` remain associated. |
| 4.1.2 Name, role, value | Axe scans modal/control states; menu, cart drawer, and lightbox assertions require background inertness and restoration. |
| Reduced motion support | `prefers-reduced-motion: reduce` must remove smooth scrolling, reveal transforms, and meaningful transition duration. |
| Forced-colors support | Chromium forced-colors emulation must preserve a visible keyboard focus outline. This is a limited support assertion, not a full 1.4.11 determination. |

## Confirmed failures fixed

| Finding | Evidence before fix | Fix |
| --- | --- | --- |
| 1.4.12 artwork-card clipping | At 320 px with the specified spacing override, the price column extended the document to 365 px. | Stack card copy and price at small widths and left-align the price block. |
| 1.4.3 fallback text contrast | Axe measured the unknown-series eyebrow at 1.52:1 (`#313131` on `#0a0a0a`). | Separate decorative border fallback from text fallback; unknown series text now uses `#b8b8b8`. |
| Modal background exposure | Mobile menu declared `aria-modal` but did not inert header, main, footer, or cart shell. | Preserve prior inert state, inert every background surface on open, and restore it on Escape, overlay close, navigation, and desktop breakpoint. |
| Eligible-detail stale state | Verified eligible media still displayed “Média non homologué” and pre-Phase-4 integration copy. | Render verified-media copy conditionally and describe the active demo cart/checkout path. Regression tests cover both phrases. |

## Manual evidence matrix

“Not performed” means no human claim is made from this lane.

| Check | Automated evidence available | Manual status | Remaining evidence needed |
| --- | --- | --- | --- |
| Keyboard-only journey | Focus traps/return, inertness, checkout error focus, and key navigation are automated. | **Not performed manually.** | Human Tab/Shift+Tab/Enter/Space/Escape pass over every route and state. |
| Screen reader | Semantics and ARIA rules are axe-scanned. | **Not performed.** No VoiceOver, NVDA, or JAWS session occurred. | VoiceOver + Safari and NVDA/JAWS + Chromium announcement/order/landmark/form-error review. |
| 200% zoom | 320 CSS px reflow is automated. | **200% zoom not performed manually.** | Browser 200% visual/functionality review on desktop and checkout flows. |
| 320 px reflow | Eight routes plus commerce states are checked for horizontal overflow. | **Not performed visually.** | Human inspection for clipping, overlap, reading order, and horizontally scrollable filter affordance. |
| Text spacing | Exact spacing override runs without document overflow after the card fix. | **Not performed visually.** | Human inspection for clipped/overlapped/lost content and control labels. |
| Focus not obscured | Key menu and checkout targets receive geometry/top-layer assertions. | **Not performed end to end.** | Human focus-indicator review across every interactive element, including sticky filters/summary. |
| Reduced motion | Playwright emulates the preference and checks computed styles. | **Not performed visually.** | Human review with OS reduced motion enabled for all interaction-triggered motion. |
| Forced colors / high contrast | Playwright forced-colors emulation verifies a visible focus outline. | **Not performed manually.** | Windows High Contrast/forced-colors review of text, controls, boundaries, selected states, and artwork-independent meaning. |
| Modal inertness | Menu, cart drawer, and lightbox background inertness/focus restoration are automated. | **Not performed with assistive technology.** | Screen-reader virtual-cursor isolation and mobile touch exploration. |

## Remaining blockers

- Axe leaves color-contrast nodes as “needs review” where CSS gradients, pseudo-elements, images, or overlapping layout prevent it from determining the rendered background. These are not reported as passes and require a manual contrast review.
- Screen-reader behavior, 200% browser zoom, human text-spacing inspection, complete focus-obscuration review, reduced-motion visual behavior, Windows High Contrast, and modal virtual-cursor isolation remain unperformed.
- `npm run audit:production` reports zero vulnerabilities. Full `npm audit` reports three development/build-tool findings (one low, two high) through Astro, esbuild, and sharp; npm offers only a breaking Astro 7 upgrade, which is outside this accessibility lane.
- These gaps prevent a conformance or certification claim even when all automated commands pass.

## Final command evidence

- `npm run check`: 38 unit tests passed, 67 production pages built, and 4 production-output tests passed.
- `npm run test:browser`: foundation checks passed at 320/390/1440 px; commerce journey passed; accessibility scanner passed 20 route/state snapshots, 63 distinct axe WCAG A/AA rules, and 21 additional assertions.
- Production restoration: a fresh normal build emitted 67 pages; the synthetic route and identifiers were absent; all 4 production-output tests passed again.
- `npm run audit:production`: 0 vulnerabilities.
- `npm audit`: 3 development/build-tool findings remain (1 low, 2 high); no forced breaking upgrade was applied.
