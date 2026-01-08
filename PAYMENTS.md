# Payment Integration Strategy

## Overview

Carlay Art requires a payment system that is:
- **Safe** — fraud protection, secure transactions
- **Simple** — minimal friction for buyers worldwide
- **Global** — support for international cards, local methods, and crypto

## Recommended Stack

### Primary: Mollie (Europe)
**Why Mollie:**
- Excellent for European markets (France, Netherlands, Belgium, Germany)
- Supports iDEAL, Bancontact, SEPA, Giropay
- Lower fees than Stripe for EU transactions
- Easy integration, good dashboard

**Supported methods:**
- Credit/Debit cards (Visa, Mastercard, Amex)
- iDEAL (Netherlands)
- Bancontact (Belgium)
- SEPA Direct Debit
- Giropay (Germany)
- EPS (Austria)
- Przelewy24 (Poland)
- Apple Pay / Google Pay

### Secondary: Stripe (Global Fallback)
**Why Stripe:**
- Best-in-class for US/international cards
- Apple Pay, Google Pay integration
- Excellent fraud detection (Radar)
- Easy recurring payments if needed

**Supported methods:**
- All major credit/debit cards
- Apple Pay / Google Pay
- Link (Stripe's one-click)
- Bank redirects (various countries)

### Crypto: Coinbase Commerce
**Why Coinbase Commerce:**
- Simple integration (hosted checkout or API)
- Supports major cryptocurrencies
- Auto-conversion to EUR/USD available
- No volatility risk if using instant conversion

**Supported cryptocurrencies:**
- Bitcoin (BTC)
- Ethereum (ETH)
- USDC (stablecoin)
- Litecoin (LTC)
- Dogecoin (DOGE)
- DAI (stablecoin)

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CHECKOUT PAGE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   MOLLIE    │  │   STRIPE    │  │  COINBASE COMMERCE  │ │
│  │             │  │             │  │                     │ │
│  │  • iDEAL    │  │  • Cards    │  │  • Bitcoin          │ │
│  │  • Cards    │  │  • Apple    │  │  • Ethereum         │ │
│  │  • Bancon.  │  │  • Google   │  │  • USDC             │ │
│  │  • SEPA     │  │  • Link     │  │  • Others           │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  ORDER CREATED  │
                    │  → Webhook      │
                    │  → Confirmation │
                    │  → Shipping     │
                    └─────────────────┘
```

## Implementation

### Option A: Snipcart (Simplest)
Full hosted cart solution that integrates with Mollie/Stripe.
```html
<!-- Add to page -->
<script src="https://cdn.snipcart.com/themes/v3/default/snipcart.js"></script>
<link rel="stylesheet" href="https://cdn.snipcart.com/themes/v3/default/snipcart.css" />

<div hidden id="snipcart" data-api-key="YOUR_PUBLIC_KEY"></div>

<!-- Product button -->
<button class="snipcart-add-item"
  data-item-id="romeo-1"
  data-item-price="3000.00"
  data-item-url="/boutique/romeo-1"
  data-item-name="Romeo 1"
  data-item-description="Acrylic on canvas, 76×102cm">
  Acheter €3,000
</button>
```

### Option B: Custom Checkout
Direct API integration for more control.

**Mollie Setup:**
```javascript
// Server-side (Node.js)
const { createMollieClient } = require('@mollie/api-client');
const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

async function createPayment(amount, description, redirectUrl) {
  const payment = await mollie.payments.create({
    amount: { currency: 'EUR', value: amount },
    description,
    redirectUrl,
    webhookUrl: 'https://carlay-art.com/api/webhooks/mollie',
    method: ['ideal', 'creditcard', 'bancontact', 'applepay']
  });
  return payment;
}
```

**Coinbase Commerce Setup:**
```javascript
// Crypto checkout
const checkoutUrl = `https://commerce.coinbase.com/checkout/${CHECKOUT_ID}`;
// Or use hosted button
```

## Pricing & Fees

| Provider | Transaction Fee | Notes |
|----------|----------------|-------|
| Mollie (iDEAL) | €0.29 fixed | Best for Dutch buyers |
| Mollie (Cards) | 1.8% + €0.25 | European cards |
| Stripe (Cards) | 1.5% + €0.25 (EU) / 2.9% + €0.25 (Intl) | Volume discounts |
| Coinbase Commerce | 1% | Converted to fiat |

## Security Checklist

- [ ] SSL/TLS on all pages
- [ ] PCI compliance (handled by payment providers)
- [ ] 3D Secure enabled for cards
- [ ] Webhook signature verification
- [ ] Rate limiting on checkout endpoints
- [ ] Fraud rules configured in Stripe Radar

## Shipping Integration

For art shipping, consider:
- **Packlink PRO** — EU shipping aggregator
- **Shippo** — US/International
- **Custom quotes** — For high-value pieces (>€2,000)

Insurance should be included for all shipments.

## Configuration Files Needed

```
/config/
├── mollie.js         # Mollie API config
├── stripe.js         # Stripe API config
├── coinbase.js       # Coinbase Commerce config
└── shipping.js       # Shipping rates & zones
```

## Environment Variables

```env
# Mollie
MOLLIE_API_KEY=live_xxxx
MOLLIE_PROFILE_ID=pfl_xxxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxx

# Coinbase Commerce
COINBASE_COMMERCE_API_KEY=xxxx
COINBASE_COMMERCE_WEBHOOK_SECRET=xxxx

# General
SITE_URL=https://carlay-art.com
CURRENCY=EUR
```

## Next Steps

1. [ ] Create Mollie account & verify
2. [ ] Create Stripe account & verify
3. [ ] Create Coinbase Commerce account
4. [ ] Implement checkout flow
5. [ ] Set up webhooks
6. [ ] Test all payment methods
7. [ ] Configure shipping rates
8. [ ] Go live
