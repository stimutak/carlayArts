import { isCommerceEligible } from './inventory.js';

export const CONFIRMATION_STORAGE_KEY = 'carlay-demo-confirmation-v1';
// 'none' keeps the demo adapter; 'network' switches to live providers.
// Baked at build time because a static site cannot read env at runtime.
export const CHECKOUT_TRANSPORT = (() => {
  try { return import.meta.env?.PUBLIC_CHECKOUT_TRANSPORT || 'none'; } catch { return 'none'; }
})();
const ALLOWED_METHODS = new Set(['card-demo', 'bank-demo', 'crypto-demo', 'card', 'bank', 'crypto']);
const REGION_REQUIRED = new Set(['US', 'CA']);
const inFlight = new Map();

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

export function validateCustomer(customer = {}) {
  const values = Object.fromEntries(Object.entries(customer).map(([key, value]) => [key, clean(value)]));
  const errors = {};
  const required = {
    prenom: 'Indiquez votre prénom.',
    nom: 'Indiquez votre nom.',
    email: 'Indiquez votre adresse e-mail.',
    adresse: 'Indiquez votre adresse.',
    ville: 'Indiquez votre ville.',
    cp: 'Indiquez votre code postal.',
    pays: 'Choisissez votre pays.',
  };

  for (const [field, message] of Object.entries(required)) if (!values[field]) errors[field] = message;
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Saisissez une adresse e-mail valide.';
  }
  if (REGION_REQUIRED.has(values.pays) && !values.region) {
    errors.region = 'Indiquez l’État ou la province pour ce pays.';
  }
  return { valid: Object.keys(errors).length === 0, errors, values };
}

export function validateOrder(order = {}) {
  if (!Array.isArray(order.items) || order.items.length === 0) throw new Error('Votre panier est vide.');
  if (new Set(order.items.map((item) => item.id)).size !== order.items.length) {
    throw new Error('Une même pièce ne peut apparaître qu’une fois dans la commande.');
  }
  if (order.items.some((item) => !isCommerceEligible(item))) {
    throw new Error('Une œuvre n’est plus disponible. Revenez au panier pour le mettre à jour.');
  }
  if (!Number.isFinite(order.total) || order.total <= 0) throw new Error('Le total de la commande est invalide.');
  const calculated = order.items.reduce((sum, item) => sum + item.price.amount, 0);
  if (calculated !== order.total) throw new Error('Le total de la commande a changé. Réessayez.');
  if (!ALLOWED_METHODS.has(order.method)) throw new Error('Choisissez une préférence de paiement démo.');
  const customer = validateCustomer(order.customer);
  if (!customer.valid) throw new Error('Corrigez les informations de livraison indiquées.');
  return { ...order, customer: customer.values };
}

function createReference() {
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8).toUpperCase()
    ?? Math.random().toString(36).slice(2, 10).toUpperCase();
  return `DEMO-${suffix}`;
}

async function demoAdapter(order, options) {
  await new Promise((resolve) => setTimeout(resolve, options.delayMs ?? 650));
  if (options.simulateFailure) throw new Error('Échec simulé. Aucune donnée n’a été transmise et aucun paiement n’a été pris.');
  return {
    ok: true,
    redirect: '/confirmation/',
    confirmation: {
      version: 1,
      reference: createReference(),
      createdAt: new Date().toISOString(),
      items: order.items.map(({ id, slug, title, series, price, image }) => ({ id, slug, title, series, price, image })),
      total: order.total,
      currency: order.currency,
      paymentTaken: false,
    },
  };
}

// Live payment transport. Each method maps to a serverless function that talks
// to the provider; only artwork ids travel, because the server resolves price,
// title and total from its own catalogue. A tampered payload cannot change what
// is charged.
const ENDPOINTS = {
  card: '/api/checkout-stripe',
  bank: '/api/checkout-mollie',
  crypto: '/api/checkout-crypto',
};

async function networkAdapter(order) {
  const endpoint = ENDPOINTS[order.method];
  if (!endpoint) throw new Error('Ce moyen de paiement n’est pas disponible.');

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: order.items.map((item) => ({ id: item.id })),
        customer: order.customer,
      }),
    });
  } catch {
    throw new Error('Le service de paiement est injoignable. Aucun paiement n’a été pris.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.url) {
    throw new Error(payload.error || 'La création du paiement a échoué. Aucun paiement n’a été pris.');
  }

  // The buyer now leaves for the provider's page. There is no confirmation to
  // store yet and the cart stays intact: only the webhook knows if they paid.
  return { ok: true, external: true, redirect: payload.url, confirmation: null };
}

export function createCheckout(order, options = {}) {
  const provider = options.provider ?? (CHECKOUT_TRANSPORT === 'network' ? 'network' : 'demo');
  if (provider !== 'demo' && provider !== 'network') {
    return Promise.reject(new Error(`Fournisseur de paiement inconnu : ${provider}.`));
  }

  let validated;
  try {
    validated = validateOrder(order);
  } catch (error) {
    return Promise.reject(error);
  }

  const key = options.idempotencyKey || `demo:${validated.items.map((item) => item.id).sort().join(',')}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const adapter = provider === 'network' ? networkAdapter : demoAdapter;
  const request = adapter(validated, options).finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

export function saveDemoConfirmation(confirmation, storage = globalThis.sessionStorage) {
  if (!confirmation || confirmation.paymentTaken !== false) throw new Error('Invalid demo confirmation.');
  storage.setItem(CONFIRMATION_STORAGE_KEY, JSON.stringify(confirmation));
}

export function readDemoConfirmation(storage = globalThis.sessionStorage) {
  try {
    const value = JSON.parse(storage.getItem(CONFIRMATION_STORAGE_KEY));
    if (value?.version !== 1 || value.paymentTaken !== false || !Array.isArray(value.items)) return null;
    return value;
  } catch {
    return null;
  }
}
