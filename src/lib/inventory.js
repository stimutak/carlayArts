const AVAILABILITY = new Set(['available', 'sold', 'not-for-sale']);
const APPROVED = 'owner-approved';

const approvedFact = (fact, { numeric = false } = {}) => fact?.reviewStatus === APPROVED
  && (numeric ? Number.isFinite(fact.value) : typeof fact.value === 'string' && fact.value.trim().length > 0);

export function commerceEligibilityIssues(artwork) {
  const issues = [];
  if (artwork?.availability !== 'available') issues.push('availability:not-available');
  if (artwork?.availabilityReviewStatus !== APPROVED) issues.push('availability:not-owner-approved');
  if (artwork?.price?.reviewStatus !== APPROVED) issues.push('price:not-owner-approved');
  if (!Number.isFinite(artwork?.price?.amount) || artwork.price.amount <= 0 || !artwork?.price?.currency) issues.push('price:invalid');
  if (!approvedFact(artwork?.medium)) issues.push('medium:not-owner-approved');
  if (!approvedFact(artwork?.year, { numeric: true })) issues.push('year:not-owner-approved');
  if (
    artwork?.dimensions?.reviewStatus !== APPROVED
    || !Number.isFinite(artwork?.dimensions?.width)
    || !Number.isFinite(artwork?.dimensions?.height)
    || !artwork?.dimensions?.unit
  ) issues.push('dimensions:not-owner-approved');
  for (const [name, fact] of [
    ['signature', artwork?.signaturePlacement],
    ['condition', artwork?.condition],
    ['framing', artwork?.framingStatus],
    ['certificate', artwork?.certificateStatus],
  ]) {
    if (!approvedFact(fact)) issues.push(`${name}:not-owner-approved`);
  }
  const full = artwork?.images?.full;
  if (!full?.src || !full?.alt || full.reviewStatus !== APPROVED) issues.push('media:full-work-not-verified');
  const details = artwork?.images?.details ?? [];
  if (!details.some((image) => image?.src && image?.alt && image.reviewStatus === APPROVED)) {
    issues.push('media:verified-detail-required');
  }
  return issues;
}

export function isCommerceEligible(artwork) {
  return commerceEligibilityIssues(artwork).length === 0;
}

export function normalizeInventoryItem(artwork) {
  if (!artwork || typeof artwork !== 'object') throw new TypeError('Artwork inventory entry is required.');
  if (!artwork.id || !artwork.slug || !artwork.title) throw new TypeError('Artwork inventory identity is incomplete.');
  if (!AVAILABILITY.has(artwork.availability)) throw new TypeError(`Invalid availability for ${artwork.id}.`);

  const amount = artwork.price?.amount;
  const currency = artwork.price?.currency;
  if (!Number.isFinite(amount) || amount <= 0 || typeof currency !== 'string') {
    throw new TypeError(`Invalid price for ${artwork.id}.`);
  }

  const sourceImage = artwork.image ?? artwork.images?.card;
  return Object.freeze({
    id: artwork.id,
    slug: artwork.slug,
    title: artwork.title,
    series: artwork.series ?? '',
    availability: artwork.availability,
    availabilityReviewStatus: artwork.availabilityReviewStatus,
    price: Object.freeze({ amount, currency, reviewStatus: artwork.price.reviewStatus }),
    medium: artwork.medium,
    year: artwork.year,
    dimensions: artwork.dimensions,
    signaturePlacement: artwork.signaturePlacement,
    condition: artwork.condition,
    framingStatus: artwork.framingStatus,
    certificateStatus: artwork.certificateStatus,
    images: artwork.images,
    image: sourceImage?.src
      ? Object.freeze({ src: sourceImage.src, alt: sourceImage.alt || artwork.title })
      : null,
  });
}

export function createInventoryIndex(records = []) {
  const index = new Map();
  const slugs = new Set();

  for (const record of records) {
    const item = normalizeInventoryItem(record);
    if (index.has(item.id)) throw new Error(`Duplicate inventory ID: ${item.id}`);
    if (slugs.has(item.slug)) throw new Error(`Duplicate inventory slug: ${item.slug}`);
    index.set(item.id, item);
    slugs.add(item.slug);
  }

  return index;
}

export function additionDecision(index, reference) {
  const requestedId = typeof reference === 'string' ? reference : reference?.id;
  const requestedSlug = typeof reference === 'object' ? reference?.slug : null;
  const item = requestedId
    ? index.get(requestedId)
    : [...index.values()].find((candidate) => candidate.slug === requestedSlug);

  if (!item) return { ok: false, reason: 'unknown', item: null };
  if (item.availability === 'sold') return { ok: false, reason: 'sold', item };
  if (!isCommerceEligible(item)) return { ok: false, reason: 'not-for-sale', item };
  return { ok: true, reason: null, item };
}
