// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CART_STORAGE_KEY,
  LEGACY_CART_STORAGE_KEY,
  addItem,
  clearCart,
  configureInventory,
  getCartSnapshot,
  removeItem,
} from '../src/lib/cart.js';

const approvedFact = (value) => ({ value, reviewStatus: 'owner-approved' });
const available = {
  id: 'available-1', slug: 'available-1', title: 'Available 1', series: 'Test', availability: 'available',
  availabilityReviewStatus: 'owner-approved',
  price: { amount: 1250, currency: 'EUR', reviewStatus: 'owner-approved' }, image: { src: '/test.jpg', alt: 'Available 1' },
  medium: approvedFact('Acrylique'), year: approvedFact(2026),
  dimensions: { width: 30, height: 40, unit: 'cm', reviewStatus: 'owner-approved' },
  signaturePlacement: approvedFact('Dos'), condition: approvedFact('Neuve'),
  framingStatus: approvedFact('Non encadrée'), certificateStatus: approvedFact('Inclus'),
  images: { full: { src: '/full.jpg', alt: 'Full', reviewStatus: 'owner-approved' }, details: [{ src: '/detail.jpg', alt: 'Detail', reviewStatus: 'owner-approved' }] },
};
const sold = { ...available, id: 'sold-1', slug: 'sold-1', title: 'Sold 1', availability: 'sold' };
const held = { ...available, id: 'held-1', slug: 'held-1', title: 'Held 1', availability: 'not-for-sale' };

describe('versioned unique-work cart', () => {
  beforeAll(() => {
    const values = new Map();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key) => values.get(key) ?? null,
        removeItem: (key) => values.delete(key),
        setItem: (key, value) => values.set(key, String(value)),
      },
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
    configureInventory([available, sold, held]);
    clearCart();
  });

  it('persists versioned IDs and prevents duplicate quantities', () => {
    expect(addItem('available-1').ok).toBe(true);
    expect(addItem('available-1').reason).toBe('duplicate');
    expect(getCartSnapshot()).toMatchObject({ count: 1, total: 1250, currency: 'EUR' });
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY))).toEqual({ version: 2, itemIds: ['available-1'] });
  });

  it('fails closed for sold, not-for-sale, and unknown references', () => {
    expect(addItem('sold-1').reason).toBe('sold');
    expect(addItem('held-1').reason).toBe('not-for-sale');
    expect(addItem('unknown').reason).toBe('unknown');
    expect(getCartSnapshot().count).toBe(0);
  });

  it('migrates a v1 item array, removes stale entries, and supports removal', () => {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    window.localStorage.setItem(LEGACY_CART_STORAGE_KEY, JSON.stringify([available, sold, available]));
    expect(getCartSnapshot().count).toBe(1);
    expect(window.localStorage.getItem(LEGACY_CART_STORAGE_KEY)).toBeNull();
    expect(removeItem('available-1').ok).toBe(true);
    expect(getCartSnapshot().count).toBe(0);
  });

  it('recovers from corrupt persisted data without exposing it', () => {
    window.localStorage.setItem(CART_STORAGE_KEY, '{broken');
    const snapshot = getCartSnapshot();
    expect(snapshot.items).toEqual([]);
    expect(snapshot.status.kind).toBe('error');
  });

  it('announces successful mutations through cart:change', () => {
    const listener = vi.fn();
    window.addEventListener('cart:change', listener);
    addItem('available-1');
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ action: 'add' }) }));
    window.removeEventListener('cart:change', listener);
  });
});
