/**
 * Server-side order validation shared by every checkout endpoint.
 *
 * The browser sends only artwork ids. Prices, names, images and the order
 * total are resolved here from api/_catalog.json, so a tampered price in the
 * request body cannot reach the payment provider.
 *
 * Each painting is a unique original, so quantity is always 1 and an id may
 * appear only once per order.
 */
const catalog = require('./_catalog.json');

class OrderError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function resolveOrder(body) {
  const items = body && body.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderError('No items provided');
  }
  if (items.length > 20) {
    throw new OrderError('Too many items in one order');
  }

  const seen = new Set();
  const resolved = items.map((item) => {
    const id = item && typeof item.id === 'string' ? item.id.trim() : '';
    if (!id) throw new OrderError('Every item must carry an artwork id');
    if (seen.has(id)) throw new OrderError(`"${id}" appears twice — each work is a unique original`);
    seen.add(id);

    const artwork = catalog.artworks[id];
    if (!artwork) throw new OrderError(`"${id}" is not available for purchase`);

    // Deliberately ignores item.price / item.name / item.qty from the client.
    return { ...artwork, qty: 1 };
  });

  const total = resolved.reduce((sum, item) => sum + item.price, 0);
  return { items: resolved, total, currency: 'EUR' };
}

module.exports = { resolveOrder, OrderError };
