import { MIN_ZOOM_LONG_EDGE } from './inventory.js';

const APPROVED = 'owner-approved';

/**
 * Turns one owner decision into the eleven review stamps the commerce gate
 * checks for.
 *
 * Carlay should never be asked to tick eleven boxes. She fills in what she
 * knows about a work, uploads an image, and sets a single "prête à vendre"
 * switch. This expands that switch — but only onto facts that actually carry
 * a value, so an incomplete record cannot be waved through. If she marks a
 * work ready and its year is still blank, the year stays unapproved and the
 * gate keeps refusing to sell it.
 *
 * Applied as a schema transform, so the JSON files stay the single authored
 * source of truth and no build step rewrites them.
 */

const hasText = (fact) => typeof fact?.value === 'string' && fact.value.trim().length > 0;
const stampText = (fact, ready) => (ready && hasText(fact) ? { ...fact, reviewStatus: APPROVED } : fact);

export function applyOwnerApproval(artwork) {
  const ready = artwork?.ownerApproval?.readyToSell === true;
  if (!ready) return artwork;

  const dimensionsComplete =
    Number.isFinite(artwork.dimensions?.width) &&
    Number.isFinite(artwork.dimensions?.height) &&
    Boolean(artwork.dimensions?.unit);
  const priceComplete = Number.isFinite(artwork.price?.amount) && artwork.price.amount > 0;
  const yearComplete = Number.isFinite(artwork.year?.value);
  const full = artwork.images?.full;
  const fullComplete = Boolean(full?.src && full?.alt);

  return {
    ...artwork,
    availabilityReviewStatus:
      artwork.availability === 'available' ? APPROVED : artwork.availabilityReviewStatus,
    price: priceComplete ? { ...artwork.price, reviewStatus: APPROVED } : artwork.price,
    medium: stampText(artwork.medium, ready),
    year: yearComplete ? { ...artwork.year, reviewStatus: APPROVED } : artwork.year,
    dimensions: dimensionsComplete
      ? { ...artwork.dimensions, reviewStatus: APPROVED }
      : artwork.dimensions,
    signaturePlacement: stampText(artwork.signaturePlacement, ready),
    condition: stampText(artwork.condition, ready),
    framingStatus: stampText(artwork.framingStatus, ready),
    certificateStatus: stampText(artwork.certificateStatus, ready),
    images: {
      ...artwork.images,
      full: fullComplete ? { ...full, reviewStatus: APPROVED } : full,
      details: (artwork.images?.details ?? []).map((image) =>
        image?.src && image?.alt ? { ...image, reviewStatus: APPROVED } : image,
      ),
      zoom: artwork.images?.zoom ? { ...artwork.images.zoom, reviewStatus: APPROVED } : artwork.images?.zoom,
    },
  };
}

/**
 * What is still missing, in the artist's language.
 *
 * The commerce gate speaks in keys like `year:not-owner-approved`, which tells
 * Carlay nothing. These are the same conditions phrased as things to go and do.
 */
export function approvalBlockers(artwork) {
  const blockers = [];

  if (artwork?.availability !== 'available') {
    blockers.push('Marquez l’œuvre comme disponible à la vente.');
  }
  if (!(Number.isFinite(artwork?.price?.amount) && artwork.price.amount > 0)) {
    blockers.push('Indiquez le prix en euros.');
  }
  if (!hasText(artwork?.medium)) blockers.push('Indiquez la technique (par exemple « Acrylique sur toile »).');
  if (!Number.isFinite(artwork?.year?.value)) blockers.push('Indiquez l’année de réalisation.');
  if (!(Number.isFinite(artwork?.dimensions?.width) && Number.isFinite(artwork?.dimensions?.height))) {
    blockers.push('Indiquez la largeur et la hauteur en centimètres.');
  }
  if (!hasText(artwork?.signaturePlacement)) blockers.push('Indiquez où se trouve la signature.');
  if (!hasText(artwork?.condition)) blockers.push('Indiquez l’état de l’œuvre.');
  if (!hasText(artwork?.framingStatus)) blockers.push('Précisez si l’œuvre est encadrée.');
  if (!hasText(artwork?.certificateStatus)) blockers.push('Précisez si le certificat d’authenticité est inclus.');

  const full = artwork?.images?.full;
  if (!full?.src) blockers.push('Ajoutez la photo de l’œuvre entière.');
  else if (!full?.alt) blockers.push('Ajoutez une description de l’image pour les lecteurs d’écran.');

  const details = artwork?.images?.details ?? [];
  const hasDetailPhoto = details.some((image) => image?.src && image?.alt);
  const longEdge = Math.max(full?.width ?? 0, full?.height ?? 0);
  if (!hasDetailPhoto && !artwork?.images?.zoom) {
    blockers.push('Ajoutez une photo de détail, ou activez l’agrandissement sur la photo principale.');
  } else if (!hasDetailPhoto && longEdge > 0 && longEdge < MIN_ZOOM_LONG_EDGE) {
    blockers.push(
      `L’agrandissement demande une image d’au moins ${MIN_ZOOM_LONG_EDGE} px sur le grand côté ; celle-ci fait ${longEdge} px. Ajoutez une photo plus grande ou une photo de détail.`,
    );
  } else if (!hasDetailPhoto && longEdge === 0) {
    blockers.push('Indiquez les dimensions en pixels de la photo principale pour permettre l’agrandissement.');
  }

  return blockers;
}

export function isReadyToSell(artwork) {
  return artwork?.ownerApproval?.readyToSell === true && approvalBlockers(artwork).length === 0;
}
