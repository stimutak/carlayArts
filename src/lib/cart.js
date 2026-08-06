import { additionDecision, createInventoryIndex, isCommerceEligible } from './inventory.js';

export const CART_STORAGE_KEY = 'carlay-cart-v2';
export const LEGACY_CART_STORAGE_KEY = 'carlay-cart-v1';
export const CART_VERSION = 2;

let inventory = new Map();
let inventoryConfigured = false;
let lastStatus = { kind: 'ready', message: '' };

const browserStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const emptyState = () => ({ version: CART_VERSION, itemIds: [] });

function setStatus(kind, message = '') {
  lastStatus = { kind, message };
  return lastStatus;
}

function emit(action, result) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('cart:change', {
      detail: { action, result, snapshot: getCartSnapshot(), status: lastStatus },
    }),
  );
}

function idsFromLegacy(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => (typeof entry === 'string' ? entry : entry?.id)).filter(Boolean);
}

function sanitizeIds(ids) {
  const unique = [];
  const seen = new Set();
  for (const id of Array.isArray(ids) ? ids : []) {
    if (seen.has(id)) continue;
    const item = inventory.get(id);
    if (!item || !isCommerceEligible(item)) continue;
    seen.add(id);
    unique.push(id);
  }
  return unique;
}

function parseState(storage) {
  const raw = storage.getItem(CART_STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CART_VERSION || !Array.isArray(parsed.itemIds)) {
      throw new Error('Unsupported cart state.');
    }
    return { state: { version: CART_VERSION, itemIds: sanitizeIds(parsed.itemIds) }, migrated: false };
  }

  const legacyRaw = storage.getItem(LEGACY_CART_STORAGE_KEY);
  if (!legacyRaw) return { state: emptyState(), migrated: false };
  const legacy = JSON.parse(legacyRaw);
  return {
    state: { version: CART_VERSION, itemIds: sanitizeIds(idsFromLegacy(legacy)) },
    migrated: true,
  };
}

function writeState(storage, state) {
  storage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
}

function readState() {
  if (!inventoryConfigured) {
    setStatus('error', 'Le catalogue n’est pas disponible. Le panier reste verrouillé.');
    return emptyState();
  }

  let storage;
  try {
    storage = browserStorage();
    if (!storage) return emptyState();
    const { state, migrated } = parseState(storage);
    const raw = storage.getItem(CART_STORAGE_KEY);
    const storedIds = raw ? JSON.parse(raw).itemIds : [];
    const changed = JSON.stringify(storedIds) !== JSON.stringify(state.itemIds);
    if (migrated || changed) {
      writeState(storage, state);
      if (migrated) storage.removeItem(LEGACY_CART_STORAGE_KEY);
      setStatus(
        'recovered',
        migrated
          ? 'Votre panier a été mis à jour vers son nouveau format.'
          : 'Une œuvre devenue indisponible a été retirée du panier.',
      );
    } else if (lastStatus.kind !== 'recovered') {
      setStatus('ready');
    }
    return state;
  } catch {
    try {
      storage?.removeItem(CART_STORAGE_KEY);
      storage?.removeItem(LEGACY_CART_STORAGE_KEY);
    } catch {
      // The error state below remains actionable even when storage cannot be cleared.
    }
    setStatus('error', 'Le panier enregistré est illisible ou inaccessible. Réessayez depuis cette page.');
    return emptyState();
  }
}

function commit(action, nextState, result) {
  try {
    const storage = browserStorage();
    if (!storage) return result;
    writeState(storage, nextState);
    setStatus('ready');
    emit(action, result);
    return result;
  } catch {
    const failed = { ok: false, reason: 'storage' };
    setStatus('error', 'Impossible d’enregistrer le panier sur cet appareil. Réessayez.');
    emit('error', failed);
    return failed;
  }
}

export function configureInventory(records) {
  inventory = createInventoryIndex(records);
  inventoryConfigured = true;
  return getCartSnapshot();
}

export function getItems() {
  const state = readState();
  return state.itemIds.map((id) => inventory.get(id)).filter(Boolean);
}

export function addItem(reference) {
  if (!inventoryConfigured) return { ok: false, reason: 'inventory-unavailable' };
  const decision = additionDecision(inventory, reference);
  if (!decision.ok) return decision;

  const state = readState();
  if (lastStatus.kind === 'error') return { ok: false, reason: 'storage' };
  if (state.itemIds.includes(decision.item.id)) return { ok: false, reason: 'duplicate', item: decision.item };
  return commit('add', { version: CART_VERSION, itemIds: [...state.itemIds, decision.item.id] }, { ok: true, item: decision.item });
}

export function removeItem(id) {
  const state = readState();
  if (lastStatus.kind === 'error') return { ok: false, reason: 'storage' };
  const itemIds = state.itemIds.filter((itemId) => itemId !== id);
  if (itemIds.length === state.itemIds.length) return { ok: false, reason: 'missing' };
  return commit('remove', { version: CART_VERSION, itemIds }, { ok: true, id });
}

export function clearCart() {
  return commit('clear', emptyState(), { ok: true });
}

export function getCartStatus() {
  readState();
  return { ...lastStatus };
}

export function retryCartStorage() {
  setStatus('ready');
  const snapshot = getCartSnapshot();
  emit('retry', { ok: snapshot.status.kind !== 'error' });
  return snapshot;
}

export function getCartSnapshot() {
  const items = getItems();
  const currencies = new Set(items.map((item) => item.price.currency));
  const total = currencies.size <= 1 ? items.reduce((sum, item) => sum + item.price.amount, 0) : null;
  if (currencies.size > 1) setStatus('error', 'Le panier contient plusieurs devises et ne peut pas être commandé.');
  return {
    items,
    count: items.length,
    total,
    currency: items[0]?.price.currency ?? 'EUR',
    status: { ...lastStatus },
  };
}
