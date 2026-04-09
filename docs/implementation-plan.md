# Carlay Art — Remaining Implementation Plan

## Context
The frontend redesign is complete: 6 pages (homepage, boutique, about, contact, cart, artwork detail), shared CSS architecture, localStorage cart, micro-interactions, and Panel-approved design. What remains is wiring up real payments and deploying.

## Current State
- **Frontend:** Complete, all pages built and linked
- **Cart:** localStorage-based, working slide-out panel + full checkout page
- **Payments:** Placeholder `alert()` calls in panier.html — no real payment integration
- **Hosting:** Static files served locally via `npx serve`

---

## Phase 1: Backend API (Serverless Functions)

The site is static HTML but needs server-side endpoints for payment session creation (API keys must not be in client code). Use **Vercel Serverless Functions** or **Netlify Functions**.

### Files to create:

```
/api/
├── checkout-stripe.js    # POST → creates Stripe Checkout Session, returns URL
├── checkout-mollie.js    # POST → creates Mollie payment, returns redirect URL  
├── checkout-crypto.js    # POST → creates Coinbase Commerce charge, returns URL
├── webhook-stripe.js     # POST → handles Stripe webhook (payment confirmation)
├── webhook-mollie.js     # POST → handles Mollie webhook
└── webhook-coinbase.js   # POST → handles Coinbase webhook
```

### Stripe Checkout Flow (priority — simplest to implement):

1. User clicks "Carte Bancaire (Stripe)" on panier.html
2. Client POSTs cart items to `/api/checkout-stripe`
3. Server creates a Stripe Checkout Session with:
   - Line items from cart (name, price, qty, image)
   - Currency: EUR
   - Success URL: `/panier?status=success`
   - Cancel URL: `/panier?status=cancelled`
   - Shipping: free (amount_total only)
   - Metadata: order details for fulfillment
4. Server returns `{ url: session.url }`
5. Client redirects to Stripe hosted checkout
6. After payment: Stripe redirects back to success URL
7. Webhook confirms payment → triggers email notification

### Key implementation details:

**api/checkout-stripe.js:**
```javascript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { items } = req.body;
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: items.map(item => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          description: item.description,
          images: [item.image],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.qty,
    })),
    mode: 'payment',
    success_url: `${process.env.SITE_URL}/panier.html?status=success`,
    cancel_url: `${process.env.SITE_URL}/panier.html?status=cancelled`,
    shipping_address_collection: { allowed_countries: ['FR', 'US', 'DE', 'NL', 'BE', 'GB', 'IT', 'ES'] },
  });

  res.json({ url: session.url });
}
```

**Client-side (panier.html) — replace alert() with:**
```javascript
case 'stripe':
  const res = await fetch('/api/checkout-stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: orderData.items })
  });
  const { url } = await res.json();
  window.location.href = url;
  break;
```

### Mollie Flow (same pattern):
- POST to `/api/checkout-mollie`
- Server creates Mollie payment with methods: ['ideal', 'creditcard', 'bancontact', 'applepay']
- Returns redirect URL
- Webhook confirms payment

### Coinbase Commerce Flow:
- POST to `/api/checkout-crypto`  
- Server creates Coinbase Commerce charge
- Returns hosted checkout URL
- Webhook confirms payment

---

## Phase 2: Post-Payment

### Success/Cancel States on panier.html
- Read `?status=success` or `?status=cancelled` from URL
- Success: show confirmation message, clear cart, display order summary
- Cancelled: show "payment cancelled" with option to retry

### Email Notifications
- Use **Resend** or **SendGrid** to send:
  - Order confirmation to buyer
  - New order alert to carlayart369@gmail.com
- Triggered by webhook handlers

---

## Phase 3: Deploy

### Recommended: Vercel
- Free tier supports serverless functions
- Auto-deploys from git
- Environment variables for API keys
- Custom domain support

### Steps:
1. `npm i -g vercel && vercel` 
2. Set environment variables (Stripe keys, Mollie keys, Coinbase keys)
3. Connect custom domain (carlay-art.com)
4. Test all payment flows in test/sandbox mode
5. Switch to live keys

### Alternative: Netlify
- Same pattern with Netlify Functions instead of `/api/` routes
- Slightly different function file structure

---

## Phase 4: Final Polish

- [ ] Replace original-site/images/ paths with optimized production images (WebP, proper sizes)
- [ ] Add Open Graph meta tags for social sharing (og:image using hero artwork)
- [ ] Add proper favicon (not emoji)
- [ ] Set up Google Analytics or Plausible
- [ ] Wire real Instagram handle (verify @carlayart exists)
- [ ] Form: replace Formspree placeholder with real endpoint
- [ ] Test all payment methods in sandbox
- [ ] Mobile testing on real devices

---

## Environment Variables Needed

```env
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxx  
STRIPE_WEBHOOK_SECRET=whsec_xxxx
MOLLIE_API_KEY=live_xxxx
COINBASE_COMMERCE_API_KEY=xxxx
COINBASE_COMMERCE_WEBHOOK_SECRET=xxxx
SITE_URL=https://carlay-art.com
```

## Priority Order

1. **Stripe checkout** (covers 80% of buyers globally)
2. **Deploy to Vercel** (makes it live)
3. **Mollie** (European local payment methods)
4. **Coinbase** (crypto — niche but differentiating)
5. **Email notifications**
6. **Image optimization + meta tags**
