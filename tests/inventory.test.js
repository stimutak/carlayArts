import { describe, expect, it } from 'vitest';
import { additionDecision, commerceEligibilityIssues, createInventoryIndex, isCommerceEligible } from '../src/lib/inventory.js';

const approvedFact = (value) => ({ value, reviewStatus: 'owner-approved' });

const work = (overrides = {}) => ({
  id: 'work-1', slug: 'work-1', title: 'Work 1', series: 'Test',
  availability: 'available', price: { amount: 1000, currency: 'EUR' },
  image: { src: '/artworks/test.jpg', alt: 'Work 1' }, ...overrides,
  availabilityReviewStatus: 'owner-approved',
  price: { amount: 1000, currency: 'EUR', reviewStatus: 'owner-approved' },
  medium: approvedFact('Acrylique sur toile'),
  year: approvedFact(2026),
  dimensions: { width: 30, height: 40, unit: 'cm', reviewStatus: 'owner-approved' },
  signaturePlacement: approvedFact('Dos'),
  condition: approvedFact('Neuve'),
  framingStatus: approvedFact('Non encadrée'),
  certificateStatus: approvedFact('Inclus'),
  images: {
    full: { src: '/full.jpg', alt: 'Work 1 intégrale', reviewStatus: 'owner-approved' },
    details: [{ src: '/detail.jpg', alt: 'Détail Work 1', reviewStatus: 'owner-approved' }],
  },
  ...overrides,
});

describe('runtime inventory gate', () => {
  it('allows only authoritative available records', () => {
    const index = createInventoryIndex([
      work(),
      work({ id: 'sold', slug: 'sold', availability: 'sold' }),
      work({ id: 'held', slug: 'held', availability: 'not-for-sale' }),
    ]);
    expect(additionDecision(index, 'work-1').ok).toBe(true);
    expect(additionDecision(index, 'sold').reason).toBe('sold');
    expect(additionDecision(index, 'held').reason).toBe('not-for-sale');
    expect(additionDecision(index, 'invented').reason).toBe('unknown');
  });

  it('rejects malformed availability and duplicate identity', () => {
    expect(() => createInventoryIndex([work({ availability: 'maybe' })])).toThrow(/availability/i);
    expect(() => createInventoryIndex([work(), work({ slug: 'other' })])).toThrow(/Duplicate inventory ID/);
  });

  it('requires approved provenance and verified full/detail media', () => {
    expect(isCommerceEligible(work())).toBe(true);
    expect(isCommerceEligible(work({ price: { amount: 1000, currency: 'EUR', reviewStatus: 'legacy-source' } }))).toBe(false);
    expect(isCommerceEligible(work({ images: { full: null, details: [] } }))).toBe(false);
  });

  it('accepts a zoom region in place of a detail photograph, above the resolution floor', () => {
    const bigFull = { src: '/full.jpg', alt: 'Work 1 intégrale', width: 1501, height: 2000, reviewStatus: 'owner-approved' };
    const smallFull = { ...bigFull, width: 600, height: 600 };
    const approvedZoom = { mode: 'full-image', rect: null, reviewStatus: 'owner-approved' };

    // Work that has left the studio cannot be re-shot, so a zoom on a
    // high-resolution primary image stands in for the detail photograph.
    expect(isCommerceEligible(work({ images: { full: bigFull, details: [], zoom: approvedZoom } }))).toBe(true);

    // Below the floor a zoom shows compression artefacts, not brushwork.
    expect(isCommerceEligible(work({ images: { full: smallFull, details: [], zoom: approvedZoom } }))).toBe(false);
    expect(commerceEligibilityIssues(work({ images: { full: smallFull, details: [], zoom: approvedZoom } })))
      .toContain('media:no-inspectable-detail');

    // An unapproved zoom is not a substitute.
    expect(isCommerceEligible(work({
      images: { full: bigFull, details: [], zoom: { ...approvedZoom, reviewStatus: 'draft' } },
    }))).toBe(false);

    // Neither route present.
    expect(isCommerceEligible(work({ images: { full: bigFull, details: [], zoom: null } }))).toBe(false);
  });
});
