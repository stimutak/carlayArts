import { isEligibleCartItem } from './cart.js';

export const CONFIRMATION_STORAGE_KEY = 'carlay-confirmation-v1';
export const CONFIRMATION_STORAGE_VERSION = 1;

const requiredCustomerFields = ['prenom', 'nom', 'email', 'adresse', 'ville', 'cp', 'pays'];

export function validateCustomer(customer = {}) {
  const errors = {};
  for (const field of requiredCustomerFields) {
    if (typeof customer[field] !== 'string' || customer[field].trim() === '') {
      errors[field] = 'Ce champ est requis.';
    }
  }
  if (!errors.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
    errors.email = 'Saisissez une adresse e-mail valide.';
  }
  return errors;
}

export function validateDemoOrder(order) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('Votre panier est vide. Ajoutez une œuvre disponible avant de continuer.');
  }
  if (order.items.some((item) => !isEligibleCartItem(item))) {
    throw new Error('Une œuvre du panier n’est plus éligible. Vérifiez votre sélection.');
  }
  if (new Set(order.items.map((item) => item.slug)).size !== order.items.length) {
    throw new Error('Une œuvre unique ne peut apparaître qu’une fois dans le panier.');
  }

  const errors = validateCustomer(order.customer);
  if (Object.keys(errors).length > 0) {
    const error = new Error('Corrigez les champs indiqués avant de continuer.');
    error.fieldErrors = errors;
    throw error;
  }

  const expectedTotal = order.items.reduce((sum, item) => sum + item.price, 0);
  if (!Number.isFinite(order.total) || order.total !== expectedTotal) {
    throw new Error('Le total du panier a changé. Rechargez la page et réessayez.');
  }
  return true;
}

const confirmationStorage = () => {
  try {
    return globalThis.window?.sessionStorage ?? globalThis.sessionStorage;
  } catch {
    return undefined;
  }
};

const orderReference = () => {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `DEMO-${id.slice(0, 8).toUpperCase()}`;
};

export async function createCheckout(order, provider = 'demo') {
  if (provider !== 'demo') throw new Error('Seul le mode démonstration est disponible.');
  validateDemoOrder(order);

  const confirmation = {
    version: CONFIRMATION_STORAGE_VERSION,
    demo: true,
    reference: orderReference(),
    createdAt: new Date().toISOString(),
    items: order.items.map(({ slug, title, price, currency }) => ({ slug, title, price, currency })),
    total: order.total,
    currency: 'EUR',
  };

  try {
    const target = confirmationStorage();
    if (!target) throw new Error('unavailable');
    target.setItem(CONFIRMATION_STORAGE_KEY, JSON.stringify(confirmation));
  } catch {
    throw new Error('La confirmation ne peut pas être enregistrée dans ce navigateur. Réessayez.');
  }

  return { ok: true, redirect: '/confirmation' };
}

export function getDemoConfirmation() {
  try {
    const value = JSON.parse(confirmationStorage()?.getItem(CONFIRMATION_STORAGE_KEY) ?? 'null');
    if (
      value?.version !== CONFIRMATION_STORAGE_VERSION ||
      value.demo !== true ||
      !Array.isArray(value.items) ||
      !Number.isFinite(value.total)
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}
