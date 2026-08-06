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
