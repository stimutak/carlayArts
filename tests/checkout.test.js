// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { addItem, configureCartCatalog, getItems, resetCartCatalog, total } from '../src/lib/cart.js';
import {
  CONFIRMATION_STORAGE_KEY,
  createCheckout,
  getDemoConfirmation,
  validateCustomer,
} from '../src/lib/checkout.js';

const memoryStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
  };
};

const artwork = {
  slug: 'fixture-approved-work',
  title: 'Œuvre de démonstration',
  series: 'Fixture',
  price: { amount: 1200, currency: 'EUR', reviewStatus: 'owner-approved' },
  availability: 'available',
  availabilityReviewStatus: 'owner-approved',
};
const customer = {
  prenom: 'Camille',
  nom: 'Martin',
  email: 'camille@example.fr',
  adresse: '1 rue Exemple',
  ville: 'Paris',
  cp: '75001',
  pays: 'FR',
};

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: memoryStorage(), configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: memoryStorage(), configurable: true });
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetCartCatalog();
  configureCartCatalog([artwork]);
  addItem(artwork);
});

describe('demo checkout adapter', () => {
  it('validates basic customer fields and e-mail format', () => {
    expect(validateCustomer({})).toMatchObject({ prenom: expect.any(String), email: expect.any(String) });
    expect(validateCustomer({ ...customer, email: 'incorrect' })).toEqual({
      email: 'Saisissez une adresse e-mail valide.',
    });
    expect(validateCustomer(customer)).toEqual({});
  });

  it('rejects an empty cart, unknown provider, and ineligible item', async () => {
    await expect(createCheckout({ items: [], total: 0, customer })).rejects.toThrow('panier est vide');
    await expect(
      createCheckout({ items: getItems(), total: total(), customer }, 'live'),
    ).rejects.toThrow('Seul le mode démonstration');
    await expect(
      createCheckout({ items: [{ ...getItems()[0], slug: 'invented' }], total: total(), customer }),
    ).rejects.toThrow('plus éligible');
  });

  it('rejects missing customer data and a changed total', async () => {
    await expect(createCheckout({ items: getItems(), total: total(), customer: {} })).rejects.toMatchObject({
      fieldErrors: expect.objectContaining({ nom: expect.any(String), email: expect.any(String) }),
    });
    await expect(createCheckout({ items: getItems(), total: 1, customer })).rejects.toThrow(
      'total du panier a changé',
    );
  });

  it('stores only a non-sensitive demo confirmation', async () => {
    const result = await createCheckout({ items: getItems(), total: total(), customer });
    expect(result).toEqual({ ok: true, redirect: '/confirmation' });
    const raw = window.sessionStorage.getItem(CONFIRMATION_STORAGE_KEY);
    expect(raw).not.toContain(customer.email);
    expect(raw).not.toContain(customer.adresse);
    expect(getDemoConfirmation()).toMatchObject({
      version: 1,
      demo: true,
      total: 1200,
      items: [{ slug: artwork.slug, title: artwork.title }],
    });
  });
});
