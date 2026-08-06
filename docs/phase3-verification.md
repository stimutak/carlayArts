# Phase 3 implementation and verification record

Date: 2026-08-06  
Baseline: `93c12ec` (`claude/redesign-carlay-art-WAFzz`)  
Scope: Accueil, Boutique, artwork detail, A-propos, Contact. Cart and checkout pages were not changed.

## Product-truth decisions

- The 60 Phase 1 records remain the rendered route set. Root `boutique.html` and `previews/` are treated as candidate data and visual references, never owner approval.
- `isCommerceEligible()` is the single Phase 4 integration gate. It requires owner-approved availability, price, faithful full media, condition, framing, and certificate state. All current records fail this predicate.
- Historical sold records remain `Vendu`. Every other record renders `En validation`; no detail page contains add-to-cart or buy-now controls.
- Card crops remain browsing previews. No current record has owner-approved full media, so all enlargement/lightbox controls are suppressed. The dormant verified-media dialog implements inert background handling, keyboard/touch navigation, focus trap, Escape, and focus return for future approved records.
- Candidate facts retain their review label and render `À confirmer` unless owner-approved. Per-work source conflicts and missing media roles remain visible on detail pages.
- All review routes retain `noindex, nofollow`.
- Biography, artist quote, geographic context, shipping, certificate, payment, and Instagram claims are not presented as verified facts.

## Exact automated checks

| Command | Result | Boundary |
|---|---|---|
| `npm test` | 18/18 passed | Content validation, fail-closed state, commerce predicate, metadata/reveal rules, Phase 3 source contracts |
| `npm run build` | 67 static pages built | All top-level pages plus 60 artwork routes |
| `npm run test:dist` | 3/3 passed | Required routes, internal links/assets, shared chrome, noindex, no purchase/lightbox for unapproved media |
| `npm run test:browser` | Passed | 320/390/1440 overflow, URL-restored filters, counts, menu focus return, contain stage, suppressed unverified enlargement, no-JS navigation/content |
| `npm run audit:production` | 0 vulnerabilities | Production dependency audit |
| In-app browser review | Passed with limits below | Visual hierarchy and visible state at 1440×900, 390×844, and 320×800; no console warnings/errors |

## WCAG 2.2 A/AA assessment

This is an implementation assessment, not specialist conformance certification. It considers every applicable A/AA family rather than treating an automated severity scan as sufficient.

| Criteria | Status | Evidence / limit |
|---|---|---|
| 1.1.1 Text alternatives | Pass in reviewed routes | Artwork previews, artist imagery, logo, and signature have contextual alt text. Decorative grain is CSS. |
| 1.2.x Time-based media | Not applicable | No audio or video. |
| 1.3.1–1.3.5 Structure and input purpose | Pass in reviewed routes | Landmarks, headings, lists, definition-like specifications, buttons, and labels are semantic. No data-entry forms are in Phase 3 scope. |
| 1.4.1 Use of color | Pass | Sold/review states use text as well as color. Filter state exposes `aria-pressed`. |
| 1.4.2 Audio control | Not applicable | No audio. |
| 1.4.3 Contrast (minimum) | Pass for token combinations reviewed | Primary, muted, faint, rose, and series text are used on noir/surface backgrounds. Reveal effects never reduce opacity. |
| 1.4.4 Resize text | Needs specialist/manual completion | Fluid type and layouts are implemented, but a full 200% browser-zoom sweep is not recorded here. |
| 1.4.5 Images of text | Pass | The brand monogram is a logo exception; information is otherwise HTML text. |
| 1.4.10 Reflow | Pass for tested widths | No horizontal page overflow at 320, 390, or 1440. Filter controls intentionally use a visible horizontal scroller. |
| 1.4.11 Non-text contrast | Pass for focus/state indicators reviewed | Focus uses a 3px rose outline; active chips use rose fill with noir text. A forced-colors audit remains outstanding. |
| 1.4.12 Text spacing | No known blocker | Layouts use flexible sizing and no fixed text-height clipping; dedicated override testing remains outstanding. |
| 1.4.13 Hover/focus content | Not applicable | No content is available only on hover/focus. |
| 2.1.1–2.1.2 Keyboard / no trap | Pass for active Phase 3 UI | Menu, cards, filter buttons, and links are keyboard reachable; menu Escape and focus return are browser-tested. Dormant verified-media dialog has source tests for trap/inert/focus return but cannot be end-to-end tested without approved media. |
| 2.1.4 Character shortcuts | Not applicable | No single-key shortcuts. |
| 2.2.x Timing | Not applicable | No time limits, auto-updates, or moving controls. |
| 2.3.x Seizures | Pass | No flashing content. Reduced motion removes nonessential transitions. |
| 2.4.1–2.4.7 Navigation and focus | Pass in reviewed routes | Skip link, titles, landmarks, logical headings, descriptive links, visible focus, and consistent navigation are present. |
| 2.4.11 Focus not obscured | Pass in sampled paths | Sticky navigation and filter bar did not obscure focused menu/filter controls in browser checks. Full route-by-route keyboard certification remains outstanding. |
| 2.5.1 Pointer gestures | Pass by design | The future lightbox provides previous/next buttons in addition to swipe. Current unverified media has no gesture control. |
| 2.5.2 Pointer cancellation | Pass in sampled controls | Actions occur on click activation, not pointer-down. |
| 2.5.3 Label in name | Pass in sampled controls | Visible button/link labels are contained in accessible names. |
| 2.5.4 Motion actuation | Not applicable | No motion input. |
| 2.5.7 Dragging movements | Pass by design | No drag-only interaction. |
| 2.5.8 Target size | Pass in primary controls | Menu, filters, close/navigation controls, and CTAs have 44px minimum targets. |
| 3.1.1 Page language | Pass | `lang="fr"`. |
| 3.1.2 Language of parts | No known blocker | Short proper names and technical terms do not require language switching in the current copy. |
| 3.2.1–3.2.4 Predictability | Pass | Focus does not trigger navigation; navigation and labels remain consistent. |
| 3.3.x Input assistance | Not applicable to Phase 3 | No forms are introduced. Contact uses a mailto link. |
| 4.1.2 Name, role, value | Pass in sampled paths | Dialog/menu/filter semantics and state attributes are explicit. |
| 4.1.3 Status messages | Pass | Filter result count is an `aria-live="polite"` status; empty results remain visible. |

## Blockers and follow-up

1. Owner approval is still required for stable identity, prices, availability, condition, framing, certificate, signature, series/work copy, biography, contact/social destinations, and faithful media.
2. No current work is commerce-eligible; the Disponibles result is intentionally zero.
3. No current work exposes a lightbox because no full image is owner-approved. End-to-end dialog, screen-reader, and real touch-swipe verification must follow the first approved media record.
4. A specialist manual audit is still required for screen readers, 200% zoom, text-spacing overrides, forced colors/high contrast, and complete route-by-route WCAG 2.2 AA sign-off.
5. `npm install` reports three development-dependency advisories (one low, two high); `npm run audit:production` reports zero production vulnerabilities. No forced dependency upgrade was performed in this scoped Phase 3 change.
