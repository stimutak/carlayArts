import { describe, expect, it } from 'vitest';
import { applyOwnerApproval, approvalBlockers, isReadyToSell } from '../src/lib/approvals.js';
import { isCommerceEligible } from '../src/lib/inventory.js';

const fact = (value, reviewStatus = 'draft') => ({ value, reviewStatus });

const complete = (overrides = {}) => ({
  availability: 'available',
  availabilityReviewStatus: 'needs-owner-review',
  price: { amount: 1000, currency: 'EUR', reviewStatus: 'legacy-source' },
  medium: fact('Acrylique sur toile'),
  year: { value: 2023, reviewStatus: 'needs-owner-review' },
  dimensions: { width: 60, height: 80, depth: null, unit: 'cm', reviewStatus: 'legacy-source' },
  signaturePlacement: fact('Au dos'),
  condition: fact('Excellent'),
  framingStatus: fact('Non encadrée'),
  certificateStatus: fact('Inclus'),
  images: {
    full: { src: '/artworks/a.jpg', alt: 'Une œuvre', width: 1499, height: 2000, reviewStatus: 'legacy-source' },
    details: [],
    zoom: { mode: 'full-image', rect: null, reviewStatus: 'draft' },
  },
  ownerApproval: { readyToSell: true, approvedAt: '2026-09-04', note: null },
  ...overrides,
});

describe('owner approval', () => {
  it('expands one decision into the stamps the commerce gate reads', () => {
    const artwork = applyOwnerApproval(complete());
    expect(artwork.availabilityReviewStatus).toBe('owner-approved');
    expect(artwork.price.reviewStatus).toBe('owner-approved');
    expect(artwork.year.reviewStatus).toBe('owner-approved');
    expect(artwork.dimensions.reviewStatus).toBe('owner-approved');
    expect(artwork.certificateStatus.reviewStatus).toBe('owner-approved');
    expect(artwork.images.full.reviewStatus).toBe('owner-approved');
    expect(artwork.images.zoom.reviewStatus).toBe('owner-approved');
    expect(isCommerceEligible(artwork)).toBe(true);
  });

  it('changes nothing until the switch is set', () => {
    const pending = complete({ ownerApproval: { readyToSell: false, approvedAt: null, note: null } });
    expect(applyOwnerApproval(pending)).toEqual(pending);
    expect(isCommerceEligible(applyOwnerApproval(pending))).toBe(false);
  });

  it('refuses to stamp a fact that has no value, even when marked ready', () => {
    // The switch is a signature, not an override: a blank year stays unapproved
    // and the work stays unsellable.
    const missingYear = complete({ year: { value: null, reviewStatus: 'needs-owner-review' } });
    const stamped = applyOwnerApproval(missingYear);
    expect(stamped.year.reviewStatus).toBe('needs-owner-review');
    expect(isCommerceEligible(stamped)).toBe(false);
    expect(isReadyToSell(missingYear)).toBe(false);
  });

  it('names what is missing in the artist’s language, not gate keys', () => {
    const blockers = approvalBlockers(complete({
      year: { value: null, reviewStatus: 'needs-owner-review' },
      condition: fact(''),
    }));
    expect(blockers).toContain('Indiquez l’année de réalisation.');
    expect(blockers).toContain('Indiquez l’état de l’œuvre.');
    expect(blockers.join(' ')).not.toMatch(/owner-approved|not-available|media:/);
  });

  it('explains the zoom resolution floor with the actual measurement', () => {
    const tooSmall = complete({
      images: {
        full: { src: '/a.jpg', alt: 'Une œuvre', width: 600, height: 600, reviewStatus: 'legacy-source' },
        details: [],
        zoom: { mode: 'full-image', rect: null, reviewStatus: 'draft' },
      },
    });
    const message = approvalBlockers(tooSmall).find((b) => b.includes('agrandissement'));
    expect(message).toContain('1400');
    expect(message).toContain('600');
  });
});
