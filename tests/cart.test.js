// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CART_STORAGE_KEY,
  addItem,
  clear,
  configureCartCatalog,
  count,
  getItems,
  removeItem,
  resetCartCatalog,
  total,
} from '../src/lib/cart.js';

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
};

const approved = {
  slug: 'fixture-approved-work',
  title: 'Œuvre de démonstration',
  series: 'Fixture',
  price: { amount: 1200, currency: 'EUR', reviewStatus: 'owner-approved' },
  availability: 'available',
  availabilityReviewStatus: 'owner-approved',
  images: { card: { src: '/fixture.jpg', alt: 'Fixture' } },
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true });
  window.localStorage.clear();
  resetCartCatalog();
  configureCartCatalog([approved]);
});

describe('versioned unique-work cart', () => {
  it('stores canonical approved items, totals them, and persists reloads', () => {
    expect(addItem({ slug: approved.slug, price: { amount: 1 } })).toMatchObject({ ok: true });
    expect(count()).toBe(1);
    expect(total()).toBe(1200);
    expect(getItems()[0]).toMatchObject({ slug: approved.slug, price: 1200 });
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY))).toMatchObject({
      version: 1,
      items: [{ slug: approved.slug }],
    });
  });

  it('prevents duplicate unique works', () => {
    expect(addItem(approved).ok).toBe(true);
    expect(addItem(approved)).toEqual({ ok: false, reason: 'duplicate' });
    expect(count()).toBe(1);
  });

  it.each([
    ['sold', { ...approved, slug: 'sold', availability: 'sold' }],
    ['not-for-sale', { ...approved, slug: 'nfs', availability: 'not-for-sale' }],
    ['unknown', { ...approved, slug: 'unknown', availability: 'unknown' }],
    ['unapproved availability', { ...approved, slug: 'review', availabilityReviewStatus: 'draft' }],
    ['unapproved price', { ...approved, slug: 'price', price: { ...approved.price, reviewStatus: 'draft' } }],
  ])('rejects %s catalog entries', (_label, item) => {
    configureCartCatalog([item]);
    expect(addItem(item)).toEqual({ ok: false, reason: 'ineligible' });
  });

  it('rejects a browser-invented slug not present in the approved catalog', () => {
    expect(addItem({ ...approved, slug: 'invented-in-local-storage' })).toEqual({
      ok: false,
      reason: 'ineligible',
    });
  });

  it('removes items, persists the total, and announces mutations', () => {
    const listener = vi.fn();
    window.addEventListener('cart:change', listener);
    addItem(approved);
    expect(removeItem(approved.slug)).toEqual({ ok: true });
    expect(getItems()).toEqual([]);
    expect(total()).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls.at(-1)[0].detail).toEqual({ count: 0, total: 0 });
    window.removeEventListener('cart:change', listener);
  });

  it('fails closed for corrupt, stale-version, and unapproved persisted state', () => {
    window.localStorage.setItem(CART_STORAGE_KEY, '{bad json');
    expect(getItems()).toEqual([]);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 999, items: [approved] }));
    expect(getItems()).toEqual([]);
    resetCartCatalog();
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items: [approved] }));
    expect(getItems()).toEqual([]);
  });

  it('clears persisted state and emits the empty total', () => {
    addItem(approved);
    expect(clear()).toBe(true);
    expect(window.localStorage.getItem(CART_STORAGE_KEY)).toBeNull();
    expect(getItems()).toEqual([]);
  });
});
