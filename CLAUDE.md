# CLAUDE.md — Carlay Art Website

## Project Overview

This is the website redesign for **Carlay Art**, a French contemporary artist specializing in acrylic paintings on canvas. The design direction is "Noir Gallery" — dark, edgy, understated, and cool.

**Live site (reference):** https://carlay-art.com
**Contact:** carlayart369@gmail.com

## Design Philosophy

- **Dark mode first** — black backgrounds (#0A0A0A), let the art be the light
- **Understated cool** — minimal UI, maximum impact
- **Typography as art** — bold, architectural, unapologetic
- **Anti-gallery gallery** — breaks the white cube convention
- **Subtle motion** — animations that reward attention, not distract

## Tech Stack

Currently: Static HTML/CSS/JS (vanilla)

Planned:
- Frontend: Astro or Next.js (static export)
- Styling: Custom CSS with design tokens (see `src/css/tokens.css`)
- Fonts: Space Grotesk (body), Clash Display (headings), Playfair Display (accent)
- E-commerce: TBD (Snipcart, Stripe, or Shopify integration)

## Project Structure

```
/
├── CLAUDE.md                 # This file
├── DESIGN_PROPOSAL.md        # Full design strategy document
├── index.html                # Homepage prototype
├── src/
│   ├── css/
│   │   ├── tokens.css        # Design tokens (colors, spacing, typography)
│   │   ├── base.css          # Reset, typography, utilities
│   │   └── components.css    # Nav, cards, buttons, footer, etc.
│   ├── js/                   # JavaScript (future)
│   └── assets/
│       ├── images/           # Artwork images (to be added)
│       └── fonts/            # Custom fonts (if self-hosted)
└── public/                   # Static assets for production
```

## Design Tokens

All design values are CSS custom properties in `src/css/tokens.css`:

```css
/* Primary colors */
--color-black: #0A0A0A;
--color-white: #FAFAFA;
--color-rose: #FF3366;      /* Accent/CTA */
--color-indigo: #6366F1;    /* Links */

/* Typography */
--font-display: 'Clash Display', 'Space Grotesk', sans-serif;
--font-body: 'Space Grotesk', system-ui, sans-serif;
--font-accent: 'Playfair Display', Georgia, serif;

/* Fluid type scale */
--text-hero: clamp(3.5rem, 1rem + 12vw, 10rem);
--text-2xl: clamp(2rem, 1rem + 4vw, 3.5rem);
/* ... see tokens.css for full scale */
```

## Artwork Collections

| Series | Works | Price | Size |
|--------|-------|-------|------|
| Romeo | 1, 2, 3 | €3,000 | Various |
| Juliette | 1, 2 | €3,000 | Various |
| Vortex | 5, 9 | €1,000 | 32×32cm |
| Purple Galaxy | 2, 7, 9 | €1,000 | 22×30cm |
| Splatsh | 3 | €1,000 | 20×25cm |
| Golden Sunset | — | €1,000 | — |
| Baby Blues | — | €1,000 | — |
| Pink Dreams | — | €1,000 | — |
| Rainbow Tears | — | €1,500 | — |

All works are acrylic on canvas with certificate of authenticity.

## Key Components

### Navigation (`.nav`)
- Fixed position, transparent initially
- Adds `.nav--scrolled` class on scroll (blur background)
- Mobile: hamburger menu with fullscreen overlay

### Artwork Card (`.artwork-card`)
- Hover reveals overlay with title, series, price
- Image transitions from slightly desaturated to full color
- `.artwork-card__badge` for "Sold" status

### Hero Section (`.hero`)
- Full viewport height
- Fade-up entrance animations
- Subtle grain texture overlay
- Scroll indicator at bottom

### Buttons (`.btn`)
- `.btn--primary`: White bg, inverts to rose on hover
- `.btn--secondary`: Ghost with border
- `.btn--ghost`: Text only with arrow

## Conventions

### CSS
- Use design tokens from `tokens.css` — never hardcode colors/spacing
- Mobile-first responsive design
- Use `clamp()` for fluid typography
- BEM-ish naming: `.component__element--modifier`
- Transitions use `--duration-*` and `--ease-*` tokens

### HTML
- Semantic elements (`<article>`, `<section>`, `<nav>`)
- Accessibility: proper ARIA labels, focus states, reduced motion support
- French language (`lang="fr"`) with potential EN toggle

### JavaScript
- Vanilla JS preferred for simplicity
- Intersection Observer for scroll animations
- No jQuery

### Images
- Artwork images should be high-res originals
- Use `aspect-ratio` for consistent layouts
- Lazy loading for gallery pages
- WebP format with fallbacks

## Commands

```bash
# Development (just open in browser for now)
open index.html

# Future: If using a build tool
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Pages to Build

- [x] Homepage (`index.html`)
- [ ] Collections overview (`/collections`)
- [ ] Individual collection pages (`/collections/romeo`, etc.)
- [ ] Artwork detail page (`/artwork/[slug]`)
- [ ] About page (`/about`)
- [ ] Contact page (`/contact`)
- [ ] Cart/Checkout (`/cart`)

## Notes for Development

1. **Images needed**: All artwork photography from the artist
2. **Bio needed**: Artist story and process for About page
3. **Language**: Currently French-first, may add EN toggle
4. **E-commerce**: Need to decide on payment provider
5. **Hosting**: Recommend Vercel or Netlify for static hosting

## References

- Design proposal: `DESIGN_PROPOSAL.md`
- Original site: https://carlay-art.com
- Inspiration: Gagosian, White Cube, Kinfolk Magazine aesthetics
