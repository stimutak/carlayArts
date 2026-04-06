/* ═══════════════════════════════════════════════════════════
   CARLAY ART — Cart System
   localStorage-based cart with slide-out panel
   ═══════════════════════════════════════════════════════════ */

const Cart = (() => {
  const STORAGE_KEY = 'carlayart_cart';
  const listeners = [];

  function getItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    notify();
  }

  function notify() {
    const items = getItems();
    listeners.forEach(fn => fn(items));
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  function add(item) {
    const items = getItems();
    const existing = items.find(i => i.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        id: item.id,
        name: item.name,
        price: parseFloat(item.price),
        image: item.image || '',
        description: item.description || '',
        qty: 1
      });
    }
    save(items);
  }

  function remove(id) {
    save(getItems().filter(i => i.id !== id));
  }

  function updateQty(id, qty) {
    const items = getItems();
    const item = items.find(i => i.id === id);
    if (!item) return;
    if (qty <= 0) {
      remove(id);
      return;
    }
    item.qty = qty;
    save(items);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    notify();
  }

  function count() {
    return getItems().reduce((sum, i) => sum + i.qty, 0);
  }

  function total() {
    return getItems().reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  return { getItems, add, remove, updateQty, clear, count, total, onChange };
})();


/* ─────────────────────────────────────────────────────────
   Cart Slide-Out Panel
   ───────────────────────────────────────────────────────── */

const CartPanel = (() => {
  let panel, backdrop, itemsContainer, countEl, totalEl;
  let isOpen = false;

  function init() {
    // Inject panel HTML
    const html = `
    <div class="cart-backdrop" id="cartBackdrop"></div>
    <aside class="cart-panel" id="cartPanel">
      <div class="cart-panel__header">
        <h2 class="cart-panel__title">Panier</h2>
        <button class="cart-panel__close" id="cartClose" aria-label="Fermer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="cart-panel__items" id="cartItems"></div>
      <div class="cart-panel__footer" id="cartFooter">
        <div class="cart-panel__total">
          <span>Total</span>
          <span id="cartTotal">€0</span>
        </div>
        <a href="panier.html" class="btn btn--primary cart-panel__checkout">
          Passer la commande
        </a>
        <button class="cart-panel__clear" id="cartClear">Vider le panier</button>
      </div>
    </aside>`;

    document.body.insertAdjacentHTML('beforeend', html);

    panel = document.getElementById('cartPanel');
    backdrop = document.getElementById('cartBackdrop');
    itemsContainer = document.getElementById('cartItems');
    totalEl = document.getElementById('cartTotal');

    document.getElementById('cartClose').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    document.getElementById('cartClear').addEventListener('click', () => {
      Cart.clear();
    });

    // Delegate remove / qty buttons
    itemsContainer.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-cart-remove]');
      if (removeBtn) {
        Cart.remove(removeBtn.dataset.cartRemove);
        return;
      }
      const minusBtn = e.target.closest('[data-cart-minus]');
      if (minusBtn) {
        const id = minusBtn.dataset.cartMinus;
        const item = Cart.getItems().find(i => i.id === id);
        if (item) Cart.updateQty(id, item.qty - 1);
        return;
      }
      const plusBtn = e.target.closest('[data-cart-plus]');
      if (plusBtn) {
        const id = plusBtn.dataset.cartPlus;
        const item = Cart.getItems().find(i => i.id === id);
        if (item) Cart.updateQty(id, item.qty + 1);
      }
    });

    // Listen for cart changes
    Cart.onChange(render);

    // Update all cart count badges
    updateBadges();
    Cart.onChange(updateBadges);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) close();
    });

    render(Cart.getItems());
  }

  function updateBadges() {
    const c = Cart.count();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = c;
    });
  }

  function open() {
    isOpen = true;
    panel.classList.add('cart-panel--open');
    backdrop.classList.add('cart-backdrop--visible');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    isOpen = false;
    panel.classList.remove('cart-panel--open');
    backdrop.classList.remove('cart-backdrop--visible');
    document.body.style.overflow = '';
  }

  function toggle() {
    isOpen ? close() : open();
  }

  function render(items) {
    const footer = document.getElementById('cartFooter');

    if (!items.length) {
      itemsContainer.innerHTML = `
        <div class="cart-panel__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
            <path d="M6 6h15l-1.5 9h-12z"/>
            <circle cx="9" cy="20" r="1"/>
            <circle cx="18" cy="20" r="1"/>
            <path d="M6 6L5 3H2"/>
          </svg>
          <p>Votre panier est vide</p>
        </div>`;
      footer.style.display = 'none';
      return;
    }

    footer.style.display = '';

    itemsContainer.innerHTML = items.map(item => `
      <div class="cart-item">
        <img class="cart-item__image" src="${item.image}" alt="${item.name}" loading="lazy">
        <div class="cart-item__details">
          <h3 class="cart-item__name">${item.name}</h3>
          <p class="cart-item__desc">${item.description}</p>
          <div class="cart-item__row">
            <div class="cart-item__qty">
              <button class="cart-item__qty-btn" data-cart-minus="${item.id}">−</button>
              <span>${item.qty}</span>
              <button class="cart-item__qty-btn" data-cart-plus="${item.id}">+</button>
            </div>
            <span class="cart-item__price">€${(item.price * item.qty).toLocaleString()}</span>
          </div>
        </div>
        <button class="cart-item__remove" data-cart-remove="${item.id}" aria-label="Supprimer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `).join('');

    totalEl.textContent = `€${Cart.total().toLocaleString()}`;
  }

  return { init, open, close, toggle };
})();


// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  CartPanel.init();

  // Wire up all cart toggle buttons
  document.querySelectorAll('[data-cart-toggle]').forEach(btn => {
    btn.addEventListener('click', () => CartPanel.toggle());
  });

  // Wire up all add-to-cart buttons
  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
    btn.addEventListener('click', () => {
      Cart.add({
        id: btn.dataset.itemId,
        name: btn.dataset.itemName,
        price: btn.dataset.itemPrice,
        image: btn.dataset.itemImage,
        description: btn.dataset.itemDescription || ''
      });

      // Visual feedback
      const original = btn.textContent;
      btn.textContent = '✓ Ajouté';
      btn.style.background = 'var(--color-rose)';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
        btn.style.color = '';
      }, 1200);

      CartPanel.open();
    });
  });
});
