import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { availabilityLabel, dimensionsLabel, isCommerceEligible, validateArtworkInventory } from '../src/lib/artworks.js';

const contentDir = join(process.cwd(), 'src/content/artworks');
const records = readdirSync(contentDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(join(contentDir, file), 'utf8')));

describe('artwork content foundation', () => {
  it('contains one unique, stable record per legacy catalog work', () => {
    expect(records).toHaveLength(60);
    expect(new Set(records.map((artwork) => artwork.id))).toHaveLength(records.length);
    expect(new Set(records.map((artwork) => artwork.slug))).toHaveLength(records.length);
    for (const artwork of records) {
      expect(artwork.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(artwork.id).toBe(`legacy-${artwork.slug}`);
      expect(artwork.title).not.toMatch(/^[A-Z\d -]{3,}$/);
      expect(artwork.price.amount).toBeGreaterThan(0);
      expect(artwork.price.currency).toBe('EUR');
    }
  });

  it('keeps sold works sold and all unapproved inventory fail-closed', () => {
    const bySlug = Object.fromEntries(records.map((artwork) => [artwork.slug, artwork]));
    expect(bySlug['romeo-1'].availability).toBe('sold');
    expect(bySlug['juliette-1'].availability).toBe('sold');
    expect(bySlug['vortex-2'].availability).toBe('sold');
    expect(bySlug['vortex-5'].availability).toBe('not-for-sale');
    expect(bySlug['insomnia-5'].availability).toBe('not-for-sale');
    expect(records.some((artwork) => artwork.availability === 'available')).toBe(false);
    expect(records.some((artwork) => isCommerceEligible(artwork))).toBe(false);
    expect(availabilityLabel(bySlug['romeo-1'])).toBe('Vendu');
    expect(availabilityLabel(bySlug['vortex-5'])).toBe('En validation');
  });

  it('formats known and unresolved dimensions without filling missing facts', () => {
    const bySlug = Object.fromEntries(records.map((artwork) => [artwork.slug, artwork]));
    expect(dimensionsLabel(bySlug['vortex-5'])).toBe('32 × 32 cm');
    expect(dimensionsLabel(bySlug['insomnia-5'])).toBe('À confirmer');
  });

  it('centralizes commerce eligibility across approval, media, and trust facts', () => {
    const eligible = structuredClone(records.find((artwork) => artwork.availability === 'not-for-sale'));
    eligible.availability = 'available';
    eligible.availabilityReviewStatus = 'owner-approved';
    eligible.price.reviewStatus = 'owner-approved';
    eligible.images.full = { src: '/artworks/VORTEX-5.jpg', alt: 'Vue intégrale vérifiée', reviewStatus: 'owner-approved' };
    eligible.condition = { value: 'Validé', reviewStatus: 'owner-approved' };
    eligible.framingStatus = { value: 'Non encadrée', reviewStatus: 'owner-approved' };
    eligible.certificateStatus = { value: 'Inclus', reviewStatus: 'owner-approved' };
    expect(isCommerceEligible(eligible)).toBe(true);
    eligible.certificateStatus.reviewStatus = 'needs-owner-review';
    expect(isCommerceEligible(eligible)).toBe(false);
  });

  it('tracks unresolved facts instead of omitting or fabricating them', () => {
    for (const artwork of records) {
      expect(artwork.year).toEqual({ value: null, reviewStatus: 'needs-owner-review' });
      expect(artwork.images.full).toEqual({ src: null, alt: null, reviewStatus: 'needs-owner-review' });
      expect(artwork.workNote.reviewStatus).toBe('draft');
      expect(artwork.seriesStatementRef.reviewStatus).toBe('draft');
      expect(artwork.signaturePlacement.reviewStatus).toBe('needs-owner-review');
    }
  });

  it('resolves every declared local image', () => {
    expect(() =>
      validateArtworkInventory(records, {
        assetExists: (imagePath) => existsSync(join(process.cwd(), 'public', imagePath.replace(/^\/+/, ''))),
      }),
    ).not.toThrow();
  });
});

describe('inventory validator', () => {
  it('rejects duplicate ids and slugs', () => {
    const duplicate = structuredClone(records[0]);
    duplicate.slug = 'otherwise-unique';
    expect(() => validateArtworkInventory([records[0], duplicate])).toThrow(/Duplicate artwork ID/);

    duplicate.id = 'otherwise-unique';
    duplicate.slug = records[0].slug;
    expect(() => validateArtworkInventory([records[0], duplicate])).toThrow(/Duplicate artwork slug/);
  });

  it('rejects invalid prices, missing assets, and available works without faithful media', () => {
    const invalidPrice = structuredClone(records[0]);
    invalidPrice.price.amount = 0;
    expect(() => validateArtworkInventory([invalidPrice])).toThrow(/Invalid price/);

    expect(() => validateArtworkInventory([records[0]], { assetExists: () => false })).toThrow(/Unresolved image/);

    const unsafeAvailable = structuredClone(records.find((artwork) => artwork.availability === 'not-for-sale'));
    unsafeAvailable.availability = 'available';
    expect(() => validateArtworkInventory([unsafeAvailable])).toThrow(/missing a faithful full-work image/);

    const unapprovedAvailable = structuredClone(unsafeAvailable);
    unapprovedAvailable.images.full = { ...unapprovedAvailable.images.card };
    unapprovedAvailable.images.details = [{ ...unapprovedAvailable.images.card }];
    expect(() => validateArtworkInventory([unapprovedAvailable])).toThrow(/not commerce eligible/);
  });
});
