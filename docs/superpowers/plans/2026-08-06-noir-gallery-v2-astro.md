# SUPERSEDED — DO NOT EXECUTE

This draft predates the evidence-backed inventory audit and fail-closed commerce
rules. It remains only as historical context. The current implementation authority is:

1. `docs/superpowers/specs/2026-08-05-noir-gallery-v2-design.md`
2. `docs/foundation-status.md`
3. `docs/audits/2026-08-06-artwork-inventory-review.md`
4. `data/artwork-inventory.authoritative-candidate.json` as candidate evidence only,
   never owner approval

Do not follow this draft's source-of-truth, verbatim-copy, payment, inventory, or
media instructions.

# Noir Gallery v2 — Astro Implementation Plan (historical draft)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate carlay-art to Astro with the approved Noir Gallery v2 design: 8 static routes, per-artwork pages from a JSON content collection, working localStorage cart, and a demo-mode checkout adapter.

**Architecture:** Fully static Astro 5 site at the repo root (`src/pages` → `dist/`). One JSON entry per artwork (extracted from the current `boutique.html`, which is the inventory source of truth) drives `oeuvre/[slug]` pages, the boutique, and the homepage grids. The cart is a small vanilla-JS island (localStorage + `cart:change` events); checkout goes through a provider adapter that ships in `demo` mode. The committed `previews/*.html` + `previews/preview.css` are the pixel reference — pages port their markup, links rewritten to real routes.

**Tech Stack:** Astro ^5 (static output, `astro:assets`, content collections with glob loader), vanilla JS (no framework islands), Vitest + jsdom for unit tests, Node ≥ 20 (repo has v25).

## Global Constraints (from the spec — apply to every task)

- Design reference: `previews/preview.css` is the canonical token set. Colors: noir `#0A0A0A`, surface `#141414`, text `#FAFAFA`, muted `#B8B8B8`, faint `#8A8A8A`, rose `#FF3366`. Series accents: romeo `#87CEEB`, vortex `#2DD4BF`, purple-galaxy `#8B5CF6`, insomnia `#4ADE80`, golden-sunset `#D4A574`, sweet-life `#D946EF`.
- Text on a rose fill is ALWAYS noir, never white (WCAG AA).
- Fonts: Clash Display 600/700 via `https://api.fontshare.com/v2/css?f[]=clash-display@600,700&display=swap`; Space Grotesk 400/500/600 + Playfair Display Italic via Google Fonts.
- Reveal dimming is JS-gated: only `html.js .reveal` is ever dimmed. An inline `<script>document.documentElement.classList.add('js')</script>` in `<head>` is the gate. No JS ⇒ fully visible.
- `prefers-reduced-motion: reduce` kills ALL transitions/animations.
- Image desaturation capped at `saturate(0.85)`, disabled under `@media (hover: none)`.
- Nav (all pages): logo left; links Œuvres→`/boutique`, L'Artiste→`/a-propos`, Contact→`/contact`; cart pill right. `aria-current="page"` only on the actual current page. Shared height token `--nav-h: 4.4rem`. Mobile <900px: hamburger → fullscreen overlay.
- Price format: `€3,000` (symbol first, comma separator) — deliberate parity with current site.
- French copy throughout; understated tone. Footer year 2026. Instagram placeholder keeps `data-todo="replace with artist profile URL"`.
- Sold works: VENDU badge, struck price, not addable to cart, detail page stays live without cart CTA.
- Cart: originals unique — duplicate add is a no-op with reason; sold add refused.
- No dead links anywhere: never link `/livraison`, `/mentions-legales`, `/mon-compte`.
- All git commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## File Structure

```
astro.config.mjs                     # Astro config (static, site URL)
vitest.config.mjs                    # test config
package.json                        # MODIFY: astro/vitest deps + scripts
scripts/extract-artworks.mjs         # boutique.html → JSON + image copies
src/
├── content.config.ts                # artworks collection schema (glob loader)
├── content/artworks/<slug>.json     # ~44 generated entries (committed)
├── assets/artworks/<file>.jpg       # copied 680x680 artwork images (committed)
├── assets/site/                     # logo, signature, artist photos (copied)
├── lib/series.js                    # accent map, price/title formatting
├── scripts/cart.js                  # cart store (localStorage + events)
├── scripts/checkout.js              # provider adapter (demo mode)
├── styles/tokens.css                # ported from previews/preview.css (split)
├── styles/base.css
├── styles/components.css
├── layouts/Base.astro               # head, fonts, js-gate, grain, reveal script
├── components/Nav.astro             # + mobile overlay
├── components/Footer.astro          # full columned footer (all pages)
├── components/CartDrawer.astro
├── components/ArtworkCard.astro
└── pages/
    ├── index.astro
    ├── boutique.astro
    ├── oeuvre/[slug].astro
    ├── a-propos.astro
    ├── contact.astro
    ├── panier.astro
    ├── commande.astro
    └── confirmation.astro
tests/
├── artworks-data.test.js            # generated JSON sanity
├── series.test.js
├── cart.test.js
├── checkout.test.js
└── dist.test.js                     # post-build: links resolve, image sizes
```

Legacy `index.html`, `boutique.html`, `previews/`, `original-site/` stay untouched at the root (reference + parity check). Astro ignores them.

---

### Task 1: Astro scaffold, ported styles, Base layout

**Files:**
- Modify: `package.json`
- Create: `astro.config.mjs`, `vitest.config.mjs`, `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components.css`, `src/layouts/Base.astro`, `src/pages/index.astro` (temporary stub, replaced in Task 8), `public/favicon.svg`

**Interfaces:**
- Produces: `Base.astro` with props `{ title: string, description?: string, currentPath: string }` and a default slot. All later pages wrap themselves in it. CSS classes from `previews/preview.css` available globally.

- [ ] **Step 1: Install dependencies and scripts**

```bash
npm install --save-dev astro@^5 vitest@^3 jsdom@^26
```

Then edit `package.json` scripts to:

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "test": "vitest run --exclude tests/dist.test.js",
  "test:dist": "vitest run tests/dist.test.js",
  "extract": "node scripts/extract-artworks.mjs",
  "dev:legacy": "npx serve .",
  "scrape": "node scripts/scrape-site-standalone.js"
}
```

- [ ] **Step 2: Create `astro.config.mjs` and `vitest.config.mjs`**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://carlay-art.com',
});
```

```js
// vitest.config.mjs
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/**/*.test.js'] },
});
```

- [ ] **Step 3: Port the stylesheet**

Split `previews/preview.css` into three files, contents copied verbatim except as noted:

- `src/styles/tokens.css`: the two `@import url(...)` font lines, the `:root { ... }` block, and the `.sr-only` utility.
- `src/styles/base.css`: `*` reset through the grain `body::after` block, plus the reveal blocks (`html.js .reveal`, `html.js .reveal.is-in`, the `@media (prefers-reduced-motion: reduce)` block).
- `src/styles/components.css`: everything else (`.nav`, type utilities, `.btn`, sections, `.series-head`, `.card`, grids, `.footer`, media queries).

One addition at the end of `components.css` — the mobile nav overlay (new in production, spec'd but not in previews):

```css
/* ---------- mobile nav ---------- */
.nav__burger {
  display: none;
  background: none;
  border: 0;
  color: var(--text);
  cursor: pointer;
  padding: 0.5rem;
}
.nav__burger svg { display: block; }
@media (max-width: 900px) {
  .nav__links { display: none; }
  .nav__burger { display: block; }
}
.mobile-menu {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2.2rem;
  background: color-mix(in srgb, var(--noir) 94%, transparent);
  backdrop-filter: blur(18px);
}
.mobile-menu.is-open { display: flex; }
.mobile-menu a {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-xl);
  color: var(--text);
}
.mobile-menu__close {
  position: absolute;
  top: 1.2rem;
  right: 1.4rem;
  background: none;
  border: 0;
  color: var(--muted);
  font-size: 2rem;
  cursor: pointer;
  padding: 0.5rem;
}
```

- [ ] **Step 4: Create `src/layouts/Base.astro`**

```astro
---
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/components.css';

interface Props { title: string; description?: string; currentPath: string; }
const { title, description = "Carlay Art — Artiste contemporaine française. Peintures acryliques sur toile. Œuvres originales.", currentPath } = Astro.props;
---
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <script is:inline>document.documentElement.classList.add('js')</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content={description} />
  <title>{title}</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</head>
<body>
  <slot />
  <script>
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
      else io.observe(el);
    });
  </script>
</body>
</html>
```

(Nav/Footer/CartDrawer are added inside pages via components in Task 6 — the layout stays chrome-free so `currentPath` flows to `Nav` explicitly.)

- [ ] **Step 5: Stub `src/pages/index.astro` and favicon**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="CARLAY ART — Artiste Contemporaine Française" currentPath="/">
  <h1 class="sr-only">Carlay Art</h1>
  <p style="padding:6rem 2rem; color: var(--muted);">Scaffold OK — replaced in Task 8.</p>
</Base>
```

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#0A0A0A"/><text x="50" y="66" font-family="Georgia,serif" font-size="46" fill="#FAFAFA" text-anchor="middle">CA</text></svg>
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: `dist/index.html` exists, build exits 0. Then `npm run dev` and load `http://localhost:4321/` — black page, stub text, no console errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json astro.config.mjs vitest.config.mjs src public
git commit -m "feat: Astro scaffold with Noir Gallery v2 styles and base layout"
```

---

### Task 2: Artwork extraction script + data

**Files:**
- Create: `scripts/extract-artworks.mjs`, `src/content/artworks/*.json` (generated, committed), `src/assets/artworks/*` (copied, committed), `src/assets/site/` (logo, signature, photos), `tests/artworks-data.test.js`

**Interfaces:**
- Consumes: root `boutique.html` (inventory source of truth), `original-site/images/`.
- Produces: one JSON per artwork with exact shape `{ slug: string, title: string, series: string, seriesSlug: string, price: number, size: string, sold: boolean, image: string, year: number|null, description: string }` where `image` is a bare filename existing in `src/assets/artworks/`.

- [ ] **Step 1: Write the failing test**

`tests/artworks-data.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/content/artworks';
const IMG = 'src/assets/artworks';

describe('generated artwork data', () => {
  it('has at least 40 entries, all valid', () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThanOrEqual(40);
    for (const f of files) {
      const a = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
      expect(a.slug).toBe(f.replace('.json', ''));
      expect(typeof a.title).toBe('string');
      expect(a.title).not.toMatch(/[A-Z]{3,}/); // title-cased, not SHOUTED
      expect(typeof a.series).toBe('string');
      expect(typeof a.seriesSlug).toBe('string');
      expect(a.price).toBeGreaterThan(0);
      expect(typeof a.sold).toBe('boolean');
      expect(existsSync(join(IMG, a.image))).toBe(true);
    }
  });

  it('matches known inventory sold states', () => {
    const get = (s) => JSON.parse(readFileSync(join(DIR, `${s}.json`), 'utf8'));
    expect(get('romeo-1').sold).toBe(true);
    expect(get('juliette-1').sold).toBe(true);
    expect(get('vortex-2').sold).toBe(true);
    expect(get('vortex-5').sold).toBe(false);
    expect(get('insomnia-5').sold).toBe(false);
    expect(get('romeo-1').price).toBe(3000);
    expect(get('vortex-5').size).toBe('32 × 32 cm');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/artworks-data.test.js`
Expected: FAIL (ENOENT — directory does not exist).

- [ ] **Step 3: Write the extraction script**

`scripts/extract-artworks.mjs`:

```js
// Parses the current boutique.html (inventory source of truth) into
// src/content/artworks/*.json and copies each card's image into src/assets/artworks/.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const html = readFileSync('boutique.html', 'utf8');
const OUT = 'src/content/artworks';
const IMG_OUT = 'src/assets/artworks';
mkdirSync(OUT, { recursive: true });
mkdirSync(IMG_OUT, { recursive: true });

const cards = html.match(/<article class="product-card"[\s\S]*?<\/article>/g) ?? [];
if (cards.length < 40) throw new Error(`only ${cards.length} cards parsed — selector drift?`);

const titleCase = (s) =>
  s.toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());

let count = 0;
for (const card of cards) {
  const pick = (re) => (card.match(re) ?? [])[1];
  const seriesSlug = pick(/data-collection="([^"]+)"/);
  const imgSrc = pick(/img src="([^"]+)"/);
  const series = pick(/product-card__series">Série ([^<]+)</) ?? titleCase(seriesSlug.replace(/-/g, ' '));
  const rawTitle = pick(/product-card__title">([^<]+)</);
  const size = pick(/product-card__dimensions">([^<]+)</) ?? '';
  const priceStr = pick(/product-card__price[^>]*">€([\d,]+)</);
  const sold = card.includes('badge--sold');

  const title = titleCase(rawTitle.trim());
  const slug = rawTitle.trim().toLowerCase().replace(/\s+/g, '-');
  const price = Number(priceStr.replace(/,/g, ''));
  const image = basename(imgSrc);

  copyFileSync(join('original-site/images', image), join(IMG_OUT, image));
  writeFileSync(
    join(OUT, `${slug}.json`),
    JSON.stringify({ slug, title, series: series.trim(), seriesSlug, price, size: size.trim(), sold, image, year: null, description: '' }, null, 2) + '\n'
  );
  count++;
}
console.log(`wrote ${count} artworks`);

// site assets used by layout/pages
mkdirSync('src/assets/site', { recursive: true });
for (const f of ['logo-carlay-BLANC.png', 'Carlay-art-signature.png', 'Carlay-art-840x1120.jpg', 'Carlay-art.jpg']) {
  copyFileSync(join('original-site/images', f), join('src/assets/site', f));
}
```

- [ ] **Step 4: Run and verify**

Run: `npm run extract && npx vitest run tests/artworks-data.test.js`
Expected: `wrote 44 artworks` (±few), test PASS. If a slug assertion fails (e.g. weird title like "SPLATSH 1"), inspect that card and adjust the regex — do not hand-edit generated JSON.

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-artworks.mjs src/content/artworks src/assets tests/artworks-data.test.js
git commit -m "feat: extract artwork inventory from boutique.html into content collection data"
```

---

### Task 3: Content collection config + series/price lib

**Files:**
- Create: `src/content.config.ts`, `src/lib/series.js`, `tests/series.test.js`

**Interfaces:**
- Produces: collection `artworks` queryable via `getCollection('artworks')` (entry `.id` = slug, `.data` = the JSON shape from Task 2). `src/lib/series.js` exports `accentFor(seriesSlug: string): string` and `formatPrice(n: number): string`.

- [ ] **Step 1: Write the failing test**

`tests/series.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { accentFor, formatPrice } from '../src/lib/series.js';

describe('series lib', () => {
  it('maps known series to their accent hex', () => {
    expect(accentFor('vortex')).toBe('#2DD4BF');
    expect(accentFor('romeo')).toBe('#87CEEB');
    expect(accentFor('insomnia')).toBe('#4ADE80');
  });
  it('falls back to the neutral line color for unknown series', () => {
    expect(accentFor('blue-dreams')).toBe('rgba(255,255,255,0.16)');
  });
  it('formats prices symbol-first with comma separators', () => {
    expect(formatPrice(1000)).toBe('€1,000');
    expect(formatPrice(9000)).toBe('€9,000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/series.test.js`
Expected: FAIL (cannot resolve `../src/lib/series.js`).

- [ ] **Step 3: Implement**

`src/lib/series.js`:

```js
const ACCENTS = {
  romeo: '#87CEEB',
  vortex: '#2DD4BF',
  'purple-galaxy': '#8B5CF6',
  insomnia: '#4ADE80',
  'golden-sunset': '#D4A574',
  'sweet-life': '#D946EF',
};

export function accentFor(seriesSlug) {
  return ACCENTS[seriesSlug] ?? 'rgba(255,255,255,0.16)';
}

export function formatPrice(n) {
  return '€' + n.toLocaleString('en-US');
}
```

`src/content.config.ts`:

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const artworks = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/artworks' }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    series: z.string(),
    seriesSlug: z.string(),
    price: z.number().positive(),
    size: z.string(),
    sold: z.boolean(),
    image: z.string(),
    year: z.number().nullable(),
    description: z.string(),
  }),
});

export const collections = { artworks };
```

- [ ] **Step 4: Run tests and build**

Run: `npx vitest run tests/series.test.js` → PASS.
Run: `npm run build` → exits 0 (schema validates all 44 entries; a validation error here means Task 2 output drifted — fix the extractor, re-run `npm run extract`).

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts src/lib/series.js tests/series.test.js
git commit -m "feat: artworks content collection schema and series accent/price lib"
```

---

### Task 4: Cart module (TDD)

**Files:**
- Create: `src/scripts/cart.js`, `tests/cart.test.js`

**Interfaces:**
- Produces (exact API, consumed by CartDrawer/panier/commande/ArtworkCard):
  - `getItems(): Array<{slug,title,series,price,size,image}>`
  - `addItem(item): {ok: true} | {ok: false, reason: 'duplicate'|'sold'}` — pass `{...artwork}`; if `item.sold === true` refuse.
  - `removeItem(slug: string): void`
  - `count(): number`, `total(): number`, `clear(): void`
  - Every mutation dispatches `window` CustomEvent `'cart:change'`. Storage key: `'carlay-cart-v1'`.

- [ ] **Step 1: Write the failing test**

`tests/cart.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getItems, addItem, removeItem, count, total, clear } from '../src/scripts/cart.js';

const vortex5 = { slug: 'vortex-5', title: 'Vortex 5', series: 'Vortex', price: 1000, size: '32 × 32 cm', image: 'VORTEX-5.jpg', sold: false };
const romeo1 = { slug: 'romeo-1', title: 'Romeo 1', series: 'Romeo', price: 3000, size: '76 × 102 cm', image: 'Romeo-1-680x680.jpg', sold: true };

beforeEach(() => { localStorage.clear(); clear(); });

describe('cart', () => {
  it('starts empty', () => {
    expect(getItems()).toEqual([]);
    expect(count()).toBe(0);
    expect(total()).toBe(0);
  });

  it('adds an available work and persists it', () => {
    expect(addItem(vortex5)).toEqual({ ok: true });
    expect(count()).toBe(1);
    expect(total()).toBe(1000);
    expect(JSON.parse(localStorage.getItem('carlay-cart-v1'))).toHaveLength(1);
  });

  it('refuses duplicates — originals are unique', () => {
    addItem(vortex5);
    expect(addItem(vortex5)).toEqual({ ok: false, reason: 'duplicate' });
    expect(count()).toBe(1);
  });

  it('refuses sold works', () => {
    expect(addItem(romeo1)).toEqual({ ok: false, reason: 'sold' });
    expect(count()).toBe(0);
  });

  it('removes by slug', () => {
    addItem(vortex5);
    removeItem('vortex-5');
    expect(getItems()).toEqual([]);
  });

  it('dispatches cart:change on mutation', () => {
    const spy = vi.fn();
    window.addEventListener('cart:change', spy);
    addItem(vortex5);
    removeItem('vortex-5');
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('strips the sold flag from stored items but keeps display fields', () => {
    addItem(vortex5);
    expect(getItems()[0]).toEqual({ slug: 'vortex-5', title: 'Vortex 5', series: 'Vortex', price: 1000, size: '32 × 32 cm', image: 'VORTEX-5.jpg' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/cart.test.js`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`src/scripts/cart.js`:

```js
const KEY = 'carlay-cart-v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
  catch { return []; }
}

function write(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('cart:change'));
}

export function getItems() { return read(); }

export function addItem(item) {
  if (item.sold) return { ok: false, reason: 'sold' };
  const items = read();
  if (items.some((i) => i.slug === item.slug)) return { ok: false, reason: 'duplicate' };
  const { slug, title, series, price, size, image } = item;
  items.push({ slug, title, series, price, size, image });
  write(items);
  return { ok: true };
}

export function removeItem(slug) {
  write(read().filter((i) => i.slug !== slug));
}

export function count() { return read().length; }
export function total() { return read().reduce((s, i) => s + i.price, 0); }
export function clear() { localStorage.removeItem(KEY); }
```

Note: `clear()` intentionally does not dispatch (used for test setup and post-checkout where the page navigates anyway) — if the confirmation page needs a live badge reset, call `removeItem` per item or dispatch manually.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/cart.test.js` → PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/cart.js tests/cart.test.js
git commit -m "feat: localStorage cart module with unique-original and sold guards"
```

---

### Task 5: Checkout provider adapter (TDD)

**Files:**
- Create: `src/scripts/checkout.js`, `tests/checkout.test.js`

**Interfaces:**
- Produces: `createCheckout(order, provider?): Promise<{ok: true, redirect: string}>` where `order = { items: CartItem[], total: number, customer: {prenom, nom, email, adresse, ville, cp, pays}, method: 'card'|'ideal'|'crypto' }`. Default provider `'demo'`. Unknown provider or empty order throws. Consumed by `commande.astro`.

- [ ] **Step 1: Write the failing test**

`tests/checkout.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createCheckout } from '../src/scripts/checkout.js';

const order = {
  items: [{ slug: 'vortex-5', title: 'Vortex 5', price: 1000 }],
  total: 1000,
  customer: { prenom: 'A', nom: 'B', email: 'a@b.c', adresse: 'x', ville: 'Paris', cp: '75001', pays: 'France' },
  method: 'card',
};

describe('checkout adapter', () => {
  it('demo provider resolves to the confirmation redirect', async () => {
    await expect(createCheckout(order)).resolves.toEqual({ ok: true, redirect: '/confirmation' });
  });
  it('rejects an empty order', async () => {
    await expect(createCheckout({ ...order, items: [] })).rejects.toThrow(/vide/);
  });
  it('rejects unknown providers', async () => {
    await expect(createCheckout(order, 'paypal')).rejects.toThrow(/provider/i);
  });
  it('stripe/mollie/coinbase slots exist but require configuration', async () => {
    for (const p of ['stripe', 'mollie', 'coinbase']) {
      await expect(createCheckout(order, p)).rejects.toThrow(/non configuré/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/checkout.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement**

`src/scripts/checkout.js`:

```js
// Provider adapter. UI never changes when a real provider is wired in:
// each provider maps an order to a redirect URL.
const providers = {
  async demo(order) {
    sessionStorage.setItem('carlay-last-order', JSON.stringify({ total: order.total, items: order.items.map((i) => i.slug) }));
    return { ok: true, redirect: '/confirmation' };
  },
  async stripe() { throw new Error('Stripe non configuré — fournir les clés API'); },
  async mollie() { throw new Error('Mollie non configuré — fournir les clés API'); },
  async coinbase() { throw new Error('Coinbase Commerce non configuré — fournir les clés API'); },
};

export async function createCheckout(order, provider = 'demo') {
  if (!order?.items?.length) throw new Error('Commande vide');
  const fn = providers[provider];
  if (!fn) throw new Error(`Unknown provider: ${provider}`);
  return fn(order);
}
```

(`sessionStorage` is absent in the node test environment for the demo test — guard it: wrap the `sessionStorage.setItem` line in `if (typeof sessionStorage !== 'undefined')`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/checkout.test.js` → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/scripts/checkout.js tests/checkout.test.js
git commit -m "feat: checkout provider adapter with demo mode"
```

---

### Task 6: Nav, Footer, CartDrawer components

**Files:**
- Create: `src/components/Nav.astro`, `src/components/Footer.astro`, `src/components/CartDrawer.astro`

**Interfaces:**
- Consumes: `cart.js` API (Task 4).
- Produces: `<Nav currentPath={string} />`, `<Footer />`, `<CartDrawer />`. Every page renders `<Nav …/>` first inside `<Base>`, `<Footer />` last, `<CartDrawer />` after Footer. Buttons with class `js-add-to-cart` and `data-artwork='<JSON>'` anywhere in a page are auto-wired by CartDrawer's script.

- [ ] **Step 1: Create `src/components/Nav.astro`**

Port the `<header class="nav">` block from `previews/accueil.html` with route links and active state:

```astro
---
const { currentPath } = Astro.props;
const links = [
  { href: '/boutique', label: 'Œuvres' },
  { href: '/a-propos', label: "L'Artiste" },
  { href: '/contact', label: 'Contact' },
];
---
<header class="nav">
  <a class="nav__logo" href="/">CARLAY ART</a>
  <nav class="nav__links" aria-label="Navigation principale">
    {links.map((l) => (
      <a href={l.href} aria-current={currentPath === l.href ? 'page' : undefined}>{l.label}</a>
    ))}
  </nav>
  <div style="display:flex; gap:0.6rem; align-items:center;">
    <button class="nav__cart js-cart-toggle" aria-label="Panier">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 7h12l1 14H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>
      <span class="js-cart-count">0</span>
    </button>
    <button class="nav__burger js-burger" aria-label="Menu" aria-expanded="false">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
    </button>
  </div>
</header>
<div class="mobile-menu js-mobile-menu">
  <button class="mobile-menu__close js-menu-close" aria-label="Fermer">×</button>
  {links.map((l) => <a href={l.href}>{l.label}</a>)}
  <a href="/panier">Panier</a>
</div>
<script>
  import { count } from '../scripts/cart.js';
  const badge = document.querySelectorAll('.js-cart-count');
  const sync = () => badge.forEach((b) => (b.textContent = String(count())));
  sync();
  window.addEventListener('cart:change', sync);

  const menu = document.querySelector('.js-mobile-menu');
  const burger = document.querySelector('.js-burger');
  const close = () => { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('a').focus();
  });
  menu.querySelector('.js-menu-close').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
</script>
```

- [ ] **Step 2: Create `src/components/Footer.astro`**

Port the FULL columned `<footer class="footer">` from `previews/accueil.html` (the spec makes the columned footer shared on all pages). Rewrite hrefs: collections → `/boutique`, L'Artiste → `/a-propos`, Contact → `/contact`, payments → `/commande`. Keep `© 2026` and the Instagram `data-todo` link. Logo image: import `logo-carlay-BLANC.png` from `../assets/site/` and render with `<Image>` from `astro:assets` (width 90).

- [ ] **Step 3: Create `src/components/CartDrawer.astro`**

```astro
---
import { formatPrice } from '../lib/series.js';
---
<aside class="cart-drawer js-cart-drawer" aria-label="Panier" hidden>
  <div class="cart-drawer__head">
    <h2>Votre panier</h2>
    <button class="js-drawer-close" aria-label="Fermer">×</button>
  </div>
  <ul class="cart-drawer__items js-drawer-items"></ul>
  <p class="cart-drawer__empty js-drawer-empty">Votre panier est vide.</p>
  <div class="cart-drawer__foot">
    <p class="cart-drawer__total">Total <strong class="js-drawer-total">€0</strong></p>
    <a class="btn btn--primary" href="/commande">Commander</a>
    <a class="btn btn--ghost" href="/panier">Voir le panier</a>
  </div>
</aside>
<div class="cart-toast js-cart-toast" role="status" hidden></div>
<script>
  import { getItems, addItem, removeItem, total } from '../scripts/cart.js';

  const drawer = document.querySelector('.js-cart-drawer');
  const list = drawer.querySelector('.js-drawer-items');
  const empty = drawer.querySelector('.js-drawer-empty');
  const totalEl = drawer.querySelector('.js-drawer-total');
  const toast = document.querySelector('.js-cart-toast');
  const fmt = (n) => '€' + n.toLocaleString('en-US');

  function render() {
    const items = getItems();
    empty.hidden = items.length > 0;
    totalEl.textContent = fmt(total());
    list.innerHTML = items.map((i) => `
      <li>
        <span>${i.title} · <small>${i.size}</small></span>
        <span>${fmt(i.price)} <button data-remove="${i.slug}" aria-label="Retirer ${i.title}">×</button></span>
      </li>`).join('');
  }

  function say(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    setTimeout(() => (toast.hidden = true), 2600);
  }

  document.addEventListener('click', (e) => {
    const add = e.target.closest('.js-add-to-cart');
    if (add) {
      const res = addItem(JSON.parse(add.dataset.artwork));
      if (res.ok) { drawer.hidden = false; }
      else if (res.reason === 'duplicate') say('Pièce unique — déjà dans votre panier.');
      else say('Cette œuvre est vendue.');
    }
    if (e.target.closest('.js-cart-toggle')) drawer.hidden = !drawer.hidden;
    if (e.target.closest('.js-drawer-close')) drawer.hidden = true;
    const rm = e.target.closest('[data-remove]');
    if (rm) removeItem(rm.dataset.remove);
  });
  window.addEventListener('cart:change', render);
  render();
</script>
```

Add drawer styles to the end of `src/styles/components.css`:

```css
/* ---------- cart drawer & toast ---------- */
.cart-drawer {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  z-index: 300;
  width: min(380px, 92vw);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 1.6rem;
  background: var(--surface);
  border-left: 1px solid var(--line-strong);
}
.cart-drawer__head { display: flex; justify-content: space-between; align-items: center; }
.cart-drawer__head h2 { font-family: var(--font-display); font-size: var(--text-lg); }
.cart-drawer__head button { background: none; border: 0; color: var(--muted); font-size: 1.6rem; cursor: pointer; }
.cart-drawer__items { list-style: none; flex: 1; overflow-y: auto; }
.cart-drawer__items li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.8rem 0; border-bottom: 1px solid var(--line); font-size: var(--text-sm); }
.cart-drawer__items button { background: none; border: 0; color: var(--faint); cursor: pointer; }
.cart-drawer__empty { color: var(--faint); }
.cart-drawer__foot { display: grid; gap: 0.7rem; }
.cart-drawer__total { display: flex; justify-content: space-between; color: var(--muted); }
.cart-toast {
  position: fixed;
  bottom: 1.4rem; left: 50%;
  transform: translateX(-50%);
  z-index: 400;
  background: var(--surface);
  border: 1px solid var(--line-strong);
  color: var(--text);
  padding: 0.7rem 1.2rem;
  font-size: var(--text-sm);
}
```

- [ ] **Step 4: Wire into the stub page and verify**

In `src/pages/index.astro` add `<Nav currentPath="/" />`, `<Footer />`, `<CartDrawer />` around the stub content. Run `npm run dev`, open `http://localhost:4321/`: nav renders with 3 links + cart pill showing 0; burger appears < 900px and opens/closes the overlay; footer columns render. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components src/styles/components.css src/pages/index.astro
git commit -m "feat: shared Nav (with mobile overlay), Footer, and CartDrawer components"
```

---

### Task 7: ArtworkCard component

**Files:**
- Create: `src/components/ArtworkCard.astro`

**Interfaces:**
- Consumes: `formatPrice` (Task 3), artwork data shape (Task 2), image glob.
- Produces: `<ArtworkCard artwork={data} ratio="1/1"|"3/4" eager={boolean} />` — links to `/oeuvre/${slug}`, renders VENDU badge + struck price when sold. Used by index/boutique/oeuvre pages.

- [ ] **Step 1: Implement**

```astro
---
import { Image } from 'astro:assets';
import { formatPrice } from '../lib/series.js';

const images = import.meta.glob('../assets/artworks/*', { eager: true });
const { artwork, ratio = '1/1', eager = false } = Astro.props;
const img = images[`../assets/artworks/${artwork.image}`]?.default;
if (!img) throw new Error(`missing image for ${artwork.slug}: ${artwork.image}`);
---
<a class="card reveal" href={`/oeuvre/${artwork.slug}/`} style={`--ratio: ${ratio};`}>
  <div class="card__media">
    {artwork.sold && <span class="badge-sold">Vendu</span>}
    <Image src={img} alt={`${artwork.title} — Série ${artwork.series}`} widths={[400, 680]} sizes="(max-width: 560px) 92vw, 400px" loading={eager ? 'eager' : 'lazy'} />
  </div>
  <div class="card__body">
    <div>
      <div class="card__title">{artwork.title}</div>
      <div class="card__meta">{artwork.size}</div>
    </div>
    <div class={`card__price${artwork.sold ? ' card__price--sold' : ''}`}>{formatPrice(artwork.price)}</div>
  </div>
</a>
```

- [ ] **Step 2: Smoke it on the stub page**

Temporarily render one card on `index.astro` (frontmatter: `const { getCollection } = await import('astro:content'); const [first] = await getCollection('artworks');` then `<ArtworkCard artwork={first.data} />`). `npm run build` exits 0; dev page shows the card with image. Remove the temporary usage after checking (Task 8 rebuilds the page properly).

- [ ] **Step 3: Commit**

```bash
git add src/components/ArtworkCard.astro
git commit -m "feat: ArtworkCard component with sold state and optimized images"
```

---

### Task 8: Homepage (`index.astro`)

**Files:**
- Modify: `src/pages/index.astro` (replace stub entirely)

**Interfaces:**
- Consumes: `Base`, `Nav`, `Footer`, `CartDrawer`, `ArtworkCard`, `getCollection('artworks')`, site assets glob.

- [ ] **Step 1: Implement the page**

Frontmatter:

```astro
---
import { getCollection } from 'astro:content';
import { Image } from 'astro:assets';
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import CartDrawer from '../components/CartDrawer.astro';
import ArtworkCard from '../components/ArtworkCard.astro';
import logo from '../assets/site/logo-carlay-BLANC.png';
import signature from '../assets/site/Carlay-art-signature.png';
import artistPhoto from '../assets/site/Carlay-art-840x1120.jpg';

const artworks = (await getCollection('artworks')).map((e) => e.data);
const bySlug = Object.fromEntries(artworks.map((a) => [a.slug, a]));
const featured = ['romeo-1', 'vortex-2', 'insomnia-1', 'juliette-1', 'vortex-5'].map((s) => bySlug[s]);
const collections = [
  { slug: 'romeo', cover: 'romeo-2', wide: true },
  { slug: 'vortex', cover: 'vortex-2', wide: true },
  { slug: 'insomnia', cover: 'insomnia-3' },
  { slug: 'purple-galaxy', cover: 'purple-galaxy-7' },
  { slug: 'juliette', cover: 'juliette-2' },
  { slug: 'golden-sunset', cover: 'golden-sunset-2' },
].map((c) => {
  const works = artworks.filter((a) => a.seriesSlug === c.slug);
  return { ...c, coverArt: bySlug[c.cover], name: works[0].series, count: works.length, from: Math.min(...works.map((w) => w.price)) };
});
const seriesCount = new Set(artworks.map((a) => a.seriesSlug)).size;
---
```

Markup: port `previews/accueil.html` body section-by-section inside `<Base title="CARLAY ART — Artiste Contemporaine Française" currentPath="/">`, with these mechanical changes:

1. The page-scoped `<style>` block from the preview's `<head>` moves into an Astro `<style is:global>` block at the end of the file, verbatim.
2. Replace the preview's nav/footer/cart markup with `<Nav currentPath="/" />`, `<Footer />`, `<CartDrawer />`.
3. Hero: keep the `sr-only` h1 verbatim; logo `<img>` becomes `<Image src={logo} alt="Monogramme CA — Carlay Art" width={300} loading="eager" />`; CTA href → `/boutique`.
4. "Œuvres sélectionnées": replace the five hand-written cards with `{featured.map((a, i) => <ArtworkCard artwork={a} ratio={i === 0 ? '3/4' : '1/1'} eager={i === 0} />)}` inside the existing `grid-featured` div. Keep head + CTA (href → `/boutique`).
5. Artist band: signature/photo `<img>`s become `<Image>` (signature width 130, photo width 480). "En savoir plus" href → `/a-propos`.
6. Collections bento: replace the six cards with `{collections.map((c) => (…card markup from preview, class `card--wide` when `c.wide`, cover via a nested `<Image src={imagesGlob…}>` — reuse the same glob pattern as ArtworkCard for `c.coverArt.image`, href → `/boutique#${c.slug}`, meta text `${c.count} œuvres${c.wide ? ` · à partir de ${formatPrice(c.from)}` : ''}`…))}`. The "Voir les 22 séries" button text becomes `Voir les ${seriesCount} séries` and href → `/boutique`.
7. Buy band + remaining hrefs → `/boutique`.
8. Do NOT copy the preview's reveal `<script>` (Base provides it) or the `html class` script (Base provides it).

- [ ] **Step 2: Verify**

`npm run build` exits 0. In dev, the homepage matches `previews/accueil.html` visually (compare side by side at `http://localhost:3000/previews/accueil` if the legacy server is still running); all links go to real routes; sold cards (Romeo 1, Vortex 2, Juliette 1) show VENDU.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: homepage with featured works and collections bento from real data"
```

---

### Task 9: Boutique page with filters

**Files:**
- Create: `src/pages/boutique.astro`

**Interfaces:**
- Consumes: components + collection. Produces series sections with `id={seriesSlug}` (homepage bento links to `/boutique#<slug>`).

- [ ] **Step 1: Implement**

Frontmatter:

```astro
---
import { getCollection } from 'astro:content';
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import CartDrawer from '../components/CartDrawer.astro';
import ArtworkCard from '../components/ArtworkCard.astro';
import { accentFor } from '../lib/series.js';

const artworks = (await getCollection('artworks')).map((e) => e.data);
const seriesOrder = [...new Set(artworks.map((a) => a.seriesSlug))];
const series = seriesOrder.map((slug) => {
  const works = artworks.filter((a) => a.seriesSlug === slug);
  return { slug, name: works[0].series, works, accent: accentFor(slug) };
});
---
```

Markup: port `previews/boutique.html` inside `<Base title="Boutique — CARLAY ART" currentPath="/boutique">`:

1. Page `<style>` → `<style is:global>` (keep the `.chip` button styles and `top: var(--nav-h)` sticky rule verbatim). Delete the `.note` rule and the preview-only note paragraph.
2. Filter bar becomes data-driven — "Tout" + one chip per series:

```astro
<nav class="filters" aria-label="Filtrer par série">
  <button class="chip js-chip" aria-pressed="true" data-series="all">Tout</button>
  {series.map((s) => (
    <button class="chip js-chip" aria-pressed="false" data-series={s.slug}>{s.name}</button>
  ))}
</nav>
```

3. Sections — all series, not just two:

```astro
<main class="section section--tight">
  <div class="wrap">
    {series.map((s) => (
      <section class="js-series" id={s.slug} data-series={s.slug}>
        <div class="series-head reveal" style={`--series: ${s.accent};`}>
          <h2 class="display">{s.name}</h2>
          <span class="count">{s.works.length} {s.works.length > 1 ? 'œuvres' : 'œuvre'}</span>
        </div>
        <div class="grid-series">
          {s.works.map((a) => <ArtworkCard artwork={a} />)}
        </div>
      </section>
    ))}
  </div>
</main>
```

4. Filter script at the end of the page:

```astro
<script>
  const chips = document.querySelectorAll('.js-chip');
  const sections = document.querySelectorAll('.js-series');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    const pick = chip.dataset.series;
    sections.forEach((s) => { s.hidden = pick !== 'all' && s.dataset.series !== pick; });
  }));
</script>
```

- [ ] **Step 2: Verify**

Dev: `/boutique` lists every series with its accent rule; chips filter sections and "Tout" restores; `/boutique#vortex` deep-links; with JS disabled (DevTools) all sections remain visible and fully opaque.

- [ ] **Step 3: Commit**

```bash
git add src/pages/boutique.astro
git commit -m "feat: boutique page with per-series sections and client-side filters"
```

---

### Task 10: Artwork detail page + lightbox

**Files:**
- Create: `src/pages/oeuvre/[slug].astro`

**Interfaces:**
- Consumes: collection, `accentFor`, `formatPrice`, `ArtworkCard`, CartDrawer's `js-add-to-cart` contract (Task 6).

- [ ] **Step 1: Implement**

```astro
---
import { getCollection } from 'astro:content';
import { Image } from 'astro:assets';
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import CartDrawer from '../../components/CartDrawer.astro';
import ArtworkCard from '../../components/ArtworkCard.astro';
import { accentFor, formatPrice } from '../../lib/series.js';

export async function getStaticPaths() {
  const artworks = await getCollection('artworks');
  return artworks.map((e) => ({ params: { slug: e.data.slug }, props: { artwork: e.data } }));
}

const { artwork } = Astro.props;
const all = (await getCollection('artworks')).map((e) => e.data);
const related = all.filter((a) => a.seriesSlug === artwork.seriesSlug && a.slug !== artwork.slug).slice(0, 3);
const seriesCount = all.filter((a) => a.seriesSlug === artwork.seriesSlug).length;
const images = import.meta.glob('../../assets/artworks/*', { eager: true });
const img = images[`../../assets/artworks/${artwork.image}`].default;
const accent = accentFor(artwork.seriesSlug);
const cartPayload = JSON.stringify(artwork);
---
```

Markup: port `previews/oeuvre.html` inside `<Base title={`${artwork.title} — CARLAY ART`} currentPath="/boutique">`, changes:

1. Page `<style>` → `<style is:global>`; add lightbox styles:

```css
.lightbox { border: 0; padding: 0; background: rgba(10,10,10,0.96); max-width: 100vw; max-height: 100vh; }
.lightbox::backdrop { background: rgba(10,10,10,0.8); }
.lightbox img { max-width: 94vw; max-height: 94vh; object-fit: contain; }
```

2. The stage becomes a real button + `<dialog>`:

```astro
<button class="room__stage reveal js-stage" aria-label={`Agrandir ${artwork.title}`}>
  <Image src={img} alt={`${artwork.title} — Série ${artwork.series}`} widths={[680]} loading="eager" />
</button>
<dialog class="lightbox js-lightbox">
  <Image src={img} alt={`${artwork.title} — vue agrandie`} widths={[1200]} loading="lazy" />
</dialog>
```

(`.room__stage` is styled on the class, so the tag swap is safe; add `border:0;` to its style block since it's now a button.)

3. Info column values come from data: eyebrow `Série {artwork.series}` with `style={`--series: ${accent};`}`; title `{artwork.title}`; description paragraph only `{artwork.description && <p class="lead">…</p>}`; specs list rows Technique/Acrylique sur toile, Dimensions/{artwork.size}, plus `{artwork.year && (<li>…Année…</li>)}`, Signature/Signée au dos; price `{formatPrice(artwork.price)}`.
4. CTAs — the sold state per spec:

```astro
{artwork.sold ? (
  <div class="room__cta">
    <span class="btn btn--disabled">Vendu</span>
    <a class="btn btn--ghost" href={`/boutique#${artwork.seriesSlug}`}>Découvrir des œuvres similaires</a>
  </div>
) : (
  <div class="room__cta">
    <button class="btn btn--primary js-add-to-cart" data-artwork={cartPayload}>Ajouter au panier</button>
    <a class="btn btn--ghost" href="/panier">Acheter maintenant</a>
  </div>
)}
```

("Acheter maintenant" goes to `/panier` — the CartDrawer contract adds nothing on navigation, so this is view-cart; if you want true buy-now, give it class `js-add-to-cart` too plus a small script to then navigate — NOT required by spec.)
5. Related: series-head (accent, `Plus de la série {artwork.series}`, `{seriesCount} œuvres`) + `{related.map((a) => <ArtworkCard artwork={a} />)}`.
6. Lightbox script at page end:

```astro
<script>
  const stage = document.querySelector('.js-stage');
  const box = document.querySelector('.js-lightbox');
  stage?.addEventListener('click', () => box.showModal());
  box?.addEventListener('click', () => box.close());
</script>
```

- [ ] **Step 2: Verify**

`npm run build` — one page per artwork in `dist/oeuvre/`. Dev: `/oeuvre/vortex-5` shows buy CTAs, add-to-cart opens the drawer with count 1, adding again toasts "Pièce unique". `/oeuvre/romeo-1` shows the sold state, no add button. Stage opens/closes the lightbox with keyboard (Enter, Esc).

- [ ] **Step 3: Commit**

```bash
git add src/pages/oeuvre
git commit -m "feat: per-artwork viewing room pages with lightbox and sold states"
```

---

### Task 11: Cart page, checkout, confirmation

**Files:**
- Create: `src/pages/panier.astro`, `src/pages/commande.astro`, `src/pages/confirmation.astro`

**Interfaces:**
- Consumes: `cart.js` (getItems/removeItem/total/clear), `checkout.js` `createCheckout`.

- [ ] **Step 1: `panier.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import CartDrawer from '../components/CartDrawer.astro';
---
<Base title="Panier — CARLAY ART" currentPath="/panier">
  <Nav currentPath="/panier" />
  <main class="section" style="padding-top: 8rem; min-height: 60vh;">
    <div class="wrap" style="max-width: 760px;">
      <h1 class="display" style="font-size: var(--text-xl);">Votre panier</h1>
      <ul class="cart-page__items js-cart-items" style="list-style:none; margin-top: 2rem;"></ul>
      <p class="js-cart-empty" style="color: var(--faint); margin-top: 1.5rem;">
        Votre panier est vide. <a href="/boutique" style="text-decoration: underline;">Découvrir les œuvres</a>
      </p>
      <div class="js-cart-foot" style="margin-top: 2rem; display: grid; gap: 1rem;" hidden>
        <p style="display:flex; justify-content: space-between; color: var(--muted);">
          Total (livraison assurée incluse) <strong class="js-cart-total" style="color: var(--text);"></strong>
        </p>
        <p style="color: var(--faint); font-size: var(--text-xs);">Certificat d'authenticité inclus pour chaque œuvre.</p>
        <a class="btn btn--primary" href="/commande" style="justify-self: start;">Passer commande</a>
      </div>
    </div>
  </main>
  <Footer />
  <CartDrawer />
</Base>
<style is:global>
  .cart-page__items li { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0; border-bottom: 1px solid var(--line); }
  .cart-page__items img { width: 72px; height: 72px; object-fit: cover; }
  .cart-page__items button { background: none; border: 0; color: var(--faint); cursor: pointer; font-size: 1.1rem; }
</style>
<script>
  import { getItems, removeItem, total } from '../scripts/cart.js';
  const fmt = (n) => '€' + n.toLocaleString('en-US');
  const list = document.querySelector('.js-cart-items');
  const empty = document.querySelector('.js-cart-empty');
  const foot = document.querySelector('.js-cart-foot');
  function render() {
    const items = getItems();
    empty.hidden = items.length > 0;
    foot.hidden = items.length === 0;
    document.querySelector('.js-cart-total').textContent = fmt(total());
    list.innerHTML = items.map((i) => `
      <li>
        <img src="/images/artworks/${i.image}" alt="${i.title}" loading="lazy">
        <span style="flex:1;"><strong>${i.title}</strong><br><small style="color:var(--faint);">Série ${i.series} · ${i.size} · Pièce unique</small></span>
        <span>${fmt(i.price)}</span>
        <button data-remove="${i.slug}" aria-label="Retirer ${i.title}">×</button>
      </li>`).join('');
  }
  list.addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove]');
    if (b) removeItem(b.dataset.remove);
  });
  window.addEventListener('cart:change', render);
  render();
</script>
```

Cart thumbnails at runtime need plain URLs (the JS island can't use `astro:assets`): copy artwork images to `public/images/artworks/` by adding to `scripts/extract-artworks.mjs` (after the existing copy line):

```js
mkdirSync('public/images/artworks', { recursive: true });
copyFileSync(join('original-site/images', image), join('public/images/artworks', image));
```

Re-run `npm run extract` and commit the generated `public/images/artworks/` files.

- [ ] **Step 2: `commande.astro`**

Port `previews/commande.html` inside `<Base title="Commande — CARLAY ART" currentPath="/commande">`: page `<style>` → `<style is:global>`; replace nav/footer with components; keep the form fields, payment methods (radio values `card`, `ideal`, `crypto`) and demo note verbatim; wrap fields in a real `<form class="js-checkout-form">` and make the pay button `type="submit"` with label `Payer <span class="js-pay-total">€0</span>`. The summary column renders from the cart at runtime — give the line-item container class `js-order-summary` and reuse the panier render pattern (no remove buttons). Page script:

```astro
<script>
  import { getItems, total, clear } from '../scripts/cart.js';
  import { createCheckout } from '../scripts/checkout.js';
  const fmt = (n) => '€' + n.toLocaleString('en-US');
  const form = document.querySelector('.js-checkout-form');
  const totalEls = document.querySelectorAll('.js-pay-total');
  function render() {
    totalEls.forEach((el) => (el.textContent = fmt(total())));
    document.querySelector('.js-order-summary').innerHTML = getItems().map((i) => `
      <div class="line-item">
        <img src="/images/artworks/${i.image}" alt="${i.title}">
        <div><div class="t">${i.title}</div><div class="m">Série ${i.series} · ${i.size}<br>Pièce unique · Certificat inclus</div></div>
      </div>`).join('') || '<p style="color:var(--faint);">Panier vide — <a href="/boutique" style="text-decoration:underline;">choisir une œuvre</a></p>';
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      const res = await createCheckout({
        items: getItems(),
        total: total(),
        customer: data,
        method: form.querySelector('input[name="pay"]:checked')?.value ?? 'card',
      });
      clear();
      location.assign(res.redirect);
    } catch (err) {
      alert(err.message); // replaced by inline error text: set .js-checkout-error textContent
    }
  });
  render();
</script>
```

Use an inline error element instead of `alert` (spec bans dialogs): add `<p class="js-checkout-error" role="alert" style="color: var(--rose);" hidden></p>` above the submit button and set its text/hidden in the catch block. Give each `<input>` a `name` matching the customer keys: `prenom, nom, email, adresse, ville, cp, pays`, all `required` except none (demo mode: keep `required` on email + nom for basic hygiene). Radios: `name="pay"`, values `card|ideal|crypto`, card checked.

- [ ] **Step 3: `confirmation.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import CartDrawer from '../components/CartDrawer.astro';
---
<Base title="Confirmation — CARLAY ART" currentPath="/confirmation">
  <Nav currentPath="/confirmation" />
  <main class="section" style="padding-top: 9rem; min-height: 60vh; text-align: center;">
    <div class="wrap reveal" style="max-width: 620px;">
      <p class="eyebrow">Merci</p>
      <h1 class="display" style="font-size: var(--text-2xl);">Commande confirmée</h1>
      <p class="lead" style="margin: 1.2rem auto 0;">
        Votre œuvre sera emballée professionnellement et expédiée avec assurance.
        Le certificat d'authenticité accompagne la toile.
      </p>
      <p class="js-order-ref" style="color: var(--faint); margin-top: 1rem; font-size: var(--text-sm);"></p>
      <p style="margin-top: 0.6rem; color: var(--gold, #D4A574); font-size: var(--text-xs); letter-spacing: 0.04em;">
        Mode démonstration — aucun paiement réel n'a été effectué.
      </p>
      <a class="btn btn--ghost" href="/boutique" style="margin-top: 2rem;">Retour à la galerie</a>
    </div>
  </main>
  <Footer />
  <CartDrawer />
</Base>
<script>
  const last = sessionStorage.getItem('carlay-last-order');
  if (last) {
    const { total, items } = JSON.parse(last);
    document.querySelector('.js-order-ref').textContent =
      `${items.length} œuvre${items.length > 1 ? 's' : ''} · Total €${total.toLocaleString('en-US')}`;
  }
</script>
```

- [ ] **Step 4: Verify end-to-end in dev**

`/oeuvre/vortex-5` → Ajouter au panier → drawer count 1 → `/panier` shows the line with thumbnail → Passer commande → fill nom/email → Payer → lands on `/confirmation` with "1 œuvre · Total €1,000", cart badge reads 0. Duplicate/sold guards still toast.

- [ ] **Step 5: Run all unit tests, commit**

Run: `npm test` → all pass.

```bash
git add src/pages/panier.astro src/pages/commande.astro src/pages/confirmation.astro scripts/extract-artworks.mjs public/images
git commit -m "feat: cart page, demo checkout flow, and confirmation page"
```

---

### Task 12: A-propos + Contact pages

**Files:**
- Create: `src/pages/a-propos.astro`, `src/pages/contact.astro`

- [ ] **Step 1: `a-propos.astro`**

Port `previews/a-propos.html` inside `<Base title="L'Artiste — CARLAY ART" currentPath="/a-propos">`: page `<style>` → `<style is:global>`; nav/footer/drawer → components; hero photo + signature via `<Image>` from `../assets/site/` (`Carlay-art.jpg` hero — `loading="eager"`, `widths={[1440]}`; signature width 150). Keep bio copy, pull quote, facts row, and the `id="contact"` band verbatim. In the contact band, change the closing line to link the standalone page: `<a href="/contact">…</a>` is NOT needed — keep mailto + Instagram as in preview.

- [ ] **Step 2: `contact.astro`**

Standalone page, same content as the contact band (spec: "same content as the contact band, standalone page for the nav link"):

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import CartDrawer from '../components/CartDrawer.astro';
---
<Base title="Contact — CARLAY ART" currentPath="/contact">
  <Nav currentPath="/contact" />
  <main class="section" style="padding-top: 9rem; min-height: 60vh; text-align: center;">
    <div class="wrap reveal" style="max-width: 620px;">
      <p class="eyebrow">Contact</p>
      <h1 class="display" style="font-size: var(--text-2xl);">Presse &amp; galeries</h1>
      <p class="lead" style="margin: 1.2rem auto 2rem;">
        Pour l'acquisition d'une œuvre, tout passe par la <a href="/boutique" style="text-decoration: underline;">boutique</a> —
        paiement sécurisé, livraison mondiale. Pour toute autre demande :
      </p>
      <a class="btn btn--ghost" href="mailto:carlayart369@gmail.com">carlayart369@gmail.com</a>
      <p style="margin-top: 1.5rem;">
        <a href="https://instagram.com" data-todo="replace with artist profile URL" style="color: var(--muted); font-size: var(--text-sm);">Instagram ↗</a>
      </p>
    </div>
  </main>
  <Footer />
  <CartDrawer />
</Base>
```

- [ ] **Step 3: Verify + commit**

Dev: `/a-propos` matches the preview; `/contact` renders; nav marks each active. `npm run build` exits 0.

```bash
git add src/pages/a-propos.astro src/pages/contact.astro
git commit -m "feat: a-propos and contact pages"
```

---

### Task 13: Build verification suite + acceptance sweep

**Files:**
- Create: `tests/dist.test.js`

- [ ] **Step 1: Write the dist test**

```js
// Run AFTER `npm run build`: npm run test:dist
import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

let files;
beforeAll(() => {
  expect(existsSync(DIST), 'run `npm run build` first').toBe(true);
  files = walk(DIST);
});

describe('built site', () => {
  it('has all 8 route types', () => {
    for (const p of ['index.html', 'boutique/index.html', 'a-propos/index.html', 'contact/index.html', 'panier/index.html', 'commande/index.html', 'confirmation/index.html', 'oeuvre/vortex-5/index.html', 'oeuvre/romeo-1/index.html']) {
      expect(existsSync(join(DIST, p)), p).toBe(true);
    }
  });

  it('has a page for every artwork JSON entry', () => {
    const slugs = readdirSync('src/content/artworks').map((f) => f.replace('.json', ''));
    for (const s of slugs) expect(existsSync(join(DIST, 'oeuvre', s, 'index.html')), s).toBe(true);
  });

  it('has no dead internal links', () => {
    const html = files.filter((f) => f.endsWith('.html'));
    for (const f of html) {
      const hrefs = [...readFileSync(f, 'utf8').matchAll(/(?:href|src)="(\/[^"#?]*)/g)].map((m) => m[1]);
      for (const h of hrefs) {
        const clean = h.replace(/\/$/, '');
        const ok = existsSync(join(DIST, clean)) || existsSync(join(DIST, clean, 'index.html')) || existsSync(join(DIST, clean + '.html'));
        expect(ok, `${f} → ${h}`).toBe(true);
      }
    }
  });

  it('never links the out-of-scope pages', () => {
    for (const f of files.filter((x) => x.endsWith('.html'))) {
      const s = readFileSync(f, 'utf8');
      expect(s).not.toMatch(/href="\/(livraison|mentions-legales|mon-compte)/);
    }
  });

  it('serves no image over 300KB', () => {
    const imgs = files.filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
    for (const img of imgs) {
      expect(statSync(img).size, img).toBeLessThan(300 * 1024);
    }
  });

  it('gates reveal dimming behind html.js on every page', () => {
    for (const f of files.filter((x) => x.endsWith('.html'))) {
      expect(readFileSync(f, 'utf8')).toContain("classList.add('js')");
    }
  });
});
```

- [ ] **Step 2: Run**

Run: `npm run build && npm run test:dist`
Expected: PASS. If the 300KB test fails, the offending source image needs a smaller variant in `src/assets/artworks/` (pick the `-680x680` file) or `public/images/artworks/` — fix the extractor, never hand-swap.

- [ ] **Step 3: Manual acceptance sweep (spec criteria not covered by tests)**

In dev, verify and note results:
- JS disabled: every page fully visible (AC 3), boutique unfiltered, cart controls inert but pages readable.
- `prefers-reduced-motion` emulation (DevTools → Rendering): no hover scale, no reveal animation.
- Keyboard: tab through nav (visible rose focus rings), open lightbox with Enter, Esc closes; mobile menu Esc closes.
- 390px viewport: single-column grids (no squished featured grid), burger menu works.
- Content parity (AC 7): every series present on `/boutique`; artist bio text present on `/` and `/a-propos`.

- [ ] **Step 4: Full test run + commit**

Run: `npm test && npm run build && npm run test:dist` → all green.

```bash
git add tests/dist.test.js
git commit -m "test: post-build verification suite (routes, links, image budget, js-gate)"
```

---

## Self-Review Notes

- Spec coverage: 8 routes (Tasks 1, 8–12), content collection + per-artwork pages (2, 3, 10), cart rules (4, 6), demo checkout adapter (5, 11), design-system port incl. mobile nav + AA rose rule (1, 6), fail-visible reveals JS-gated (1, 13), image budget (13), no dead links (13), sold-state pages (10), inventory source of truth (2). Instagram TODO carried through (6, 12).
- The panier/commande thumbnails use `public/images/artworks/` copies because runtime JS cannot use `astro:assets`; the 300KB budget test covers `public/` output too since it walks all of `dist/`.
- Type consistency: cart item shape `{slug,title,series,price,size,image}` is identical in Tasks 4, 6, 11; `createCheckout(order, provider)` signature identical in 5 and 11; `accentFor`/`formatPrice` names identical in 3, 8, 9, 10.
