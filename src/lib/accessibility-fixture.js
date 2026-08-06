const fixtureEnabled = process.env.CARLAY_ACCESSIBILITY_FIXTURE === '1';

const approved = (value) => ({ value, reviewStatus: 'owner-approved' });

export const accessibilityArtworkFixture = Object.freeze({
  id: 'synthetic-accessibility-fixture',
  slug: 'accessibility-test-fixture',
  title: 'Fixture d’accessibilité (non publiée)',
  series: 'Fixture de test',
  seriesSlug: 'accessibility-fixture',
  sortOrder: 999,
  price: { amount: 1000, currency: 'EUR', reviewStatus: 'owner-approved' },
  availability: 'available',
  availabilityReviewStatus: 'owner-approved',
  medium: approved('Donnée synthétique de test'),
  year: approved(2026),
  dimensions: { width: 32, height: 32, depth: null, unit: 'cm', reviewStatus: 'owner-approved' },
  orientation: 'square',
  aspectRatio: 1,
  signaturePlacement: approved('Donnée synthétique de test'),
  condition: approved('Donnée synthétique de test'),
  framingStatus: approved('Donnée synthétique de test'),
  certificateStatus: approved('Donnée synthétique de test'),
  cardDescription: approved('Fixture synthétique réservée aux tests automatisés.'),
  workNote: approved('Fixture synthétique réservée aux tests automatisés.'),
  seriesStatementRef: approved('fixture-accessibility'),
  images: {
    full: {
      src: '/artworks/VORTEX-5.jpg',
      alt: 'Image servant de vue intégrale à la fixture synthétique d’accessibilité',
      reviewStatus: 'owner-approved',
    },
    card: {
      src: '/artworks/VORTEX-5.jpg',
      alt: 'Vignette de la fixture synthétique d’accessibilité',
      reviewStatus: 'owner-approved',
    },
    details: [{
      src: '/artworks/vortex-6-680x680.jpeg',
      alt: 'Image servant de détail à la fixture synthétique d’accessibilité',
      reviewStatus: 'owner-approved',
    }],
    back: null,
    signature: null,
    roomScale: null,
  },
  featured: false,
  relatedSlugs: [],
  source: { kind: 'legacy-catalog', file: 'synthetic-accessibility-fixture' },
  testFixture: true,
});

export function withAccessibilityFixture(artworks) {
  return fixtureEnabled ? [...artworks, accessibilityArtworkFixture] : artworks;
}

export function isAccessibilityFixture(artwork) {
  return artwork?.id === accessibilityArtworkFixture.id;
}
