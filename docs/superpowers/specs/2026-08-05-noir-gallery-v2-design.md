# Noir Gallery v2 — Implementation and Expert Approval Plan

**Created:** 2026-08-05

**Revised:** 2026-08-06 after desktop, mobile, visual, commerce, accessibility, and technical audit

**Status:** Design direction approved; implementation and expert sign-off pending

**Design previews:** `previews/` (five static reference screens, not production behavior)

**Figma record:** https://www.figma.com/design/E9RTsRpBfwwk94SiOBp3o2

## 1. Executive decision

Keep the Noir Gallery v2 direction and build it. The visual concept is strong: it
feels premium, gives the paintings visual priority, and presents Carlay more
distinctively than the existing site.

Do **not** treat the current previews as an approved product or launch candidate.
They demonstrate art direction only. They do not yet provide a trustworthy,
accessible, mobile-complete, or functional purchase journey.

The work will be accepted in two stages:

1. **Design and implementation approval in demo mode.** Every route and interaction
   works end to end without taking a real payment. This is the scope of this plan.
2. **Live-commerce activation.** Real providers, legal/policy content, production
   inventory controls, monitoring, and payment security are separately approved
   before money can be taken.

## 2. Current-state truth

### What exists

- Five static previews: Accueil, Boutique, one Vortex 5 detail page, L'Artiste,
  and Commande.
- A coherent visual system using Noir, rose, restrained series colors, Clash
  Display, Space Grotesk, and Playfair Display.
- Responsive compositions with no page-level horizontal overflow in audited
  1440px, 390px, and 320px viewports.
- A fail-visible reveal concept, reduced-motion rules, meaningful image alt text,
  and generally sound contrast choices.

### What does not exist yet

- No Astro application, build pipeline, content collection, or production routes.
- No unique page per artwork. Every preview card points to the same Vortex 5 page.
- No working filters, mobile menu, accessible lightbox, cart, cart drawer, checkout
  validation, confirmation, or failure/recovery states.
- No Contact, Panier, or Confirmation implementation.
- No automated test suite; `npm test` currently reports "No tests yet."
- No complete product imagery, approved curatorial copy, real Instagram URL,
  shipping/returns/duties policy, or live payment integration.

### Audit conclusion

- **Art direction:** approximately 8/10 and worth implementing.
- **Launch readiness:** approximately 2–4/10 depending on the surface.
- **Primary risk:** the previews look finished enough to imply behaviors and trust
  that the product does not yet provide.

## 3. Product goal and design principles

Build a French-first artist and commerce site that lets a visitor:

1. Recognize Carlay's world within five seconds.
2. Understand enough about the artist, series, process, and individual work to
   make the mystery feel intentional rather than underexplained.
3. Browse all works, distinguish available from sold works, and reach the correct
   detail page every time.
4. Inspect an artwork faithfully, including texture and physical details.
5. Add one unique work to the cart and complete a clear demo checkout.
6. Understand certificate, condition, framing, shipping, duties, returns, and
   damage procedures before committing.
7. Complete the full journey by keyboard, touch, screen reader, reduced motion,
   and mobile navigation.

Design principles:

- **Art first.** UI remains quiet; paintings supply most of the color.
- **Mystery with evidence.** Use concise, concrete curatorial and process detail,
  not generic superlatives or exhaustive explanation.
- **Product truth over mood.** Editorial crops may be used for discovery, but the
  detail page must show the full, uncropped work and accurate physical information.
- **Premium means dependable.** Every visible control must work; no false zoom,
  dead card, decorative filter, or checkout button.
- **Fail visible and fail closed.** Content remains visible without JavaScript;
  unavailable or unverified works cannot be purchased.
- **Mobile is a primary surface.** Navigation, filters, artwork inspection, cart,
  and checkout must be complete at 320px and above.

## 4. Scope

### Routes required for design and implementation approval

| Route | Purpose | Required behavior |
|---|---|---|
| `/` | Accueil | Hero, featured works, artist introduction, collection discovery, acquisition reassurance |
| `/boutique` | All works | Filterable collection catalog, availability filter, result count, correct work links |
| `/oeuvre/[slug]` | Artwork detail | Faithful media, story/specifications, lightbox, availability-specific actions, related works |
| `/a-propos` | Artist story | Artist hero, concrete biography/process, facts, signature, contact handoff |
| `/contact` | Contact | Press/gallery contact, acquisition routing, real social link |
| `/panier` | Cart | Unique line items, removal, totals, reassurance, checkout CTA |
| `/commande` | Demo checkout | Validated shipping form, payment choice, order summary, demo submission |
| `/confirmation` | Demo result | Order summary, explicit demo status, next steps, return navigation |

Every artwork in the authoritative inventory must generate its own
`/oeuvre/[slug]` route. Sold works keep useful, shareable pages but expose no
purchase CTA.

### Out of scope for the design-approval release

- Taking a real payment.
- Customer accounts.
- English translation.
- A CMS.
- Shipment purchasing or fulfillment automation.

The architecture must leave clean integration points for these later additions.

## 5. Inputs that must be resolved

These are dependencies, not implementation details to guess.

| Input | Needed by | Acceptance condition |
|---|---|---|
| Authoritative inventory and sold state | Phase 1 | Every work has one stable ID and owner-approved availability |
| Full-resolution, uncropped artwork files | Phase 2 | Hero, detail, texture, back/signature, and optional room-scale views mapped to each work |
| Artist-approved series statements and work notes | Phase 3 | At least one concrete series premise and one specific note per available work |
| Real Instagram/profile URL | Phase 3 | No generic `instagram.com` destination remains |
| Shipping, duties, returns, framing, condition, and damage policy | Phase 4 | Copy is approved for display before checkout |
| Demo-versus-live payment decision | Phase 4 | Demo mode is unmistakable; no real charge path exists in this release |
| Live provider/legal ownership | Live-commerce gate | Named owner approves Stripe/Mollie/Coinbase and required legal documents |

If an input is missing, use visibly labeled draft content in development. Do not
invent factual claims or ship placeholders.

## 6. Technical architecture

Migrate to Astro with fully static output.

```text
src/
├── content/
│   └── artworks/             # validated record per artwork
├── components/
│   ├── Nav.astro
│   ├── MobileMenu.astro
│   ├── Footer.astro
│   ├── ArtworkCard.astro
│   ├── ArtworkMedia.astro
│   ├── Lightbox.astro
│   ├── FilterBar.astro
│   ├── CartDrawer.astro
│   ├── CartLineItem.astro
│   ├── CheckoutForm.astro
│   └── Reveal.astro
├── layouts/
│   └── Base.astro
├── lib/
│   ├── cart.ts               # unique-work cart and persistence
│   ├── inventory.ts          # validation and availability rules
│   ├── checkout.ts           # demo adapter; future provider interface
│   └── format.ts
├── pages/
│   ├── index.astro
│   ├── boutique.astro
│   ├── oeuvre/[slug].astro
│   ├── a-propos.astro
│   ├── contact.astro
│   ├── panier.astro
│   ├── commande.astro
│   └── confirmation.astro
└── styles/
    ├── tokens.css
    ├── base.css
    └── components.css
```

Architecture rules:

- Content is rendered server-side/static-first; JavaScript enhances rather than
  reveals essential information.
- Cart state is a small client island persisted in versioned `localStorage`.
- A work may appear only once in the cart. Duplicate add attempts produce an
  accessible "pièce unique" notice without changing quantity.
- Sold or unknown inventory fails closed and cannot be added.
- Checkout uses an adapter interface. Only the explicit `demo` adapter is enabled
  until the live-commerce gate passes.
- Components, navigation, footer, metadata, and cart count are shared across every
  route rather than duplicated in page files.

## 7. Artwork data contract

Each artwork record must be schema-validated at build time. Required fields:

- Stable ID and slug.
- Title, series, and sort order.
- Price, currency, and availability: `available`, `sold`, or `not-for-sale`.
- Medium, year, width, height, optional depth, and unit.
- Full-work orientation and aspect ratio.
- Signature placement, condition, framing status, and certificate status.
- Concise card description, specific work note, and series statement reference.
- Main uncropped image, card crop, at least one detail image for available works,
  and optional back/signature/room-scale images.
- Alt text for every meaningful image.
- Featured/related-work metadata.

Build must fail for duplicate IDs/slugs, missing required fields, invalid prices,
unresolved image paths, or an available work without a faithful full-work image.

## 8. Design system requirements

### Typography

- Display: Clash Display 600/700 for hero, page titles, and artwork titles.
- Body/UI: Space Grotesk 400/500.
- Accent: Playfair Display Italic only for restrained editorial lines.
- Fonts must be self-hosted or have a documented resilient loading strategy so the
  brand does not collapse when third-party font CSS is blocked.
- Mobile microcopy must remain comfortably readable; avoid combining approximately
  11px text with extreme tracking for essential navigation, filters, or assurance.

### Color

- Core UI: Noir `#0A0A0A`, surface `#141414`, primary `#FAFAFA`, muted `#B8B8B8`,
  faint `#8A8A8A`, and line colors at 8%/16% white.
- Rose `#FF3366` is the only global UI accent. Text on a rose fill is Noir, not white.
- Series hues remain limited to a thin section rule and detail-page eyebrow unless
  expert review approves another use.
- All text and interactive states must meet WCAG 2.2 AA contrast requirements.

### Motion

- Reveal effects are gated by `html.js`; no JavaScript means full opacity.
- Initial enhanced state is never fully invisible: opacity starts at 0.25 or higher.
- Observed elements reveal once and are then unobserved.
- `prefers-reduced-motion` removes reveal, hover scale, smooth scrolling, and other
  nonessential motion while preserving content and state changes.
- No purchase, validation, or availability information depends on animation.

### Touch and focus

- Primary navigation, cart, filter, lightbox, and checkout controls provide at least
  a 44px comfortable touch target.
- Every interactive element has a visible keyboard focus state with more than a
  subtle one-pixel color change.
- Hover-only information is also exposed on focus and touch.

## 9. Page and interaction requirements

### Accueil

- Retain the approved monogram hero, atmosphere, artistic descriptor, and primary CTA.
- Use one large plus four supporting featured works, each linked to the correct work.
- Present the artist with one concrete process statement, not only market positioning.
- Use a balanced six-collection bento with no orphan card.
- Footer payment labels are informational or route to payment information; they must
  never open a checkout containing a work the visitor did not select.

### Boutique

- Include all authoritative series and works; preview-only sample notices are removed.
- Filters are real `<button aria-pressed>` controls. "Tout" resets the catalog.
- Add a commercially useful "Disponibles" filter and a live result count.
- Preserve selected filters in the URL so Back and shared links restore state.
- On mobile, use a scroll container with visible continuation cues or an equivalent
  accessible compact control. Do not hide overflow without indicating more options.
- Cards clearly distinguish sold state and always link to the matching artwork.
- Card imagery may be editorially cropped, but metadata and the linked detail page
  must present the full, accurate work.

### Artwork detail

- Main stage displays the full artwork with `object-fit: contain`; it must not crop.
- The stage is a real `<button>` with an accessible name and opens a modal lightbox.
- Lightbox supports keyboard, touch, close button, Escape, focus trap, focus return,
  next/previous media, and zoom appropriate to the available source resolution.
- Provide full-work, texture/detail, edge, signature/back, and room-scale views when
  available. Do not promise zoom when source resolution cannot support it.
- Content order: series premise, specific work note, specifications, price/state,
  actions, and trust/policy summary.
- Available work: Add to cart and Buy now. Sold work: Vendu state and relevant
  available alternatives, with no add action.
- Related cards use real artwork routes and never `href="#"`.

### A-propos and Contact

- Retain the approved monochrome artist hero and restrained use of the colored canvas.
- Replace generic claims with verified, concrete biography, process, inspirations,
  series development, and France/New York context.
- Keep the mystery by editing tightly, not by withholding all substance.
- A-propos includes an artist-approved pull quote, signature, medium/series/market
  facts, and a clear contact handoff.
- Contact exists as a separate route with press/gallery context, acquisition routing,
  mailto link, and real Instagram profile.

### Cart

- Cart drawer is available from every page and exposes count, work, price, remove,
  subtotal, and links to cart/checkout.
- Full cart page explains unique-work behavior, certificate, shipping summary, and
  what happens next.
- Empty-cart state has a useful return-to-works action.
- State is consistent across reloads and routes.

### Checkout and confirmation

- Checkout is a semantic `<form>` with named and required inputs, labels,
  autocomplete, country selection, appropriate region/address fields, inline errors,
  error summary, and retained values after correction.
- Payment methods are properly grouped radios with distinct values and descriptions.
- Demo submission has disabled/loading/success/failure states and revalidates cart
  and inventory before confirmation.
- The first mobile viewport starts with page title and progress context; the order
  summary is compact/collapsible rather than displacing the form by an entire screen.
- Confirmation repeats the selected work and clearly states that no payment was taken.
- Real provider branding is not used to imply a live integration before activation.

### Mobile navigation

- Below 900px, replace hidden desktop links with a visible menu button.
- Fullscreen menu contains Œuvres, L'Artiste, Contact, and cart.
- Implement `aria-expanded`, focus trap, Escape close, overlay close, body scroll lock,
  and focus return to the menu button.
- All primary routes remain reachable without relying on the footer.

## 10. Implementation phases and exit gates

### Phase 0 — Resolve inputs and freeze the acceptance baseline

Deliverables:

- Inventory/image audit with one row per work.
- Approved route map and data schema.
- Draft series/work copy clearly labeled for artist review.
- Baseline screenshots of the five approved visual references.
- Automated acceptance checklist committed to the repository.

Exit gate: no duplicate inventory identity; missing facts and media are explicitly
tracked; nobody treats preview placeholders as source-of-truth content.

### Phase 1 — Application, content, and test foundation

Deliverables:

- Astro static project, shared layout, design tokens, self-hosted/resilient fonts,
  content schema, generated routes, metadata helpers, and CI scripts.
- Tests for schema validation, route generation, internal links, and missing assets.

Exit gate: all required routes build; every artwork URL is unique and correct; build
fails on invalid content; no UI behavior is claimed yet.

### Phase 2 — Navigation, responsive system, and accessible primitives

Deliverables:

- Shared desktop/mobile navigation, footer, buttons, filters, dialogs, focus states,
  fail-visible reveals, and reduced-motion behavior.
- Responsive visual-regression baselines at 1440×900, 390×844, and 320×800.

Exit gate: every route is keyboard- and mobile-navigable; no content is hidden when
JavaScript is unavailable; no critical touch target is undersized.

### Phase 3 — Gallery, product truth, and storytelling

Deliverables:

- Accueil, full Boutique, every artwork detail page, A-propos, and Contact.
- Correct filters/URLs, faithful full-work imagery, accessible lightbox, approved
  series statements, specific work notes, and real related-work routes.

Exit gate: selecting any card always opens that work; available/sold state matches
the inventory; reviewers can distinguish major series and explain Carlay's process
without the experience becoming overexplained.

### Phase 4 — Cart and demo checkout

Deliverables:

- Versioned cart state, drawer, cart page, validated checkout, adapter-backed demo
  submission, confirmation, and all empty/error/loading/retry states.
- Purchase-policy summaries placed before commitment.

Exit gate: a visitor can find an available work, add it once, review it, correct
checkout errors, complete demo checkout, and reach accurate confirmation on desktop,
mobile, keyboard, and screen reader. No payment can be taken.

### Phase 5 — Performance, SEO, and reliability hardening

Deliverables:

- Responsive AVIF/WebP/JPEG assets, width/height attributes, below-fold lazy loading,
  prioritized LCP imagery, canonical URLs, descriptions, OG/Twitter cards, artwork
  structured data, sitemap, robots policy, favicon, and 404 page.
- Playwright journey tests, automated accessibility checks, link checks, and
  performance budgets in CI.

Exit gate: technical acceptance criteria in Section 11 pass on a production build.

### Phase 6 — Expert review and release candidate

Deliverables:

- Review package with deployed demo, route/content inventory, representative desktop
  and mobile screenshots, automated results, known limitations, and decision log.
- Findings triaged by severity and resolved or explicitly accepted by the owner.

Exit gate: every required expert gate in Section 12 is signed off; zero unresolved
blockers or high-severity findings remain.

## 11. Definition of done and measurable acceptance criteria

### Functional

- All required routes build statically and return the intended page.
- Every card and related-work link opens the correct artwork.
- Filters update visible results, count, `aria-pressed`, and shareable URL state.
- Mobile navigation reaches every primary route and satisfies its keyboard behavior.
- Lightbox works by mouse, keyboard, touch, and screen reader.
- Cart persists correctly, rejects duplicates, rejects sold/unknown works, and stays
  consistent across pages and reloads.
- Demo checkout validates, reports errors, preserves corrections, completes, and
  reaches confirmation containing the selected work.
- No dead links, placeholder destinations, false affordances, or silent no-op controls.

### Visual and content

- The approved Noir Gallery hierarchy and restrained color use survive implementation.
- Artwork detail never crops the full work; card crops do not imply false proportions.
- Available works include sufficient resolution and supporting views for inspection.
- Each series has an approved concrete premise; each available work has a specific note.
- Claims about location, market activity, certificate, shipping, condition, and
  payment are verified and owner-approved.
- Full footer and current year appear consistently on every page.

### Accessibility

- WCAG 2.2 AA is the target for content, interaction, states, and responsive behavior.
- Automated accessibility scan reports zero critical or serious violations on every
  representative route.
- Manual keyboard review passes navigation, filters, lightbox, cart, checkout, errors,
  and confirmation.
- Screen-reader review confirms names, roles, state changes, error association, modal
  behavior, and meaningful reading order.
- Layout remains usable at 200% zoom, 320px width, reduced motion, high contrast where
  supported, and with JavaScript disabled for essential content.

### Performance and SEO

- No delivered image variant exceeds 300KB without a documented, approved exception.
- All images have explicit dimensions; below-fold imagery is lazy loaded; the LCP
  image is not lazy loaded and is appropriately prioritized.
- Production Lighthouse targets on representative mobile and desktop routes:
  Performance ≥90; Accessibility ≥95; Best Practices ≥95; SEO ≥95.
- No console errors, failed local resources, duplicate titles/descriptions, missing
  canonicals, or broken structured-data references.

### Automated quality

- Unit tests cover content validation, availability rules, price formatting, and cart
  invariants.
- End-to-end tests cover browse/filter, correct artwork routing, sold state, add/remove,
  duplicate prevention, cart persistence, checkout validation, and confirmation.
- Visual regression covers all primary page types at desktop and mobile viewports.
- CI runs build, unit, end-to-end, accessibility, link, and asset-budget checks.

## 12. Expert approval gates

Passing means obtaining evidence from the right reviewers, not declaring the work
"expert quality" internally.

### Gate A — Art direction and brand

Reviewer: independent art director or senior digital designer with art/fashion/luxury
portfolio experience.

They approve:

- Visual hierarchy, typography, spacing, image treatment, mobile composition, and
  consistency across every route.
- That the noir treatment feels specific to Carlay rather than a generic luxury theme.
- That UI accents support rather than compete with the paintings.

Evidence: annotated review, before/after screenshots, and zero unresolved high-severity
visual findings.

### Gate B — Curatorial and art-commerce content

Reviewer: curator, gallery professional, art advisor, or experienced artist-commerce
editor, plus Carlay/owner approval for factual claims.

They approve:

- Series statements, individual work notes, biography, process, and artist voice.
- Balance between intrigue and concrete understanding.
- Product fidelity, terminology, provenance/condition/framing information, and buyer
  reassurance appropriate to €1,000–€3,000 original works.

Evidence: approved copy and image inventory with factual owner sign-off.

### Gate C — UX and commerce

Reviewer: senior product/UX designer with ecommerce checkout experience.

They review these tasks on desktop and mobile:

1. Identify the artist and medium from the first screen.
2. Find an available work in a chosen series.
3. Open the correct work and understand size, availability, and what is included.
4. Inspect full artwork and detail media.
5. Add the work, review the cart, correct checkout errors, and finish demo checkout.
6. Find shipping, duties, returns, damage, and contact information.

Evidence: expert heuristic review plus at least five representative usability sessions.
Critical-task completion target is at least 90%, with no repeated product-identity,
navigation, availability, or checkout misunderstanding.

### Gate D — Accessibility

Reviewer: accessibility specialist experienced with WCAG 2.2 and transactional flows.

They approve keyboard, screen-reader, contrast, zoom/reflow, reduced-motion, touch,
modal, form-error, and dynamic cart/filter announcements.

Evidence: manual audit report, automated results, and zero unresolved critical or
serious issues.

### Gate E — Frontend, performance, and SEO

Reviewers: senior frontend/performance engineer and technical SEO reviewer.

They approve architecture, static generation, content validation, asset delivery,
metadata, structured data, test coverage, failure handling, and production budgets.

Evidence: production-build report, CI results, Lighthouse reports, crawl/link report,
and zero unexplained console or network failures.

### Gate F — Owner release acceptance

Reviewer: Oliver/Carlay project owner.

They confirm:

- Inventory, prices, sold state, artwork images, biography, contact details, and
  policies are correct.
- Expert findings are resolved or explicitly accepted with documented rationale.
- Demo mode is appropriate for release and cannot charge real money.

## 13. Live-commerce activation gate

This gate is intentionally outside the demo implementation approval.

Before real payments are enabled:

- Select and configure production payment provider(s) using public/client-safe keys
  only in the frontend and server-side secrets only in approved infrastructure.
- Complete provider domain verification, webhook signature validation, idempotency,
  inventory reservation, duplicate-order prevention, refunds, failure recovery, and
  monitoring.
- Approve privacy, terms, returns/cancellation, shipping, duties/taxes, and legal
  identity content with appropriate professional review.
- Verify real prices/currency, tax behavior, fulfillment ownership, confirmation
  email, support process, analytics consent, and incident response.
- Run sandbox and limited production transaction tests with explicit owner approval.

No live-payment credential, customer financial data, or one-time code belongs in the
repository or in review artifacts.

## 14. Review operating rules

- Keep one severity-ranked issue log across all experts: Blocker, High, Medium, Low.
- Blockers and High findings must be fixed and retested before release-candidate sign-off.
- Medium findings require a fix or owner-accepted rationale with a follow-up owner/date.
- A fix is not closed by code review alone; reproduce the original scenario and attach
  the new evidence.
- Preserve separate evidence for desktop, mobile, keyboard, screen reader, automated
  tests, production build, and deployed demo. Each proves a different boundary.
- Do not change the approved art direction during implementation without recording the
  reason, affected routes/components, and owner decision.

## 15. Completion statement

The redesign is complete only when the production-built demo satisfies Section 11,
passes all expert gates in Section 12, and has owner-approved content and inventory.
The five preview pages and their Figma record remain visual references; they are not
the completion evidence.
