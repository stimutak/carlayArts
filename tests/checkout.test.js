import { describe, expect, it, vi } from 'vitest';
import { CHECKOUT_TRANSPORT, createCheckout, readDemoConfirmation, saveDemoConfirmation, validateCustomer } from '../src/lib/checkout.js';

const approvedFact = (value) => ({ value, reviewStatus: 'owner-approved' });

const item = {
  id: 'available-1', slug: 'available-1', title: 'Available 1', series: 'Test', availability: 'available',
  availabilityReviewStatus: 'owner-approved',
  price: { amount: 1250, currency: 'EUR', reviewStatus: 'owner-approved' }, image: { src: '/test.jpg', alt: 'Available 1' },
  medium: approvedFact('Acrylique'), year: approvedFact(2026),
  dimensions: { width: 30, height: 40, unit: 'cm', reviewStatus: 'owner-approved' },
  signaturePlacement: approvedFact('Dos'), condition: approvedFact('Neuve'), framingStatus: approvedFact('Non encadrée'), certificateStatus: approvedFact('Inclus'),
  images: { full: { src: '/full.jpg', alt: 'Full', reviewStatus: 'owner-approved' }, details: [{ src: '/detail.jpg', alt: 'Detail', reviewStatus: 'owner-approved' }] },
};
const customer = { prenom: 'Ada', nom: 'Lovelace', email: 'ada@example.com', adresse: '1 Rue Test', ville: 'Paris', cp: '75001', pays: 'FR', region: '' };
const order = { items: [item], total: 1250, currency: 'EUR', customer, method: 'card-demo' };

describe('checkout validation and demo-only adapter', () => {
  it('reports field-level errors and country-specific region requirements', () => {
    expect(validateCustomer({ email: 'bad', pays: 'US' }).errors).toMatchObject({ prenom: expect.any(String), email: expect.any(String), region: expect.any(String) });
    expect(validateCustomer(customer).valid).toBe(true);
  });

  it('returns a sanitized confirmation that explicitly took no payment', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const result = await createCheckout(order, { delayMs: 0 });
    expect(CHECKOUT_TRANSPORT).toBe('none');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(result.redirect).toBe('/confirmation/');
    expect(result.confirmation).toMatchObject({ paymentTaken: false, total: 1250 });
    expect(result.confirmation).not.toHaveProperty('customer');
  });

  it('rejects non-demo providers, empty carts, duplicates, stale availability, and changed totals', async () => {
    await expect(createCheckout(order, { provider: 'stripe', delayMs: 0 })).rejects.toThrow(/démonstration/);
    await expect(createCheckout({ ...order, items: [] }, { delayMs: 0 })).rejects.toThrow(/vide/);
    await expect(createCheckout({ ...order, items: [item, item], total: 2500 }, { delayMs: 0 })).rejects.toThrow(/une même pièce/i);
    await expect(createCheckout({ ...order, items: [{ ...item, availability: 'sold' }] }, { delayMs: 0 })).rejects.toThrow(/plus disponible/);
    await expect(createCheckout({ ...order, total: 999 }, { delayMs: 0 })).rejects.toThrow(/total/);
  });

  it('supports explicit failure/retry and coalesces duplicate in-flight submissions', async () => {
    await expect(createCheckout(order, { delayMs: 0, simulateFailure: true, idempotencyKey: 'failure' })).rejects.toThrow(/Aucun.*paiement/i);
    const first = createCheckout(order, { delayMs: 1, idempotencyKey: 'same' });
    const second = createCheckout(order, { delayMs: 1, idempotencyKey: 'same' });
    expect(first).toBe(second);
    await expect(first).resolves.toMatchObject({ ok: true });
  });

  it('stores only an explicit no-payment confirmation in session storage', () => {
    const storage = { value: null, setItem: vi.fn((_, value) => (storage.value = value)), getItem: vi.fn(() => storage.value) };
    const confirmation = { version: 1, paymentTaken: false, items: [], total: 0 };
    saveDemoConfirmation(confirmation, storage);
    expect(readDemoConfirmation(storage)).toEqual(confirmation);
    expect(() => saveDemoConfirmation({ ...confirmation, paymentTaken: true }, storage)).toThrow(/Invalid/);
  });
});
