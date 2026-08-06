export const CART_STORAGE_KEY = 'carlay-cart-v1';
export const CART_STORAGE_VERSION = 1;

let eligibleCatalog = new Map();

const storage = () => {
  try {
    return globalThis.window?.localStorage ?? globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const priceDetails = (artwork) => {
  if (typeof artwork?.price === 'number') {
    return {
      amount: artwork.price,
      currency: artwork.currency ?? 'EUR',
      reviewStatus: artwork.priceReviewStatus,
    };
  }
  return artwork?.price;
};

export function isOwnerApprovedAvailable(artwork) {
  const price = priceDetails(artwork);
  return Boolean(
    artwork &&
      typeof artwork.slug === 'string' &&
      artwork.slug.length > 0 &&
      typeof artwork.title === 'string' &&
      artwork.title.length > 0 &&
      artwork.availability === 'available' &&
      artwork.availabilityReviewStatus === 'owner-approved' &&
      price?.reviewStatus === 'owner-approved' &&
      Number.isFinite(price?.amount) &&
      price.amount > 0 &&
      price.currency === 'EUR',
  );
}

const toLineItem = (artwork) => {
  const price = priceDetails(artwork);
  const image = artwork.image ?? artwork.images?.card;
  return {
    slug: artwork.slug,
    title: artwork.title,
    series: typeof artwork.series === 'string' ? artwork.series : '',
    price: price.amount,
    currency: price.currency,
    availability: 'available',
    availabilityReviewStatus: 'owner-approved',
    priceReviewStatus: 'owner-approved',
    image: image?.src ?? '',
    imageAlt: image?.alt ?? artwork.title,
  };
};

export function configureCartCatalog(artworks = []) {
  eligibleCatalog = new Map(
    artworks.filter(isOwnerApprovedAvailable).map((artwork) => [artwork.slug, toLineItem(artwork)]),
  );
  return eligibleCatalog.size;
}

export function resetCartCatalog() {
  eligibleCatalog = new Map();
}

export function isEligibleCartItem(item) {
  const approved = eligibleCatalog.get(item?.slug);
  return Boolean(
    approved &&
      approved.availability === 'available' &&
      approved.priceReviewStatus === 'owner-approved' &&
      approved.price === item.price &&
      approved.currency === item.currency,
  );
}

const readEnvelope = () => {
  try {
    const raw = storage()?.getItem(CART_STORAGE_KEY);
    if (!raw) return { version: CART_STORAGE_VERSION, items: [] };
    const value = JSON.parse(raw);
    if (value?.version !== CART_STORAGE_VERSION || !Array.isArray(value.items)) {
      return { version: CART_STORAGE_VERSION, items: [] };
    }
    return value;
  } catch {
    return { version: CART_STORAGE_VERSION, items: [] };
  }
};

const canonicalItems = () => {
  const seen = new Set();
  return readEnvelope().items.flatMap((item) => {
    if (seen.has(item?.slug)) return [];
    const approved = eligibleCatalog.get(item?.slug);
    if (!approved) return [];
    seen.add(item.slug);
    return [approved];
  });
};

const announceChange = (items) => {
  const eventTarget = globalThis.window ?? globalThis;
  if (typeof eventTarget.dispatchEvent !== 'function' || typeof eventTarget.CustomEvent !== 'function') return;
  eventTarget.dispatchEvent(
    new eventTarget.CustomEvent('cart:change', {
      detail: { count: items.length, total: items.reduce((sum, item) => sum + item.price, 0) },
    }),
  );
};

const writeItems = (items) => {
  try {
    const target = storage();
    if (!target) return false;
    target.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ version: CART_STORAGE_VERSION, items }),
    );
  } catch {
    return false;
  }
  announceChange(items);
  return true;
};

export function getItems() {
  return canonicalItems().map((item) => ({ ...item }));
}

export function addItem(artwork) {
  if (!artwork?.slug || !eligibleCatalog.has(artwork.slug)) {
    return { ok: false, reason: 'ineligible' };
  }

  const items = canonicalItems();
  if (items.some((item) => item.slug === artwork.slug)) {
    return { ok: false, reason: 'duplicate' };
  }

  const next = [...items, eligibleCatalog.get(artwork.slug)];
  if (!writeItems(next)) return { ok: false, reason: 'storage' };
  return { ok: true, item: { ...next.at(-1) } };
}

export function removeItem(slug) {
  const items = canonicalItems();
  const next = items.filter((item) => item.slug !== slug);
  if (next.length === items.length) return { ok: false, reason: 'missing' };
  if (!writeItems(next)) return { ok: false, reason: 'storage' };
  return { ok: true };
}

export function count() {
  return canonicalItems().length;
}

export function total() {
  return canonicalItems().reduce((sum, item) => sum + item.price, 0);
}

export function clear() {
  try {
    const target = storage();
    if (!target) return false;
    target.removeItem(CART_STORAGE_KEY);
  } catch {
    return false;
  }
  announceChange([]);
  return true;
}
