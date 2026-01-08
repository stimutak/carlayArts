# CARLAY ART — Website Redesign Proposal

## The Vibe
> *"Understated rebellion. Quiet confidence. The kind of cool that doesn't try."*

---

## Current Site Analysis

### Existing Collections (discovered via search indexing)
| Series | Price Point | Medium |
|--------|-------------|--------|
| **Romeo** (1, 2, 3) | €3,000 | Acrylic on canvas |
| **Juliette** (1, 2) | €3,000 | Acrylic on canvas |
| **Vortex** (5, 9) | €1,000 | Acrylic, 32×32cm |
| **Purple Galaxy** (2, 7, 9) | €1,000 | Acrylic, 22×30cm |
| **Splatsh** (3) | €1,000 | Acrylic, 20×25cm |
| **Golden Sunset** | €1,000 | Acrylic |
| **Baby Blues** | €1,000 | Acrylic |
| **Pink Dreams** | €1,000 | Acrylic |
| **Rainbow Tears** | €1,500 | Acrylic |

**Contact:** carlayart369@gmail.com
**Social:** Instagram
**Language:** French (primary)

---

## Design Direction: "NOIR GALLERY"

### Aesthetic Philosophy
- **Anti-gallery gallery** — breaks the white cube convention
- **Dark mode first** — dramatic, cinematic, lets the art glow
- **Minimal UI, maximum impact** — the art is the interface
- **Subtle motion** — understated animations that reward attention
- **Typography as art** — bold, architectural, unapologetic

---

## Color Palette

```
PRIMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#0A0A0A   Deep Black (background)
#FAFAFA   Off-White (text, contrast)
#1A1A1A   Charcoal (cards, surfaces)

ACCENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#FF3366   Electric Rose (CTAs, highlights)
#6366F1   Indigo Pulse (links, interactive)

ATMOSPHERIC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
rgba(255,255,255,0.05)   Ghost White (borders, dividers)
rgba(255,51,102,0.1)     Rose Glow (hover states)
```

---

## Typography

### Primary: **Space Grotesk**
- Geometric, modern, readable
- Weights: 400 (body), 500 (emphasis), 700 (headings)
- Used for: Navigation, body text, UI elements

### Display: **Clash Display** or **PP Neue Montreal**
- Bold, architectural, editorial
- Used for: Hero text, artwork titles, statements
- Style: ALL CAPS for maximum impact

### Alternative Display: **Playfair Display**
- Elegant serif contrast
- Used sparingly for French artistic heritage nod

```css
/* Typography Scale */
--text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
--text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
--text-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
--text-lg: clamp(1.25rem, 1rem + 1.25vw, 1.5rem);
--text-xl: clamp(1.5rem, 1rem + 2.5vw, 2.5rem);
--text-2xl: clamp(2rem, 1rem + 5vw, 4rem);
--text-hero: clamp(3rem, 1rem + 10vw, 8rem);
```

---

## Site Architecture

```
/
├── index.html              # Hero landing + featured works
├── /collections            # All series overview
│   ├── /romeo
│   ├── /juliette
│   ├── /vortex
│   ├── /purple-galaxy
│   ├── /splatsh
│   └── /other-works
├── /artwork/[slug]         # Individual artwork pages
├── /about                  # Artist story, process, philosophy
├── /contact                # Minimal contact form + links
└── /cart                   # Shopping cart / checkout
```

---

## Page Designs

### 1. HOMEPAGE — "The Gallery Entrance"

```
┌─────────────────────────────────────────────────────────────┐
│  CARLAY                                    [≡]              │
│                                                              │
│                                                              │
│                                                              │
│              C A R L A Y                                     │
│              ─────────────                                   │
│              ART                                             │
│                                                              │
│              French Contemporary                             │
│              Acrylic on Canvas                               │
│                                                              │
│                        ↓                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│    │              │  │              │  │              │     │
│    │   ROMEO      │  │   VORTEX     │  │   PURPLE     │     │
│    │              │  │              │  │   GALAXY     │     │
│    │   €3,000     │  │   €1,000     │  │              │     │
│    └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│                   [ ENTER GALLERY ]                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Full-viewport hero with subtle grain texture overlay
- Dramatic entrance animation (fade from black)
- Floating navigation that appears on scroll
- Featured works in asymmetric grid
- Cursor transforms to custom design over artwork

### 2. COLLECTION PAGE — "The Exhibition Room"

```
┌─────────────────────────────────────────────────────────────┐
│  CARLAY          COLLECTIONS   ABOUT   CONTACT         [≡]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ROMEO SERIES                                                │
│  ═══════════════                                             │
│                                                              │
│  Passion in motion. Each piece a whisper                     │
│  of something unspoken.                                      │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │              [ ARTWORK IMAGE ]                       │    │
│  │                                                      │    │
│  │   ROMEO 1                              €3,000  →    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │     ROMEO 2       │  │     ROMEO 3       │               │
│  │     €3,000        │  │     €3,000        │               │
│  └───────────────────┘  └───────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Large hero image for featured collection piece
- Masonry/bento grid for remaining pieces
- Smooth scroll-triggered reveals
- Quick-view overlay on hover
- Filter by: Price, Size, Availability

### 3. ARTWORK PAGE — "The Viewing Room"

```
┌─────────────────────────────────────────────────────────────┐
│  ← BACK                                              [≡]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────┐  VORTEX 5          │
│  │                                      │  ═════════         │
│  │                                      │                    │
│  │                                      │  Acrylic on Canvas │
│  │         [ ARTWORK IMAGE ]           │  32 × 32 cm        │
│  │                                      │  2024               │
│  │                                      │                    │
│  │                                      │  €1,000            │
│  │                                      │                    │
│  └─────────────────────────────────────┘  [ ADD TO CART ]   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  Certificate of Authenticity included                        │
│  Free shipping within EU                                     │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  MORE FROM VORTEX                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ VORTEX 9 │  │ VORTEX 3 │  │ VORTEX 7 │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Image zoom on hover/click
- Gallery lightbox for multiple views
- Sticky product info sidebar
- Related works carousel
- Social share + save functionality

### 4. ABOUT PAGE — "The Artist"

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                    ┌──────────────┐                          │
│                    │              │                          │
│                    │   ARTIST     │                          │
│                    │   PORTRAIT   │                          │
│                    │              │                          │
│                    └──────────────┘                          │
│                                                              │
│                       CARLAY                                 │
│                    French Artist                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  " Art is the lie that enables us to                         │
│    realize the truth. "                                      │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  [BIO TEXT]                                                  │
│                                                              │
│  PROCESS                           EXHIBITIONS               │
│  ──────────                        ────────────              │
│  Working with acrylic...           2024 — Paris              │
│                                    2023 — Lyon               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Interactions & Micro-animations

### Cursor
- Default: Small dot with trailing circle
- Over artwork: Expands + "VIEW" text appears
- Over buttons: Magnetic pull effect

### Scroll Effects
- Parallax on hero images (subtle, 0.5 speed)
- Fade-up reveals for content sections
- Progress indicator on long pages

### Hover States
- Artwork cards: Slight scale (1.02) + shadow lift
- Image reveal: Desaturated → full color
- Price reveal: Slides in from right

### Page Transitions
- Fade to black between pages
- Content slides up from bottom
- Duration: 400-600ms, ease-out

### Loading States
- Skeleton screens for images
- Spinner: Rotating line, not circle
- "CARLAY" text shimmer effect

---

## Technical Stack (Recommended)

### Option A: Static + Headless (Performance First)
```
Frontend:      Astro or Next.js (Static Export)
Styling:       Tailwind CSS + custom design tokens
Animations:    Framer Motion or GSAP
CMS:           Sanity.io or Contentful
E-commerce:    Snipcart or Shopify Buy SDK
Hosting:       Vercel or Netlify
```

### Option B: Full E-commerce (Feature Rich)
```
Platform:      Shopify + custom theme
Styling:       Liquid + Tailwind
Animations:    GSAP
Hosting:       Shopify
```

### Option C: Simple & Fast (MVP)
```
Frontend:      Plain HTML/CSS/JS
Styling:       Custom CSS with CSS variables
Animations:    CSS transitions + vanilla JS
E-commerce:    Stripe Payment Links
Hosting:       Netlify
```

---

## Mobile Experience

```
┌─────────────────────┐
│  CARLAY         [≡] │
├─────────────────────┤
│                     │
│                     │
│    C A R L A Y      │
│    ───────────      │
│    ART              │
│                     │
│    French           │
│    Contemporary     │
│                     │
│         ↓           │
│                     │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │                 │ │
│ │   FEATURED      │ │
│ │                 │ │
│ │   ROMEO 1       │ │
│ │   €3,000        │ │
│ └─────────────────┘ │
│                     │
│ ┌───────┐ ┌───────┐ │
│ │VORTEX │ │GALAXY │ │
│ └───────┘ └───────┘ │
│                     │
└─────────────────────┘
```

**Mobile-First Principles:**
- Thumb-friendly tap targets (min 44px)
- Bottom navigation for key actions
- Swipe gestures for gallery navigation
- Reduced motion option respected
- Fast image loading with blur-up

---

## Assets Needed

### From Current Site (to reproduce)
- [ ] All artwork images (high-res)
- [ ] Artist portrait/headshot
- [ ] Logo/wordmark (if exists)
- [ ] Any existing icons or graphics

### To Create
- [ ] Custom wordmark: "CARLAY" in display font
- [ ] Favicon set (all sizes)
- [ ] Open Graph images for social
- [ ] Loading animations
- [ ] Icon set (cart, menu, arrow, etc.)

---

## Implementation Phases

### Phase 1: Foundation
- Set up project structure
- Implement design tokens (colors, typography, spacing)
- Create base components (buttons, cards, navigation)
- Build responsive layout system

### Phase 2: Core Pages
- Homepage with hero and featured works
- Collection listing page
- Individual artwork page
- About page

### Phase 3: E-commerce
- Shopping cart functionality
- Checkout flow
- Payment integration
- Order confirmation

### Phase 4: Polish
- Animations and transitions
- Performance optimization
- SEO setup
- Analytics integration

---

## Mood References

**Visual Direction:**
- Minimal editorial layouts (Kinfolk, Cereal Magazine)
- Dark mode art galleries (Gagosian, White Cube websites)
- Typography-forward design (Bloomberg, NY Times Style)
- French contemporary aesthetic (subtle, sophisticated)

**The Feel:**
- Walking into a gallery at night
- The hush before a concert
- Black turtleneck energy
- Coffee, not cocktails
- "I know what I like"

---

## Questions for You

1. **Language:** French only, or bilingual (FR/EN)?
2. **E-commerce:** Keep current pricing structure?
3. **Artist bio:** Do you have the story/copy?
4. **Images:** Can you provide high-res artwork photos?
5. **Domain:** Keeping carlay-art.com?
6. **Urgency:** MVP timeline or full build?

---

*Proposal prepared for Carlay Art redesign project*
*Ready to build something cool.*
