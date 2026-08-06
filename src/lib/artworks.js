export function validateArtworkInventory(artworks, { assetExists = () => true } = {}) {
  const ids = new Set();
  const slugs = new Set();

  for (const artwork of artworks) {
    if (ids.has(artwork.id)) throw new Error(`Duplicate artwork ID: ${artwork.id}`);
    if (slugs.has(artwork.slug)) throw new Error(`Duplicate artwork slug: ${artwork.slug}`);
    ids.add(artwork.id);
    slugs.add(artwork.slug);

    if (!Number.isFinite(artwork.price?.amount) || artwork.price.amount <= 0) {
      throw new Error(`Invalid price for ${artwork.slug}`);
    }

    const images = [artwork.images?.card, artwork.images?.full, ...(artwork.images?.details ?? [])].filter(
      (image) => image?.src,
    );
    for (const image of images) {
      if (!assetExists(image.src)) throw new Error(`Unresolved image for ${artwork.slug}: ${image.src}`);
      if (!image.alt) throw new Error(`Missing image alt text for ${artwork.slug}: ${image.src}`);
    }

    if (artwork.availability === 'available' && !artwork.images?.full?.src) {
      throw new Error(`Available artwork ${artwork.slug} is missing a faithful full-work image.`);
    }
  }

  return artworks;
}

export function isCommerceEligible(artwork) {
  return (
    artwork.availability === 'available' &&
    artwork.availabilityReviewStatus === 'owner-approved' &&
    artwork.price?.reviewStatus === 'owner-approved' &&
    Boolean(artwork.images?.full?.src) &&
    artwork.images.full.reviewStatus === 'owner-approved' &&
    artwork.condition?.reviewStatus === 'owner-approved' &&
    artwork.framingStatus?.reviewStatus === 'owner-approved' &&
    artwork.certificateStatus?.reviewStatus === 'owner-approved'
  );
}

// Compatibility name for Phase 4 consumers. Commerce must continue to flow
// through the centralized predicate above rather than checking availability.
export const isPurchasable = isCommerceEligible;

export function availabilityLabel(artwork) {
  if (artwork.availability === 'sold') return 'Vendu';
  if (isCommerceEligible(artwork)) return 'Disponible';
  return 'En validation';
}

export function dimensionsLabel(artwork) {
  const { width, height, depth, unit } = artwork.dimensions;
  if (!width || !height) return 'À confirmer';
  return `${width} × ${height}${depth ? ` × ${depth}` : ''} ${unit}`;
}

export function reviewLabel(reviewStatus) {
  const labels = {
    'owner-approved': 'Validé par la propriétaire',
    'legacy-source': 'Source catalogue historique',
    'needs-owner-review': 'Validation propriétaire requise',
    draft: 'Brouillon à valider',
  };
  return labels[reviewStatus] ?? 'Statut de validation inconnu';
}

export function reviewedFactLabel(value, reviewStatus) {
  if (value === null || value === undefined || value === '') return 'À confirmer';
  if (String(value) === 'À confirmer') return 'À confirmer';
  return reviewStatus === 'owner-approved' ? String(value) : `${value} · À confirmer`;
}
