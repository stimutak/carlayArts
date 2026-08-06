#!/usr/bin/env node

/**
 * Phase 0 artwork inventory and media-fidelity audit.
 *
 * Root boutique.html supplies the authoritative *candidate* rows. The scraped
 * WooCommerce archive, product pages, CLAUDE.md, and static previews are
 * comparison evidence only. Nothing in this script promotes an unverified fact
 * to owner-approved truth.
 *
 * Usage:
 *   node scripts/audit-artwork-inventory.mjs --write
 *   node scripts/audit-artwork-inventory.mjs --check
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join } from 'node:path';

const BASELINE_COMMIT = 'aae865bb84c9e1f0ec03fbb3e875efa081dc7c6c';
const JSON_OUT = 'data/artwork-inventory.authoritative-candidate.json';
const REPORT_OUT = 'docs/audits/2026-08-06-artwork-inventory-review.md';
const mode = process.argv[2] ?? '--check';

if (!['--write', '--check'].includes(mode)) {
  throw new Error(`unknown mode ${mode}; use --write or --check`);
}

const read = (path) => readFileSync(path, 'utf8');
const decodeHtml = (value = '') => value
  .replaceAll('&nbsp;', ' ')
  .replaceAll('&times;', '×')
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#039;', "'")
  .replaceAll('&#8217;', '’')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
const slugify = (value) => decodeHtml(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const titleCase = (value) => value.toLowerCase().replace(/(^|[\s-])\S/g, (match) => match.toUpperCase());
const relativeImagePath = (value = '') => {
  const file = basename(value.split('?')[0]);
  return file ? `original-site/images/${file}` : null;
};
const pathFile = (value) => value ? basename(value) : null;
const sizedStem = (file) => basename(file, extname(file)).replace(/-\d+x\d+$/, '');
const isGeneratedSize = (file) => /-\d+x\d+\.[^.]+$/.test(file);

function imageSize(path) {
  const buffer = readFileSync(path);
  const extension = extname(path).toLowerCase();

  if (extension === '.png' && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (['.jpg', '.jpeg'].includes(extension) && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      if ([0xd8, 0xd9].includes(marker)) {
        offset += 2;
        continue;
      }
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }

  if (extension === '.webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buffer.toString('ascii', 12, 16);
    if (kind === 'VP8X') {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
    if (kind === 'VP8 ' && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      };
    }
    if (kind === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      return {
        width: 1 + (bits & 0x3fff),
        height: 1 + ((bits >> 14) & 0x3fff),
      };
    }
  }

  throw new Error(`unsupported or unreadable image dimensions: ${path}`);
}

function parseDimensions(raw) {
  const match = raw.match(/([\d,.]+)\s*[×xX]\s*([\d,.]+)(?:\s*[×xX]\s*([\d,.]+))?\s*(cm|in)?/i);
  if (!match) {
    return {
      raw,
      width: null,
      height: null,
      depth: null,
      unit: null,
      status: 'missing-physical-dimensions',
    };
  }
  const number = (value) => value == null ? null : Number(value.replace(',', '.'));
  return {
    raw,
    width: number(match[1]),
    height: number(match[2]),
    depth: number(match[3]),
    unit: match[4]?.toLowerCase() ?? null,
    status: 'candidate-parsed',
  };
}

function parseRootCards() {
  const html = read('boutique.html');
  const cards = html.match(/<article class="product-card"[\s\S]*?<\/article>/g) ?? [];
  if (cards.length !== 60) throw new Error(`root boutique card count changed: expected 60, found ${cards.length}`);

  return cards.map((card, index) => {
    const pick = (regex) => decodeHtml((card.match(regex) ?? [])[1] ?? '');
    const rawTitle = pick(/product-card__title">([^<]+)/);
    const seriesSlug = pick(/data-collection="([^"]+)/);
    const seriesName = pick(/product-card__series">Série ([^<]+)/) || titleCase(seriesSlug.replaceAll('-', ' '));
    const dimensionsRaw = pick(/product-card__dimensions">([^<]+)/);
    const priceRaw = pick(/product-card__price[^>]*">€([\d,]+)/);
    const imagePath = (card.match(/<img src="([^"]+)/) ?? [])[1];
    if (!rawTitle || !seriesSlug || !priceRaw || !imagePath) throw new Error(`unparseable root card at position ${index + 1}`);
    const slug = slugify(rawTitle);
    return {
      id: `artwork-${slug}`,
      slug,
      sort_order: index + 1,
      raw_title: rawTitle,
      title: titleCase(rawTitle),
      series: { name: seriesName, slug: seriesSlug },
      price: Number(priceRaw.replaceAll(',', '')),
      price_display: `€${priceRaw}`,
      dimensions: parseDimensions(dimensionsRaw),
      availability: card.includes('product-card__badge--sold') ? 'sold' : 'available',
      card_image_path: imagePath,
    };
  });
}

function parseOriginalCatalog() {
  const html = read('original-site/boutique.html');
  const items = html.match(/<li class="[^"]*\bproduct\b[^"]*"[\s\S]*?<\/li>/g) ?? [];
  const records = [];
  for (const item of items) {
    const titleMatch = item.match(/woocommerce-loop-product__title[^>]*><a href="https:\/\/carlay-art\.com\/boutique\/([^"]+)"[^>]*>([^<]+)/);
    if (!titleMatch) continue;
    const imageUrl = (item.match(/<img[^>]+src="([^"]+)"/) ?? [])[1] ?? '';
    const priceRaw = (item.match(/woocommerce-Price-amount amount[^>]*>[\s\S]*?<bdi>([\d,.]+)/) ?? [])[1] ?? '';
    records.push({
      source_path: 'original-site/boutique.html',
      slug: titleMatch[1],
      title: decodeHtml(titleMatch[2]),
      normalized_title: slugify(titleMatch[2]),
      price: priceRaw ? Number(priceRaw.replace(/[.,]00$/, '').replace(/[,.]/g, '')) : null,
      price_display: priceRaw ? `€${priceRaw.replace(',00', '')}` : null,
      availability: /\boutofstock\b/.test(item) ? 'sold' : /\binstock\b/.test(item) ? 'available' : 'unknown',
      image_path: relativeImagePath(imageUrl),
    });
  }
  const unique = new Map(records.map((record) => [record.slug, record]));
  if (unique.size !== 60) throw new Error(`original catalog product count changed: expected 60, found ${unique.size}`);
  return [...unique.values()];
}

function parseDetailPages() {
  const files = readdirSync('original-site').filter((file) => /^boutique_.+\.html$/.test(file)).sort();
  const records = [];

  for (const file of files) {
    const html = read(join('original-site', file));
    const script = (html.match(/<script type="application\/ld\+json" class="rank-math-schema">([\s\S]*?)<\/script>/) ?? [])[1];
    if (!script) continue;
    let schema;
    try {
      schema = JSON.parse(script);
    } catch {
      continue;
    }
    const product = schema?.['@graph']?.find((entry) => entry?.['@type'] === 'Product');
    if (!product) continue;
    const description = decodeHtml(product.description ?? '');
    const dimensionsRaw = (description.match(/Dimensions?\s*:\s*(.+?\s*cm)\b/i) ?? [])[1] ?? '';
    const year = Number((description.match(/Année de Création\s*:\s*(\d{4})/i) ?? [])[1]) || null;
    const certificateRaw = (description.match(/Certificat d.Authenticité\s*:\s*(Oui|Non)/i) ?? [])[1] ?? null;
    const technique = (description.match(/Technique\s*:\s*(.+?)\s+Matériaux\s*:/i) ?? [])[1] ?? null;
    const material = (description.match(/Matériaux\s*:\s*(.+?)\s+Dimensions?\s*:/i) ?? [])[1] ?? null;
    const productName = decodeHtml(product.name ?? '').replace(/\s+-\s+Carlay Art$/i, '');
    const images = (Array.isArray(product.image) ? product.image : [product.image])
      .filter(Boolean)
      .map((image) => relativeImagePath(typeof image === 'string' ? image : image.url))
      .filter(Boolean);
    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    records.push({
      source_path: `original-site/${file}`,
      title: productName,
      normalized_title: slugify(productName),
      price: offer?.price == null ? null : Number(offer.price),
      currency: offer?.priceCurrency ?? null,
      availability: /InStock$/i.test(offer?.availability ?? '') ? 'available' : /OutOfStock$/i.test(offer?.availability ?? '') ? 'sold' : 'unknown',
      dimensions: dimensionsRaw ? parseDimensions(dimensionsRaw) : null,
      year,
      technique,
      material,
      certificate: certificateRaw == null ? null : certificateRaw.toLowerCase() === 'oui',
      product_images: [...new Set(images)],
      description_snapshot: description || null,
    });
  }
  return records;
}

function parseClaudeClaims() {
  const markdown = read('CLAUDE.md');
  const section = (markdown.match(/## Artwork Collections \(Complete\)([\s\S]*?)\nAll works:/) ?? [])[1] ?? '';
  const rows = [];
  for (const line of section.split('\n')) {
    const match = line.match(/^\| \*\*(.+?)\*\* \| (.+?) \| (.+?) \| (.+?) \|$/);
    if (!match) continue;
    const worksRaw = match[2].trim();
    let claimedCount = 1;
    if (/^\d+\s*-\s*\d+$/.test(worksRaw)) {
      const [start, end] = worksRaw.split('-').map(Number);
      claimedCount = end - start + 1;
    } else if (worksRaw !== '—') {
      claimedCount = worksRaw.split(',').length;
    }
    rows.push({
      series_or_work: match[1],
      slug: slugify(match[1]),
      works_raw: worksRaw,
      claimed_count: claimedCount,
      price_claim: match[3].trim(),
      notes: match[4].trim(),
    });
  }
  return {
    source_path: 'CLAUDE.md',
    rows,
    global_claims: {
      medium: markdown.includes('All works: Acrylic on canvas') ? 'Acrylic on canvas' : null,
      certificate_included: markdown.includes('certificate of authenticity included') ? true : null,
    },
  };
}

function parsePreviewClaims() {
  const boutique = read('previews/boutique.html');
  const detail = read('previews/oeuvre.html');
  const cardTitles = [...boutique.matchAll(/card__title">([^<]+)/g)].map((match) => decodeHtml(match[1]));
  const detailTitle = decodeHtml((detail.match(/room__title">([^<]+)/) ?? [])[1] ?? '');
  const specs = Object.fromEntries([...detail.matchAll(/<li><span class="k">([^<]+)<\/span><span>([^<]+)<\/span><\/li>/g)]
    .map((match) => [decodeHtml(match[1]), decodeHtml(match[2])]));
  return {
    source_paths: ['previews/boutique.html', 'previews/oeuvre.html'],
    boutique_sample_titles: [...new Set(cardTitles)],
    detail_sample: {
      title: detailTitle || null,
      specs,
      status: 'visual-placeholder-not-authoritative',
    },
    route_behavior: 'all preview artwork links target the single oeuvre.html mockup',
  };
}

function listImageEvidence() {
  const manifest = JSON.parse(read('original-site/images/_manifest.json'));
  return readdirSync('original-site/images')
    .filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file))
    .sort()
    .map((file) => {
      const path = `original-site/images/${file}`;
      return {
        file,
        path,
        source_url: manifest[file] ?? null,
        bytes: statSync(path).size,
        ...imageSize(path),
        generated_size_variant: isGeneratedSize(file),
        family_stem: sizedStem(file),
      };
    });
}

function matchRecords(rootRecords, catalogRecords, detailRecords) {
  const unusedCatalog = new Set(catalogRecords);
  const unusedDetails = new Set(detailRecords);
  const byTitle = (records, title) => records.find((record) => record.normalized_title === title);
  const byImage = (records, imagePath) => records.find((record) => record.image_path === imagePath);

  const matches = rootRecords.map((root) => {
    let catalog = byTitle([...unusedCatalog], slugify(root.title));
    if (!catalog) catalog = byImage([...unusedCatalog], root.card_image_path);
    if (catalog) unusedCatalog.delete(catalog);

    let detail = byTitle([...unusedDetails], slugify(root.title));
    if (!detail && catalog) detail = byTitle([...unusedDetails], catalog.normalized_title);
    if (detail) unusedDetails.delete(detail);
    return { root, catalog: catalog ?? null, detail: detail ?? null };
  });
  return { matches, unmatchedCatalog: [...unusedCatalog], unmatchedDetails: [...unusedDetails] };
}

function generateAudit() {
  const rootRecords = parseRootCards();
  const catalogRecords = parseOriginalCatalog();
  const detailRecords = parseDetailPages();
  const claude = parseClaudeClaims();
  const previews = parsePreviewClaims();
  const imageEvidence = listImageEvidence();
  const imageByPath = new Map(imageEvidence.map((image) => [image.path, image]));
  const { matches, unmatchedCatalog, unmatchedDetails } = matchRecords(rootRecords, catalogRecords, detailRecords);

  const cardImageGroups = new Map();
  for (const { root } of matches) {
    const ids = cardImageGroups.get(root.card_image_path) ?? [];
    ids.push(root.id);
    cardImageGroups.set(root.card_image_path, ids);
  }

  const artworks = matches.map(({ root, catalog, detail }) => {
    const cardImage = imageByPath.get(root.card_image_path);
    if (!cardImage) throw new Error(`root card image missing: ${root.card_image_path}`);
    const family = imageEvidence.filter((image) => image.family_stem === cardImage.family_stem);
    const originalCandidates = family
      .filter((image) => !image.generated_size_variant)
      .sort((a, b) => (b.width * b.height) - (a.width * a.height));
    const fullCandidate = originalCandidates[0] ?? null;
    const duplicatedWith = (cardImageGroups.get(root.card_image_path) ?? []).filter((id) => id !== root.id);
    const physicalAspect = root.dimensions.width && root.dimensions.height
      ? root.dimensions.width / root.dimensions.height
      : null;
    const cardAspect = cardImage.width / cardImage.height;
    const fullAspect = fullCandidate ? fullCandidate.width / fullCandidate.height : null;
    const ratioDifference = (left, right) => left && right ? Math.abs(left - right) / right : null;
    const cardPhysicalDifference = ratioDifference(cardAspect, physicalAspect);
    const fullPhysicalDifference = ratioDifference(fullAspect, physicalAspect);
    const cardCropFidelity = cardImage.generated_size_variant && cardPhysicalDifference != null && cardPhysicalDifference > 0.05
      ? 'confirmed editorial crop: generated derivative aspect ratio differs from candidate physical dimensions'
      : cardImage.generated_size_variant
        ? 'generated WordPress derivative; crop behavior cannot be proven from filename alone'
        : 'original-filename file; uncropped status unverified';
    const fullAspectCheck = !fullCandidate
      ? 'not-applicable-no-full-candidate'
      : fullPhysicalDifference == null
        ? 'unknown-no-candidate-physical-dimensions'
        : fullPhysicalDifference <= 0.05
          ? 'aspect-ratio-consistent-with-candidate-dimensions'
          : 'aspect-ratio-conflicts-with-candidate-dimensions';
    const mediaConflicts = [];
    if (catalog?.image_path && catalog.image_path !== root.card_image_path) mediaConflicts.push('root card image differs from scraped catalog image');
    if (duplicatedWith.length) mediaConflicts.push('same root card image is assigned to another candidate identity');

    const conflicts = [];
    if (catalog) {
      if (catalog.price !== root.price) conflicts.push({ field: 'price', root_candidate: root.price, original_catalog: catalog.price });
      if (catalog.availability !== root.availability) conflicts.push({ field: 'availability', root_candidate: root.availability, original_catalog: catalog.availability });
      if (catalog.title !== root.raw_title && slugify(catalog.title) !== slugify(root.raw_title)) conflicts.push({ field: 'title', root_candidate: root.raw_title, original_catalog: catalog.title });
      if (catalog.image_path !== root.card_image_path) conflicts.push({ field: 'card_image', root_candidate: root.card_image_path, original_catalog: catalog.image_path });
    }
    if (detail) {
      if (detail.price != null && detail.price !== root.price) conflicts.push({ field: 'price_detail_snapshot', root_candidate: root.price, detail_snapshot: detail.price });
      if (detail.availability !== 'unknown' && detail.availability !== root.availability) conflicts.push({ field: 'availability_detail_snapshot', root_candidate: root.availability, detail_snapshot: detail.availability });
      if (detail.dimensions?.width && root.dimensions.width && (detail.dimensions.width !== root.dimensions.width || detail.dimensions.height !== root.dimensions.height)) {
        conflicts.push({ field: 'dimensions', root_candidate: root.dimensions.raw, detail_snapshot: detail.dimensions.raw });
      }
    }

    const missingRoles = [];
    if (!fullCandidate) missingRoles.push('full-work');
    missingRoles.push('detail-or-texture', 'back-or-edge', 'work-signature', 'room-scale');
    const physicalDimensionsMissing = root.dimensions.status !== 'candidate-parsed';
    const ownerPriority = [];
    if (!catalog) ownerPriority.push('identity and inclusion (root-only candidate)');
    if (duplicatedWith.length) ownerPriority.push('identity-to-image mapping');
    if (conflicts.some((conflict) => conflict.field.startsWith('price'))) ownerPriority.push('price conflict');
    if (conflicts.some((conflict) => conflict.field.startsWith('availability'))) ownerPriority.push('availability conflict');
    if (conflicts.some((conflict) => conflict.field === 'card_image')) ownerPriority.push('card image mapping conflict');
    if (physicalDimensionsMissing) ownerPriority.push('dimensions absent');
    if (!fullCandidate) ownerPriority.push('faithful full-work image absent');
    if (!ownerPriority.length) ownerPriority.push('candidate facts and media sign-off');

    const fidelity = duplicatedWith.length
      ? 'identity-image-collision; fidelity unresolved'
      : fullCandidate
        ? 'original-filename candidate present; uncropped fidelity requires visual/owner confirmation'
        : 'generated crop/thumbnail only; full-work fidelity unresolved';

    return {
      id: root.id,
      slug: root.slug,
      sort_order: root.sort_order,
      status: 'authoritative-candidate-not-owner-approved',
      candidate: {
        title: root.title,
        series: root.series,
        price: { amount: root.price, currency: 'EUR', display: root.price_display },
        dimensions: root.dimensions,
        availability: root.availability,
        source_path: 'boutique.html',
      },
      evidence: {
        original_catalog: catalog,
        original_detail_snapshot: detail,
      },
      conflicts,
      media: {
        card_image: {
          path: cardImage.path,
          width: cardImage.width,
          height: cardImage.height,
          bytes: cardImage.bytes,
          generated_size_variant: cardImage.generated_size_variant,
        },
        source_family_paths: family.map((image) => image.path),
        full_work_candidate: fullCandidate ? {
          path: fullCandidate.path,
          width: fullCandidate.width,
          height: fullCandidate.height,
          bytes: fullCandidate.bytes,
          status: 'candidate-only-not-verified-uncropped',
        } : null,
        card_crop_fidelity: cardCropFidelity,
        aspect_evidence: {
          candidate_physical_aspect_ratio: physicalAspect,
          card_image_aspect_ratio: cardAspect,
          full_candidate_aspect_ratio: fullAspect,
          full_candidate_check: fullAspectCheck,
        },
        fidelity,
        conflicts: mediaConflicts,
        duplicate_card_image_with: duplicatedWith,
        missing_roles: missingRoles,
      },
      factual_fields_requiring_owner_confirmation: [
        'stable identity and slug',
        'series and title',
        'price and currency',
        'availability',
        'medium and materials',
        'year',
        'width, height, depth, and unit',
        'condition',
        'framing status',
        'certificate status',
        'signature placement',
        'image role and uncropped full-work fidelity',
      ],
      owner_review_priority: ownerPriority,
    };
  });

  const conflictRecords = artworks.filter((artwork) => artwork.conflicts.length > 0);
  const rootOnly = artworks.filter((artwork) => !artwork.evidence.original_catalog);
  const duplicatedGroups = [...cardImageGroups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([image_path, ids]) => ({ image_path, candidate_ids: ids }));
  const originalManifest = JSON.parse(read('original-site/images/_manifest.json'));
  const scrapeSummary = JSON.parse(read('original-site/scrape-summary.json'));

  const audit = {
    schema_version: 'phase-0-authoritative-candidate-v1',
    baseline_commit: BASELINE_COMMIT,
    status: 'candidate-not-owner-approved-do-not-use-for-live-commerce',
    intended_grain: 'one root boutique.html card per candidate artwork identity',
    source_precedence: [
      'boutique.html defines candidate rows only; it is not owner approval',
      'original-site/boutique.html and original-site/boutique_*.html are dated comparison evidence',
      'original-site/images supplies candidate media and generated variants',
      'CLAUDE.md contains broad claims requiring owner confirmation',
      'previews are visual references and placeholder content, never inventory truth',
    ],
    summary: {
      root_candidate_count: artworks.length,
      root_available_count: artworks.filter((artwork) => artwork.candidate.availability === 'available').length,
      root_sold_count: artworks.filter((artwork) => artwork.candidate.availability === 'sold').length,
      original_catalog_count: catalogRecords.length,
      matched_to_original_catalog_count: artworks.length - rootOnly.length,
      root_only_candidate_count: rootOnly.length,
      original_catalog_only_count: unmatchedCatalog.length,
      records_with_any_source_conflict: conflictRecords.length,
      records_with_price_conflict: artworks.filter((artwork) => artwork.conflicts.some((conflict) => conflict.field.startsWith('price'))).length,
      records_with_availability_conflict: artworks.filter((artwork) => artwork.conflicts.some((conflict) => conflict.field.startsWith('availability'))).length,
      duplicate_card_image_group_count: duplicatedGroups.length,
      records_in_duplicate_card_image_groups: artworks.filter((artwork) => artwork.media.duplicate_card_image_with.length > 0).length,
      records_with_candidate_full_work_file: artworks.filter((artwork) => artwork.media.full_work_candidate).length,
      records_without_candidate_full_work_file: artworks.filter((artwork) => !artwork.media.full_work_candidate).length,
      records_missing_physical_dimensions: artworks.filter((artwork) => artwork.candidate.dimensions.status !== 'candidate-parsed').length,
      records_missing_detail_back_signature_room_media: artworks.filter((artwork) => ['detail-or-texture', 'back-or-edge', 'work-signature', 'room-scale'].every((role) => artwork.media.missing_roles.includes(role))).length,
      original_detail_page_snapshot_count: detailRecords.length,
      local_artwork_and_site_image_file_count: imageEvidence.length,
      manifest_entry_count: Object.keys(originalManifest).length,
      scrape_images_found: scrapeSummary.stats.imagesFound,
      scrape_images_downloaded: scrapeSummary.stats.imagesDownloaded,
      scrape_images_failed: scrapeSummary.stats.imagesFailed,
    },
    source_audit: {
      root_boutique: {
        path: 'boutique.html',
        role: 'authoritative candidate row source per implementation plan',
        caveat: 'contains conflicts and identity-image collisions; requires owner review before content generation',
      },
      original_site: {
        catalog_path: 'original-site/boutique.html',
        detail_page_paths: detailRecords.map((record) => record.source_path),
        scrape_summary_path: 'original-site/scrape-summary.json',
        scraped_at: scrapeSummary.scrapedAt,
        unmatched_catalog_records: unmatchedCatalog,
        unmatched_detail_records: unmatchedDetails,
      },
      claude_md: claude,
      previews,
    },
    duplicate_card_image_groups: duplicatedGroups,
    artworks,
  };

  audit.source_audit.claude_md.audit_findings = [
    'Splatsh claims works 1 and 3 (two works), while the root candidate has Splatsh 1, 2, and 3; Splatsh 2 and 3 share one image.',
    'Purple Dream claims works 1 and 2, while the root candidate has one unnumbered Purple Dream and omits the catalog Purple Dreams 2 record.',
    'Free Spirit and Elastic each claim three works, but the root assigns the same three image paths to both series and the scraped catalog contains only Free Spirit.',
    'The broad price table conflicts with root and/or scraped-catalog prices and is not safe to use as per-work evidence.',
    'The global acrylic-on-canvas and certificate-included claims require per-work owner confirmation.',
  ];
  audit.source_audit.previews.audit_findings = [
    `${previews.boutique_sample_titles.length} unique artwork titles appear in the Boutique preview; it is not a complete inventory.`,
    'All artwork links in the preview route to the same Vortex 5 detail mockup.',
    'Vortex 5 year, technique, dimensions, and certificate copy are placeholder/snapshot claims pending owner confirmation.',
  ];

  validateAudit(audit);
  return audit;
}

function validateAudit(audit) {
  const ids = audit.artworks.map((artwork) => artwork.id);
  const slugs = audit.artworks.map((artwork) => artwork.slug);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate candidate IDs');
  if (new Set(slugs).size !== slugs.length) throw new Error('duplicate candidate slugs');
  if (audit.artworks.length !== 60) throw new Error(`expected 60 candidate rows, found ${audit.artworks.length}`);
  for (const artwork of audit.artworks) {
    if (!existsSync(artwork.media.card_image.path)) throw new Error(`missing card image: ${artwork.media.card_image.path}`);
    if (artwork.media.full_work_candidate && !existsSync(artwork.media.full_work_candidate.path)) {
      throw new Error(`missing full-work candidate: ${artwork.media.full_work_candidate.path}`);
    }
    if (!['available', 'sold', 'not-for-sale'].includes(artwork.candidate.availability)) {
      throw new Error(`invalid availability for ${artwork.id}`);
    }
    if (!(artwork.candidate.price.amount > 0)) throw new Error(`invalid price for ${artwork.id}`);
  }
}

function code(value) {
  return `\`${String(value).replaceAll('`', '\\`')}\``;
}

function formatMoney(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price).replace('€', '€');
}

function buildReport(audit) {
  const s = audit.summary;
  const lines = [
    '# Phase 0 artwork inventory and fidelity review',
    '',
    `Baseline: ${code(audit.baseline_commit.slice(0, 7))}. Generated by ${code('node scripts/audit-artwork-inventory.mjs --write')}.`,
    '',
    '> Status: authoritative **candidate**, not owner-approved inventory. Do not generate live-commerce records from it until the owner resolves the flagged identity, price, availability, dimensions, and media questions.',
    '',
    '## Outcome',
    '',
    `Root ${code('boutique.html')} contains **${s.root_candidate_count}** candidate cards (${s.root_available_count} available, ${s.root_sold_count} sold). Only **${s.matched_to_original_catalog_count}** reconcile to the ${s.original_catalog_count}-item scraped catalog; **${s.root_only_candidate_count} root-only** candidates replace **${s.original_catalog_only_count} catalog-only** records. ${s.records_with_any_source_conflict} matched candidates have at least one source conflict.`,
    '',
    `Media is not implementation-ready: ${s.records_without_candidate_full_work_file} records have only a generated crop/thumbnail, ${s.duplicate_card_image_group_count} repeated-image groups affect ${s.records_in_duplicate_card_image_groups} candidate identities, and all ${s.records_missing_detail_back_signature_room_media} records lack work-specific detail/texture, back/edge, signature, and room-scale views. An “original filename” is only a candidate full-work file; uncropped fidelity still needs visual and owner confirmation.`,
    '',
    '## Source authority and limits',
    '',
    '| Source | Use in this audit | Limit |',
    '|---|---|---|',
    `| ${code('boutique.html')} | Defines the 60 candidate rows and current candidate sold/available state | Not owner-approved; contains collisions, exclusions, additions, and normalized prices |`,
    `| ${code('original-site/boutique.html')} | Dated WooCommerce catalog comparison | Snapshot scraped ${audit.source_audit.original_site.scraped_at}; not necessarily current |`,
    `| ${code('original-site/boutique_*.html')} | ${s.original_detail_page_snapshot_count} product-detail snapshots with product metadata | Partial coverage; claims remain owner-unverified |`,
    `| ${code('original-site/images/')} | ${s.local_artwork_and_site_image_file_count} raster assets and WordPress derivatives | ${s.scrape_images_found} found, ${s.scrape_images_downloaded} downloaded, ${s.scrape_images_failed} failed; filenames do not prove subject, crop, or role |`,
    `| ${code('CLAUDE.md')} | Broad series/count/price and global acrylic/certificate claims | Conflicts with both inventories; global claims are not per-work evidence |`,
    `| ${code('previews/')} | Art-direction reference and sample content | Boutique is a sample; every artwork link targets one Vortex 5 mock detail page |`,
    '',
    '## Source-specific findings',
    '',
    '- `CLAUDE.md` is not a clean fallback inventory: it describes two Splatsh works while root has three, two Purple Dream works while root has one unnumbered work, and both Free Spirit and Elastic even though those six root rows reuse only three images. Its price and global certificate/medium claims need per-work owner approval.',
    `- The Boutique preview contains only ${audit.source_audit.previews.boutique_sample_titles.length} unique sample titles and routes them to one Vortex 5 mock detail page. Its Vortex 5 year/technique/certificate copy is not authoritative.`,
    `- Every one of the ${s.original_detail_page_snapshot_count} scraped detail pages exposes only one product image in its structured product record. No work-specific supporting view is evidenced there.`,
    '',
    '## Highest-priority owner decisions',
    '',
    `1. Decide the six root-only candidates: ${audit.artworks.filter((artwork) => !artwork.evidence.original_catalog).map((artwork) => code(artwork.slug)).join(', ')}.`,
    `2. Decide the six catalog-only records omitted from root: ${audit.source_audit.original_site.unmatched_catalog_records.map((record) => code(record.slug)).join(', ')}.`,
    `3. Resolve the repeated-image groups: ${audit.duplicate_card_image_groups.map((group) => `${code(group.image_path)} → ${group.candidate_ids.map(code).join(' / ')}`).join('; ')}.`,
    `4. Resolve ${s.records_with_price_conflict} price conflicts and re-confirm all availability states before the Phase 1 schema can fail closed safely. The matched snapshots show ${s.records_with_availability_conflict} availability disagreements, but agreement between snapshots is not owner approval.`,
    `5. Supply or approve faithful full-work media for ${s.records_without_candidate_full_work_file} records, then classify every image as full, card crop, detail, back/edge, work signature, or room-scale.`,
    `6. Confirm physical dimensions for ${s.records_missing_physical_dimensions} records; ${code('Acrylique sur toile')} currently occupies the dimensions slot and must not be parsed as a size.`,
    '',
    '## Human review matrix',
    '',
    'Missing-media codes: **F** full work, **D** detail/texture, **B** back/edge, **S** work signature, **R** room scale. “Full candidate” means only that an unsuffixed source file exists; it does not prove the image is uncropped.',
    '',
    'Every row requires owner confirmation of stable identity/slug, series/title, price/currency, availability, medium/materials, year, dimensions/depth/unit, condition, framing, certificate, signature placement, and image role/fidelity. The final column calls out the row-specific priority.',
    '',
    '| ID / slug | Series / title | Price evidence | Dimensions | Availability evidence | Source images (card → full candidate) | Fidelity / missing media | Owner review priority |',
    '|---|---|---:|---|---|---|---|---|',
  ];

  for (const artwork of audit.artworks) {
    const c = artwork.candidate;
    const catalog = artwork.evidence.original_catalog;
    const detail = artwork.evidence.original_detail_snapshot;
    const priceEvidence = catalog && catalog.price !== c.price.amount
      ? `${formatMoney(c.price.amount)} root; ${formatMoney(catalog.price)} catalog **CONFLICT**`
      : `${formatMoney(c.price.amount)} root${catalog ? '; agrees catalog' : '; no catalog match'}`;
    const dimensions = c.dimensions.status === 'candidate-parsed'
      ? `${c.dimensions.width} × ${c.dimensions.height}${c.dimensions.depth ? ` × ${c.dimensions.depth}` : ''} ${c.dimensions.unit ?? ''}${detail?.dimensions ? `; detail ${detail.dimensions.raw}` : ''}`
      : `Missing; raw slot: ${code(c.dimensions.raw)}`;
    const availability = catalog && catalog.availability !== c.availability
      ? `${c.availability} root; ${catalog.availability} catalog **CONFLICT**`
      : `${c.availability} root${catalog ? '; agrees catalog' : '; no catalog match'}`;
    const full = artwork.media.full_work_candidate?.path ?? 'none';
    const missingCodes = artwork.media.missing_roles.map((role) => ({
      'full-work': 'F',
      'detail-or-texture': 'D',
      'back-or-edge': 'B',
      'work-signature': 'S',
      'room-scale': 'R',
    })[role]).join('');
    lines.push(`| ${code(artwork.id)}<br>${code(artwork.slug)} | ${c.series.name}<br>${c.title} | ${priceEvidence} | ${dimensions} | ${availability} | ${code(artwork.media.card_image.path)}<br>→ ${code(full)} | Card: ${artwork.media.card_crop_fidelity}<br>Full: ${artwork.media.fidelity}; ${artwork.media.aspect_evidence.full_candidate_check}<br>Missing: **${missingCodes}** | ${artwork.owner_review_priority.join('; ')} |`);
  }

  lines.push(
    '',
    '## Validation and integration contract',
    '',
    `- Run ${code('node scripts/audit-artwork-inventory.mjs --check')} before consuming the candidate file. It verifies deterministic outputs, 60 unique IDs/slugs, valid candidate prices/states, and resolvable image paths.`,
    `- Phase 1 should consume ${code(JSON_OUT)} only after owner decisions are recorded. Until then, fail closed: no ${code('available')} candidate is purchasable merely because the root card says so.`,
    '- Preserve `evidence`, `conflicts`, `missing_roles`, and `factual_fields_requiring_owner_confirmation` in the foundation import or in an adjacent review ledger; do not flatten uncertainty away.',
    '- Generate one artwork route per approved stable slug. Do not create routes for omitted catalog records or root-only candidates until their inclusion is approved.',
    '- Treat `media.full_work_candidate` as a review lead, not a production `mainImage`. A reviewer must verify that it shows the full, uncropped work and the correct identity.',
    '- The preview Vortex 5 year, technique, and certificate copy remains snapshot evidence only. Do not propagate it to other works.',
    '',
    '## Exit-gate status',
    '',
    '**Not passed.** Candidate IDs/slugs are mechanically unique, but duplicate inventory identity and media mapping are not resolved; missing facts and media are now explicit. This audit prevents previews and broad documentation claims from being treated as source-of-truth content.',
  );
  return `${lines.join('\n')}\n`;
}

const audit = generateAudit();
const json = `${JSON.stringify(audit, null, 2)}\n`;
const report = buildReport(audit);

if (mode === '--write') {
  mkdirSync('data', { recursive: true });
  mkdirSync('docs/audits', { recursive: true });
  writeFileSync(JSON_OUT, json);
  writeFileSync(REPORT_OUT, report);
  console.log(`wrote ${JSON_OUT}`);
  console.log(`wrote ${REPORT_OUT}`);
} else {
  for (const [path, expected] of [[JSON_OUT, json], [REPORT_OUT, report]]) {
    if (!existsSync(path)) throw new Error(`missing generated deliverable: ${path}`);
    if (read(path) !== expected) throw new Error(`generated deliverable is stale: ${path}; run with --write`);
  }
  console.log(`inventory audit valid: ${audit.summary.root_candidate_count} candidates, ${audit.summary.records_with_any_source_conflict} records with conflicts`);
  console.log(`media audit: ${audit.summary.records_without_candidate_full_work_file} without full-work candidate, ${audit.summary.duplicate_card_image_group_count} duplicate-image groups`);
}
