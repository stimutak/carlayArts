# CLAUDE.md — Carlay Art Website

## Project Overview

Website redesign for **Carlay Art**, a French contemporary artist specializing in abstract acrylic paintings. Active in France and New York. The design direction is "Noir Gallery" — dark, edgy, understated, and cool.

**Current site:** https://carlay-art.com
**Contact:** carlayart369@gmail.com
**Social:** Instagram

## The Artist

Carlay is an emerging French artist working in abstract acrylic on canvas. Her work is characterized by:
- Dynamic, gestural line work
- Rich, layered color palettes (purples, teals, pinks, golds)
- Mix of fluid organic forms and geometric backgrounds
- Energy and emotional intensity

She's active in France and New York art markets.

## Design Philosophy

- **Dark mode first** — black backgrounds (#0A0A0A), let the art be the light
- **Art is the color** — grayscale UI, vibrant artwork pops
- **Understated cool** — minimal UI, maximum impact
- **Typography as art** — bold, architectural, unapologetic
- **Subtle motion** — animations that match the art's energy

## Current Site Issues to Fix

1. "Galery" typo → "Gallery"
2. Basic WordPress/WooCommerce template feel
3. Typography lacks personality
4. Grid layouts too uniform
5. Minimal animations/interactions
6. Product pages functional but not immersive

## Tech Stack

**Current site:** WordPress + WooCommerce
**Redesign:** Static HTML/CSS/JS (vanilla) or Astro

- Styling: Custom CSS with design tokens
- Fonts: Space Grotesk (body), Clash Display (headings)
- E-commerce: See Payment Integration below

## Payment Integration

**See `PAYMENTS.md` for full documentation.**

### Providers
| Provider | Use Case | Methods |
|----------|----------|---------|
| **Mollie** | Europe (primary) | iDEAL, Bancontact, Cards, SEPA, Apple Pay |
| **Stripe** | Global fallback | Cards, Apple Pay, Google Pay, Link |
| **Coinbase Commerce** | Crypto | BTC, ETH, USDC, LTC |

### Philosophy
- **No direct artist contact** — purchases are transactional
- **Worldwide support** — any card, any country
- **Crypto-friendly** — for privacy-conscious collectors
- **Instant checkout** — minimal friction

## Project Structure

```
/
├── CLAUDE.md                 # This file
├── DESIGN_PROPOSAL.md        # Full design strategy
├── PAYMENTS.md               # Payment integration docs
├── index.html                # Homepage
├── original-site/            # Scraped reference site
│   ├── images/               # All artwork images (300+)
│   ├── screenshot-*.png      # Full page screenshots
│   ├── viewport-*.png        # Viewport screenshots
│   └── *.html                # Page HTML
├── src/
│   ├── css/
│   │   ├── tokens.css        # Design tokens
│   │   ├── base.css          # Reset, typography
│   │   └── components.css    # Components
│   └── assets/
│       └── images/           # Production images
└── scripts/
    └── scrape-site-standalone.js  # Site scraper
```

## Artwork Collections (Complete)

| Series | Works | Price | Notes |
|--------|-------|-------|-------|
| **Romeo** | 1, 2, 3 | €3,000 (€9,000 triptych) | SOLD OUT |
| **Juliette** | 1, 2, 3 | €3,000 | Mixed |
| **Vortex** | 1-9 | €1,000 | 32×32cm squares |
| **Purple Galaxy** | 2, 4, 5, 7, 8, 9 | €1,000 | Cosmic purples |
| **Insomnia** | 1-6 | €1,000 | Neon stripes on dark |
| **Free Spirit** | 1, 2, 3 | €1,000+ | — |
| **Sunday Morning** | 1, 2, 3 | €1,000+ | — |
| **Elastic** | 1, 2, 3 | €1,000+ | — |
| **Splatsh** | 1, 3 | €1,000 | Splatter style |
| **Blue Dreams** | — | €1,000 | — |
| **Humble** | — | €1,000 | — |
| **Positivity** | — | €1,000 | — |
| **Rainbow Tears** | — | €1,500 | — |
| **Golden Sunset** | 1, 2, 3 | €1,000 | Gold metallics |
| **Pink Dream** | — | €1,000 | — |
| **Purple Dream** | 1, 2 | €1,000 | — |
| **Sweet Life** | 1, 2, 3 | €1,000 | — |
| **Evolution** | 1, 2, 3 | €1,000 | — |
| **Cosmic** | 1, 2, 3 | €1,000 | — |
| **Silver Waves** | — | €1,000 | — |
| **Hope** | — | €1,000 | — |
| **Baby Blues** | — | €1,000 | — |

All works: Acrylic on canvas, certificate of authenticity included.

## Color Palette

```css
/* From artwork analysis */
--color-sky-blue: #87CEEB;      /* Romeo series */
--color-teal: #2DD4BF;          /* Vortex series */
--color-purple: #8B5CF6;        /* Galaxy series */
--color-magenta: #D946EF;       /* Purple Galaxy */
--color-hot-pink: #FF3366;      /* Accent lines */
--color-gold: #D4A574;          /* Metallic elements */
--color-coral: #FF6B6B;         /* Warm accents */
--color-neon-green: #4ADE80;    /* Insomnia series */

/* UI Colors */
--color-black: #0A0A0A;
--color-white: #FAFAFA;
--color-charcoal: #1A1A1A;
```

## Key Assets

| Asset | Path | Notes |
|-------|------|-------|
| Logo (white) | `original-site/images/logo-carlay-BLANC.png` | CA monogram |
| Artist photo | `original-site/images/Carlay-art.jpg` | B&W + color art, NYC skyline |
| Signature | `original-site/images/Carlay-art-signature.png` | Handwritten |

## Navigation (French)

```
CARLAY ART          A PROPOS    MES ŒUVRES    CONTACT    [user] [search] [cart]
```

## Key Components

### Navigation (`.nav`)
- Fixed, transparent → blur on scroll
- Mobile: hamburger with fullscreen overlay

### Artwork Card (`.artwork-card`)
- Hover: overlay with title, series, price
- "SOLD OUT" badge (red)
- Desaturated → full color on hover

### Hero Section (`.hero`)
- Full viewport, CA monogram
- Fade-up animations
- Grain texture overlay

### Buttons (`.btn`)
- `.btn--primary`: White → rose on hover
- `.btn--secondary`: Ghost with border
- `.btn--ghost`: Text + arrow

## Pages

- [x] Homepage — needs rebuild with real images
- [ ] Boutique (`/boutique`)
- [ ] Artwork detail (`/boutique/[slug]`)
- [ ] About (`/a-propos`)
- [ ] Contact (`/contact`)
- [ ] Cart (`/panier`)
- [ ] Account (`/mon-compte`)

## Commands

```bash
npm run dev          # Local server
npm run scrape       # Re-scrape original site
open index.html      # Quick preview
```

## Design Decisions

1. **Keep dark aesthetic** — working, needs polish
2. **Hero: Artist photo** — B&W + color art is perfect brand image
3. **Art as color** — UI stays neutral, art pops
4. **Editorial typography** — bold, confident
5. **Dynamic grids** — break uniformity
6. **Micro-interactions** — match art's energy
7. **French primary** — EN toggle future

## References

- Scraped site: `original-site/`
- Screenshots: `original-site/screenshot-*.png`
- All images: `original-site/images/`
- Inspiration: Gagosian, White Cube, Kinfolk aesthetics
