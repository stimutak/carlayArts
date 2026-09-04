#!/usr/bin/env node
/**
 * Generates api/_catalog.json from boutique.html.
 *
 * The checkout endpoints must never trust a price sent by the browser, so they
 * look every line item up in this file instead. Regenerate it whenever the
 * boutique inventory changes: `npm run build:catalog`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(ROOT, 'boutique.html'), 'utf8');

const BUTTON = /<button[^>]*\bdata-add-to-cart\b[^>]*>/g;
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`data-item-${name}="([^"]*)"`));
  return m ? m[1] : null;
};

const catalog = {};
let tag;
while ((tag = BUTTON.exec(source))) {
  const raw = tag[0];
  const id = attr(raw, 'id');
  if (!id) continue;
  const price = Number(attr(raw, 'price'));
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`Artwork "${id}" has no usable price in boutique.html`);
  }
  if (catalog[id]) throw new Error(`Duplicate artwork id "${id}" in boutique.html`);
  catalog[id] = {
    id,
    name: attr(raw, 'name'),
    description: attr(raw, 'description'),
    image: attr(raw, 'image'),
    price,
    currency: 'EUR',
  };
}

const count = Object.keys(catalog).length;
if (count === 0) throw new Error('No purchasable artworks found — refusing to write an empty catalog');

fs.writeFileSync(
  path.join(ROOT, 'api', '_catalog.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), artworks: catalog }, null, 2) + '\n'
);
console.log(`Wrote api/_catalog.json — ${count} purchasable artworks`);
