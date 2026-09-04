import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
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

describe('checkout validation and payment adapters', () => {
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
    await expect(createCheckout(order, { provider: 'stripe', delayMs: 0 })).rejects.toThrow(/Fournisseur de paiement inconnu/);
    await expect(createCheckout({ ...order, items: [] }, { delayMs: 0 })).rejects.toThrow(/vide/);
    await expect(createCheckout({ ...order, items: [item, item], total: 2500 }, { delayMs: 0 })).rejects.toThrow(/une même pièce/i);
    await expect(createCheckout({ ...order, items: [{ ...item, availability: 'sold' }] }, { delayMs: 0 })).rejects.toThrow(/plus disponible/);
    await expect(createCheckout({ ...order, total: 999 }, { delayMs: 0 })).rejects.toThrow(/total/);
  });

  it('sends only artwork ids to the payment endpoint and returns the provider redirect', async () => {
    const calls = [];
    const fetchStub = vi.fn(async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/c/pay/abc' }) };
    });
    vi.stubGlobal('fetch', fetchStub);

    const result = await createCheckout(
      { ...order, method: 'card' },
      { provider: 'network', idempotencyKey: 'network-test' },
    );

    expect(calls[0].url).toBe('/api/checkout-stripe');
    // Price must never leave the browser: the server resolves it, so a
    // tampered payload cannot change what is charged.
    expect(calls[0].body.items).toEqual([{ id: 'available-1' }]);
    expect(JSON.stringify(calls[0].body.items)).not.toContain('1250');
    expect(result).toMatchObject({ ok: true, external: true, redirect: 'https://checkout.stripe.com/c/pay/abc', confirmation: null });

    vi.unstubAllGlobals();
  });

  it('refuses to store a confirmation for a live payment', () => {
    // saveDemoConfirmation guards the demo-only invariant; a network result
    // carries no confirmation and must not be able to fake one.
    expect(() => saveDemoConfirmation(null)).toThrow();
    expect(() => saveDemoConfirmation({ version: 1, paymentTaken: true, items: [] })).toThrow();
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

describe('checkout reading and focus order', () => {
  it('keeps the mobile summary before the form in source and visual order', () => {
    const page = readFileSync('src/pages/commande.astro', 'utf8');
    const css = readFileSync('src/styles/components.css', 'utf8');
    expect(page.indexOf('class="order-summary"')).toBeLessThan(page.indexOf('class="checkout-form"'));
    expect(css).toMatch(/\.order-summary \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1;/);
    expect(css).toMatch(/\.checkout-layout \.checkout-form \{[\s\S]*?grid-column: 1;[\s\S]*?grid-row: 2;/);
  });
});
