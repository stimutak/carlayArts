# Noir Gallery v2 — Design Spec

**Date:** 2026-08-05
**Status:** Approved by Oliver (previews reviewed in browser + Figma)
**Previews:** `previews/` (served at `/previews/` by `npm run dev`)
**Figma record:** https://www.figma.com/design/E9RTsRpBfwwk94SiOBp3o2

## Goal

Complete the Carlay Art redesign: keep the Noir Gallery direction, fix its
execution flaws, and build the missing 60% of the user journey — artwork
detail, about, contact, and a working cart/checkout — by migrating to Astro.

## Audit findings this spec addresses

1. Purchase flow dead-ends in a JS `alert()`; Snipcart referenced but never configured.
2. No artwork detail pages; cards are not clickable.
3. Dead links: `/a-propos`, `/livraison`, `/mentions-legales`; Instagram points at generic instagram.com.
4. Scroll-reveals render sections invisible during normal scrolling.
5. Headings fall back to Space Grotesk (Clash Display never loaded) — soft, not architectural.
6. Inconsistent nav (cart icon only on boutique), © 2024, orphan card in collections grid (3+1).
7. Low-contrast body gray; desaturated-until-hover art stays dim on touch devices.

## Architecture — Astro migration

```
src/
├── content/artworks/        # one JSON entry per artwork (~40): title, series,
│   └── romeo-1.json         # price, size cm, year, image, sold, description
├── components/              # Nav, Footer, ArtworkCard, CartDrawer, Reveal
├── layouts/Base.astro       # fonts, tokens, grain overlay, meta, OG tags
├── pages/
│   ├── index.astro
│   ├── boutique.astro       # all 22 series, sections per series
│   ├── oeuvre/[slug].astro  # static page per artwork at build time
│   ├── a-propos.astro
│   ├── contact.astro        # minimal: mailto + Instagram (no form)
│   ├── panier.astro
│   ├── commande.astro       # checkout
│   └── confirmation.astro   # demo-mode confirmation
└── styles/                  # tokens.css / base.css / components.css (carried over)
```

- **Content collections** give every artwork a real URL (`/oeuvre/romeo-1`) — SEO + shareability.
- **Fully static output.** No server. Images run through Astro's asset pipeline
  (current site serves original multi-MB scans).
- **Cart is an island**: small vanilla JS module + localStorage, hydrated on every page.
- **Checkout provider adapter**: `demo` mode now (full flow, styled confirmation with a
  visible "mode démonstration" notice), `stripe` / `mollie` / `coinbase` slots activate
  later via keys — UI unchanged. Aligns with PAYMENTS.md multi-provider strategy.
- Cart rules: originals are unique — adding a work twice is a no-op with a
  "pièce unique" toast; sold works cannot be added.

## Design system (v2 changes)

**Typography.**
- Display: **Clash Display 600/700** via Fontshare (free commercial license) —
  headings, artwork titles, hero. `letter-spacing: -0.02em`, sentence case for titles,
  uppercase reserved for small labels/eyebrows. (Figma stand-in: Schibsted Grotesk.)
- Body/UI: Space Grotesk 400/500. Accent: Playfair Display Italic (French accent lines only).

**Color.**
- UI stays grayscale: `#0A0A0A` noir, `#141414` surface, `#FAFAFA` text,
  `#B8B8B8` muted (AA on noir), `#8A8A8A` faint, `rgba(255,255,255,.08/.16)` lines.
- One UI accent: rose `#FF3366` (CTAs, active states, VENDU). Text sitting ON a rose
  fill is always noir `#0A0A0A` (5.58:1, AA) — never white (3.40:1, fails AA at UI sizes).
- **Signature: series accents** — each series owns a hue sampled from its paintings,
  used ONLY as a 2px rule under series headers + series eyebrow on detail pages:
  Romeo `#87CEEB` · Vortex `#2DD4BF` · Purple Galaxy `#8B5CF6` · Insomnia `#4ADE80` ·
  Golden Sunset `#D4A574` · Sweet Life `#D946EF`. (Series without an assigned hue
  default to the neutral line color until sampled.)

**Motion — fail-visible reveals.**
- The dimmed initial state is JS-gated: an inline script adds `class="js"` to `<html>`,
  and only `html.js .reveal` is dimmed. **No JS (or failed JS) = everything fully
  visible.** This is a hard requirement, not an implementation detail.
- `.reveal`: opacity 0.25 → 1, translateY 16px → 0, 500ms ease-out.
- IntersectionObserver `rootMargin: 0 0 -8% 0`; elements already in viewport on load
  reveal immediately; observers unobserve after firing (reveal once).
- Desaturation capped at `saturate(0.85)`, disabled on `(hover: none)` devices.
- `prefers-reduced-motion`: kills ALL transitions and animations (including card
  hover scale), full opacity.

**Components.**
- Nav (all pages): logo left; **three links — Œuvres → `/boutique`, L'Artiste →
  `/a-propos`, Contact → `/contact`** (no separate "Boutique" item; Œuvres IS the
  boutique); cart pill with count right; transparent → blur on scroll; active link in
  rose (`aria-current="page"` only when the destination is the current page).
  Nav height is the shared token `--nav-h`, consumed by anything sticky beneath it.
- Mobile nav (<900px): hamburger → fullscreen overlay (per CLAUDE.md), links + cart,
  focus-trapped, Esc/overlay-tap to close.
- Artwork card: media (hover: saturate + scale 1.03), body row (title + size left,
  price right), VENDU badge (rose outline chip, top-left) + struck price.
- Buttons: primary (white → rose on hover), ghost (hairline border), disabled (surface).
- Footer: logo + Playfair tagline, Collections / Info / Paiements columns,
  current year, real Instagram URL (get from artist), no links to nonexistent pages.

## Pages

- **Accueil**: hero (CA monogram, starfield/gradient atmosphere, Playfair accent line,
  primary CTA) → Œuvres sélectionnées (1 large + 4 grid) → L'Artiste band (bio + NYC
  photo + signature) → Collections bento on a 12-col grid (2 wide + 4 standard — no
  orphans) + "Voir les 22 séries" → Acquérir band → footer.
- **Boutique**: header band, sticky filter chips (offset by `--nav-h`), per-series
  sections with accent rule + count, cards link to detail pages. **Chips are
  `<button aria-pressed>` elements that filter series sections client-side** ("Tout"
  resets); with JS unavailable all sections simply remain visible.
- **Œuvre `/oeuvre/[slug]`** ("viewing room"): left stage (artwork on soft-lit surface;
  the stage is a `<button>` opening a full-screen lightbox with zoom — keyboard and
  touch accessible); right sticky info column (series eyebrow in
  accent color, title, description, specs table, price, AJOUTER AU PANIER + ACHETER
  MAINTENANT, certificate/shipping/payment reassurance); "Plus de la série X" (3 related).
  Sold works keep pages: VENDU state, no cart CTA, link to similar works.
- **A-propos**: full-bleed artist photo hero (gradient scrim, CARLAY display title,
  "Paris · New York" accent) → editorial bio with rose-bar pull quote → signature →
  3 facts row (Médium / Séries / Marchés) → contact band (Presse & galeries; purchases
  route to boutique; mailto + Instagram).
- **Contact**: same content as the contact band, standalone page for the nav link.
- **Panier**: cart page — line items (thumb, title, series, size, remove), totals,
  "certificat inclus" note, CTA to commande. CartDrawer is the slide-in sibling on
  all pages.
- **Commande**: shipping form (autocomplete attributes), payment method selector
  (Carte via Stripe/Mollie · iDEAL/Bancontact via Mollie · Crypto via Coinbase),
  sticky order summary, demo-mode notice, Payer button → confirmation page.

## Data & copy decisions

- **Inventory source of truth**: the artwork JSON collection is seeded from the
  current `boutique.html` sold states (all Romeo/Juliette SOLD; Vortex 1 & 5 available,
  rest of Vortex SOLD; all Insomnia available; etc.). Preview sample data matches this.
- **Price format**: keep `€3,000` (symbol-first, comma separator) for parity with the
  current site — an explicit decision, not an oversight of the French "3 000 €" form.
- **Instagram URL**: placeholder `https://instagram.com` is marked `data-todo` in
  previews; the artist's real profile URL must be obtained before launch.
- **Footer**: the full columned footer is a shared component on ALL pages (subpage
  previews show only the bottom bar as shorthand).

## Out of scope (this phase)

- Real payment processing (needs API keys) — adapter ships in demo mode.
- EN translation (FR only; structure should not block a future toggle).
- Account page (`/mon-compte`), livraison & mentions légales content pages
  (footer/nav must not link to them until they exist).
- CMS — artworks are JSON files in the repo.

## Acceptance criteria

1. All 8 routes build statically via Astro (index, boutique, oeuvre/[slug], a-propos,
   contact, panier, commande, confirmation); every artwork in the JSON collection gets
   a working `/oeuvre/[slug]` page.
2. Lighthouse: no images served over 300KB; headings render in Clash Display.
3. Scrolling any page at normal speed never shows a fully invisible section —
   **including with JavaScript disabled**.
4. Cart: add → drawer updates on every page; duplicate add no-ops with toast; sold
   works not addable; checkout completes in demo mode and ends on confirmation page.
5. No dead links anywhere; nav identical on all pages; © year current.
6. `prefers-reduced-motion` and keyboard focus states respected.
7. Existing pages' content parity: nothing from the current index/boutique is lost.
8. All text meets WCAG AA in every state (default, hover, active, pressed) —
   including text on rose fills (noir, never white).
