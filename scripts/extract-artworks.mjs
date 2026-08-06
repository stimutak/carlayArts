/**
 * Convert the legacy catalog into reviewable foundation records.
 *
 * The legacy page is evidence, not owner approval. Sold works retain their
 * sold state; everything else is fail-closed as not-for-sale until the
 * authoritative inventory and faithful full-work media are approved.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';

const sourceFile = 'boutique.html';
const sourceImageDir = 'original-site/images';
const contentDir = 'src/content/artworks';
const publicImageDir = 'public/artworks';
const publicSiteDir = 'public/site';

const html = readFileSync(sourceFile, 'utf8');
const cards = html.match(/<article class="product-card"[\s\S]*?<\/article>/g) ?? [];

if (cards.length < 40) {
  throw new Error(`Only ${cards.length} artwork cards were parsed; the legacy markup may have drifted.`);
}

mkdirSync(contentDir, { recursive: true });
mkdirSync(publicImageDir, { recursive: true });
mkdirSync(publicSiteDir, { recursive: true });

for (const file of readdirSync(contentDir)) {
  if (file.endsWith('.json')) unlinkSync(join(contentDir, file));
}

const textFrom = (card, pattern, label) => {
  const value = card.match(pattern)?.[1]?.trim();
  if (!value) throw new Error(`Missing ${label} in catalog card.`);
  return value;
};

const titleCase = (value) =>
  value.toLocaleLowerCase('fr-FR').replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase('fr-FR'));

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const parseDimensions = (label) => {
  const match = label.match(/([\d.]+)\s*[×x]\s*([\d.]+)\s*cm/i);
  if (!match) {
    return { width: null, height: null, depth: null, unit: 'cm', reviewStatus: 'needs-owner-review' };
  }
  return {
    width: Number(match[1]),
    height: Number(match[2]),
    depth: null,
    unit: 'cm',
    reviewStatus: 'legacy-source',
  };
};

const orientationFor = ({ width, height }) => {
  if (width === null || height === null) return 'unknown';
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
};

const seenSlugs = new Set();
const seenIds = new Set();
const manifest = [];
const imageUsage = new Map();

for (const [index, card] of cards.entries()) {
  const seriesSlug = textFrom(card, /data-collection="([^"]+)"/, 'series slug');
  const rawTitle = textFrom(card, /product-card__title">([^<]+)</, 'title');
  const sourceImage = textFrom(card, /<img\s+src="([^"]+)"/, 'card image');
  const imageAlt = textFrom(card, /<img[^>]+alt="([^"]+)"/, 'image alt');
  const series = (card.match(/product-card__series">Série\s+([^<]+)</)?.[1] ?? seriesSlug.replace(/-/g, ' ')).trim();
  const dimensionsLabel = textFrom(card, /product-card__dimensions">([^<]+)</, 'dimensions or medium label');
  const priceLabel = textFrom(card, /product-card__price[^>]*">€([\d,]+)/, 'price');
  const title = titleCase(rawTitle);
  const slug = slugify(rawTitle);
  const id = `legacy-${slug}`;
  const sourceSold = card.includes('product-card__badge--sold');
  const imageFilename = basename(sourceImage);
  const sourcePath = join(sourceImageDir, imageFilename);
  const dimensions = parseDimensions(dimensionsLabel);

  if (seenSlugs.has(slug)) throw new Error(`Duplicate artwork slug: ${slug}`);
  if (seenIds.has(id)) throw new Error(`Duplicate artwork ID: ${id}`);
  if (!existsSync(sourcePath)) throw new Error(`Unresolved source image: ${sourcePath}`);
  seenSlugs.add(slug);
  seenIds.add(id);

  copyFileSync(sourcePath, join(publicImageDir, imageFilename));
  imageUsage.set(imageFilename, [...(imageUsage.get(imageFilename) ?? []), slug]);

  const record = {
    id,
    slug,
    title,
    series: titleCase(series),
    seriesSlug,
    sortOrder: index + 1,
    price: { amount: Number(priceLabel.replaceAll(',', '')), currency: 'EUR', reviewStatus: 'legacy-source' },
    availability: sourceSold ? 'sold' : 'not-for-sale',
    availabilityReviewStatus: sourceSold ? 'legacy-source' : 'needs-owner-review',
    medium: { value: dimensionsLabel.match(/acrylique/i) ? dimensionsLabel : 'Acrylique sur toile', reviewStatus: 'legacy-source' },
    year: { value: null, reviewStatus: 'needs-owner-review' },
    dimensions,
    orientation: orientationFor(dimensions),
    aspectRatio: dimensions.width && dimensions.height ? dimensions.width / dimensions.height : null,
    signaturePlacement: { value: null, reviewStatus: 'needs-owner-review' },
    condition: { value: null, reviewStatus: 'needs-owner-review' },
    framingStatus: { value: null, reviewStatus: 'needs-owner-review' },
    certificateStatus: { value: null, reviewStatus: 'needs-owner-review' },
    cardDescription: { value: 'Texte éditorial en attente de validation par l’artiste.', reviewStatus: 'draft' },
    workNote: { value: 'Note spécifique en attente de validation par l’artiste.', reviewStatus: 'draft' },
    seriesStatementRef: { value: `draft-${seriesSlug}`, reviewStatus: 'draft' },
    images: {
      full: { src: null, alt: null, reviewStatus: 'needs-owner-review' },
      card: { src: `/artworks/${imageFilename}`, alt: imageAlt, reviewStatus: 'legacy-source' },
      details: [],
      back: null,
      signature: null,
      roomScale: null,
    },
    featured: false,
    relatedSlugs: [],
    source: { kind: 'legacy-catalog', file: sourceFile },
  };

  writeFileSync(join(contentDir, `${slug}.json`), `${JSON.stringify(record, null, 2)}\n`);
  manifest.push({
    id,
    slug,
    sourceSold,
    availability: record.availability,
    cardImage: imageFilename,
    missingFacts: [
      ...(dimensions.width === null ? ['dimensions'] : []),
      'year',
      'signaturePlacement',
      'condition',
      'framingStatus',
      'certificateStatus',
      'seriesStatement',
      'workNote',
      'faithfulFullWorkImage',
      'detailImages',
    ],
  });
}

writeFileSync(
  'docs/artwork-inventory-review.json',
  `${JSON.stringify(
    {
      generatedAt: '2026-08-06',
      sourceSnapshotCommit: 'aae865bb84c9e1f0ec03fbb3e875efa081dc7c6c',
      source: sourceFile,
      policy: 'Legacy sold states are retained. All other works remain not-for-sale pending owner approval.',
      duplicateCardImages: [...imageUsage]
        .filter(([, slugs]) => slugs.length > 1)
        .map(([image, slugs]) => ({ image, slugs })),
      works: manifest,
    },
    null,
    2,
  )}\n`,
);

for (const filename of ['logo-carlay-BLANC.png', 'Carlay-art-signature.png', 'Carlay-art.jpg']) {
  const sourcePath = join(sourceImageDir, filename);
  if (!existsSync(sourcePath)) throw new Error(`Unresolved site asset: ${sourcePath}`);
  copyFileSync(sourcePath, join(publicSiteDir, filename));
}

console.log(`Wrote ${cards.length} fail-closed artwork records and their review manifest.`);
