# CARLAY ART Live Commerce and Payments Design

**Date:** 2026-08-06

**Status:** Approved design; implementation requires a separate plan

**Extends:** `2026-08-05-noir-gallery-v2-design.md`

**Initial market:** buyers in the United States

**Merchant assumption:** established in metropolitan France, pricing and settlement in EUR

## 1. Objective

Replace the current local demo checkout with a production-capable, fail-closed
commerce foundation for unique artworks while preserving demo mode as the default.
The foundation supports:

- card checkout through Stripe;
- a hosted crypto adapter, with CoinGate as the preferred pilot candidate and EUR
  conversion/settlement as a mandatory capability;
- transactional reservation of unique inventory;
- provider-neutral orders, payment attempts, refunds, and reconciliation;
- explicit operational, legal, content, and credential activation gates; and
- a single client-needs checklist showing every input still required.

This design does not authorize account creation, spending, real charges, or production
activation. No live payment path is enabled by committed code or by a deployment that
lacks the complete activation configuration.

## 2. Fixed decisions

1. Artwork prices and accounting records are denominated in EUR. The server is the
   sole authority for price, availability, shipping, taxes, and order totals.
2. Stripe Checkout is the initial card rail. Cards use manual authorization and
   capture so the owner can verify unique-work availability, shipping, fraud signals,
   and required customer checks before capture.
3. CoinGate hosted checkout is the preferred crypto pilot candidate, subject to every
   activation proof in this document. The required operating model converts the buyer's
   crypto into a custodial EUR processor balance that is later paid to the French bank
   account by SEPA. The merchant does not directly custody crypto and the site never
   displays a merchant wallet address.
4. Initial crypto product intent is USDC, BTC, and ETH on an explicit provider-approved
   network allowlist. The production allowlist is published only after sandbox and
   merchant-account verification.
5. The product target is a 30-minute reservation for all selected works. Stripe Checkout
   can enforce that session expiry. CoinGate's documented quote begins only after asset
   and network selection, while a `new` provider order may remain open for two hours.
   CoinGate live mode therefore remains blocked until sandbox and written provider
   evidence prove the hosted order can be made non-payable at the local 30-minute
   deadline. Local time alone never releases inventory while a provider order can still
   accept payment.
6. Browser redirects and provider callbacks are never proof of payment. Every state
   change is reconciled against an authenticated provider API snapshot.
7. `COMMERCE_MODE=demo` remains the default. Card and crypto live modes have separate,
   explicit activation switches and fail closed when configuration is incomplete.
8. Refunded, disputed, reversed, mismatched, or late-paid work is never automatically
   relisted. An owner must review it.
9. There is no automatic provider failover during an active payment attempt. A customer
   may choose another rail only after the first attempt is confirmed expired, failed,
   or deactivated and a new checkout is created.
10. The first live release accepts only validated US shipping addresses. Other countries
    remain available in demo/inquiry experiences until their shipping, tax, customs, and
    consumer-policy decisions are approved.

## 3. Provider decision

### 3.1 Cards: Stripe Checkout

Stripe is preferred over Mollie for this US-buyer/French-merchant use case because it
combines hosted Checkout, US wallet/card coverage, manual capture, signed webhooks,
idempotency, and mature reconciliation APIs. The live account must confirm French
eligibility, payout bank, statement descriptor, fees, payout schedule, and any reserve
terms before activation.

### 3.2 Crypto: CoinGate preferred pilot candidate

CoinGate is the preferred crypto candidate because its published offer supports France,
hosted checkout, EUR conversion, SEPA withdrawal, and more than ten crypto assets. Its
published 1% processing fee is not a total landed-cost promise: quote risk margin,
refund/conversion fees, and other account terms can apply. Standard automatic settlement
is weekly, with a published EUR 50 minimum and free SEPA withdrawal. Its Lithuanian
entity is listed by the Bank of Lithuania as a MiCA crypto-asset service provider and
payment institution. The merchant must still prove legal-person eligibility, French-
passported services, intended US shopper coverage, artwork-category underwriting,
enabled assets/networks, refund services, settlement contract, and actual costs.

CoinGate callbacks document per-order tokens and source-IP allowlisting, but not a
Stripe-style signed payload. A callback is therefore only a wake-up signal. The server
must validate the token and source, then fetch the canonical order from CoinGate using
authenticated API credentials before changing local state.

### 3.3 Deferred alternatives

- Stripe stablecoin Checkout is a desirable later adapter because its signed webhooks
  and native idempotency are stronger. As of this design, French merchant access and
  non-USD presentment are private-preview features. It is not a launch dependency.
- BitPay supports French EUR settlement and remains a fallback, but its likely-volume
  pricing is higher and its invoice notifications are unsigned.
- Coinbase is excluded. After 2026-03-31, Coinbase Commerce merchants could no longer
  create charges or access its portal/dashboard, and Coinbase Business currently accepts
  only US and Singapore legal entities. This does not describe the accessibility of
  legacy self-custodied assets.
- Direct receipt to a merchant-controlled wallet is excluded from launch because it
  adds custody, key management, volatility, accounting, sanctions-screening, privacy,
  and refund complexity without improving the buyer journey.

## 4. Runtime architecture

The static Astro site remains the presentation layer. Commerce is added as isolated
server-side services:

```text
Astro static pages
    -> same-origin /api endpoints on Vercel Functions
        -> order service and state machine
            -> EU-region transactional Postgres
            -> Stripe adapter
            -> CoinGate adapter
        <- provider webhooks/callbacks
        <- scheduled reconciliation
```

- Static artwork content remains build-time validated.
- A database inventory row is the runtime source of truth for sale state.
- Vercel Functions host only the bounded checkout, order-status, webhook, and
  reconciliation endpoints.
- Neon Postgres in an EU region is the initial database recommendation. The schema and
  service layer remain standard PostgreSQL so the provider can be replaced.
- All provider secrets stay in server-only environment variables. No secret is exposed
  through Astro public environment variables, HTML, logs, or client-side bundles.

## 5. Modes and fail-closed configuration

```text
COMMERCE_MODE=demo | sandbox | live
CARD_PAYMENTS=off | sandbox | live
CRYPTO_PAYMENTS=off | sandbox | live
CARD_PROVIDER=stripe
CRYPTO_PROVIDER=coingate
LIVE_COMMERCE_APPROVED=CARLAY_LIVE_2026
```

Rules:

- Missing or unknown values resolve to demo/off, never live.
- `COMMERCE_MODE=live` alone cannot enable a rail.
- `COMMERCE_MODE=demo` requires both rails `off`; `sandbox` permits only `off|sandbox`;
  `live` permits `off|live` and rejects any mixed provider environment.
- A live rail also requires a complete provider-specific configuration, database,
  canonical site URL, webhook/callback secret, and the exact production-only value
  `LIVE_COMMERCE_APPROVED=CARLAY_LIVE_2026`.
- Preview deployments cannot use live providers.
- Credential fingerprints and provider environment identifiers are validated without
  logging secrets; sandbox credentials in live mode or live credentials outside the
  production deployment fail startup validation.
- Production startup/configuration validation returns a maintenance-safe checkout state
  when any required value is missing; it does not partially initialize commerce.
- Demo mode continues to state unambiguously that no payment is taken.

## 6. Data model

All money is stored as integer minor units. All timestamps are UTC. Public routes use
opaque, high-entropy order tokens rather than sequential database identifiers.

### `catalog_revisions` and `catalog_items`

- An approved database catalog revision is the runtime authority for title, EUR price,
  sale eligibility, cultural-property clearance status, and content checksum.
- Deployment imports the validated Astro content artifact into a new immutable revision.
- Exactly one revision is active. Live startup rejects checksum, slug, price, or sale-
  eligibility differences between the deployed artifact and active database revision.

### `inventory`

- `artwork_slug` primary key
- `status`: `available | reserved | authorized | sold | manual_review | unavailable`
- `reservation_order_id`, nullable
- `reserved_until`, nullable
- `version` for optimistic diagnostics
- created/updated timestamps

### `orders`

- internal UUID and unique public token hash
- `status`:
  `creating | payment_pending | payment_processing | authorized | paid | expired |
  canceled | failed | refund_pending | partially_refunded | refunded | manual_review`
- `fulfillment_status`: `pending | compliance_hold | payment_hold | ready | fulfilled |
  canceled`
- `compliance_status`: `not_required | pending | cleared | rejected`
- currency and server-calculated subtotal, shipping, tax, duty presentation, and total
- encrypted or provider-referenced fulfillment details, minimized to what is required
- reservation and optional confirmation-grace timestamps
- server-resolved terms/shipping/returns versions affirmatively accepted by the buyer,
  privacy-notice version presented, and timestamp
- created/updated timestamps

### `order_items`

- order ID and artwork slug
- immutable title snapshot
- immutable EUR unit-price minor units
- unique constraint preventing the same artwork from appearing twice in one order

### `payment_attempts`

- order ID, rail (`card | crypto`), and provider
- provider session/payment ID and unique idempotency key
- normalized status:
  `creating | active | processing | authorized | succeeded | expired | deactivated |
  failed | refund_pending | partially_refunded | refunded | unknown`
- exception:
  `none | underpaid | overpaid | late_payment | quote_expired | amount_mismatch |
  asset_mismatch | network_mismatch | unlocated_payment | provider_support_required |
  provider_state_conflict`
- expected fiat amount/currency
- optional expected, received, and confirmed crypto atomic amounts
- optional asset, network, token contract, and transaction identifiers
- hosted URL, provider status, expiry, quote expiry, and last-reconciled timestamps
- unique order ID: each order has at most one payment attempt, created only after any
  pre-payment compliance clearance; a rail switch or customer retry creates a new order
  only after the previous order is terminal and its inventory release is canonically safe
- unique constraints on `(provider, provider_session_id)` and the local attempt key

Crypto quantities use `NUMERIC(78,0)` atomic units or validated canonical decimal
strings plus explicit asset-decimal metadata. JavaScript `number` is forbidden for
expected, received, confirmed, and refunded crypto quantities.

### `payment_receipts`

- unique provider transaction identifier
- payment-attempt ID, asset, network, and transaction hash when applicable
- atomic amount and status (`detected | confirming | confirmed | reversed | failed`)
- first-seen and provider-confirmed timestamps
- whether the provider observed it before quote/session expiry

### `refunds`

- order and payment-attempt IDs
- provider refund ID and idempotency key
- fiat amount and optional crypto atomic amount
- status, reason, transaction identifier, and timestamps
- provider request deadline, compliance-information deadline, fee-accrual start/rate,
  fallback-route requirement, and last deadline-alert timestamp
- unique constraints on provider refund ID and local refund-deduplication key; the latter
  is not represented as a provider guarantee unless that provider documents it

### `settlement_entries` and `payouts`

- Per attempt: gross EUR receivable, provider quote/rate source and timestamp, provider
  fee, risk margin/spread when supplied, refund/conversion fees, net processor balance,
  reserve/hold, and settlement status.
- Per payout: provider batch ID, amount, currency, expected/actual bank-arrival timestamp,
  status, failure reason, and reconciled bank reference.
- Payout reconciliation never changes order payment truth; it alerts on unreconciled or
  held merchant funds.

### `compliance_reviews`

- Order/customer linkage, linked-order aggregation result, threshold/risk triggers,
  reviewer, decision, timestamps, and external evidence-system references.
- Identity and beneficial-owner documents are stored only in an approved encrypted,
  least-privilege compliance system with the required retention policy, not in ordinary
  commerce tables. In-scope sales remain disabled until that system and process exist.

### `commerce_events`

Append-only audit events containing order ID, actor/source, normalized event type,
idempotency key or provider event ID, redacted metadata, and timestamp. Sensitive
payment data, credentials, and full addresses are forbidden in event metadata.
`(provider, provider_event_id)` is unique. Inserting the provider event, applying its
state transition, and appending the resulting audit record occur in one transaction;
a rolled-back transition remains safely retryable.

### Atomic state invariants

Order, active attempt, inventory, fulfillment, and compliance states change in the same
database transaction. Only these outcome classes are legal:

| Outcome | Order | Attempt | Inventory | Fulfillment |
|---|---|---|---|---|
| Pre-payment compliance hold | `manual_review` | no attempt | `manual_review` | `compliance_hold` |
| Hosted session active | `payment_pending` | `active` | `reserved` | `pending` or `compliance_hold` |
| Crypto funds detected | `payment_processing` | `processing` | `reserved` | `payment_hold` |
| Card authorized | `authorized` | `authorized` | `authorized` | `payment_hold` or `compliance_hold` |
| Paid and cleared | `paid` | `succeeded` | `sold` | `ready` |
| Paid, compliance incomplete | `paid` | `succeeded` | `sold` | `compliance_hold` |
| Canonical expiry, no funds | `expired` | `expired` | `available` | `canceled` |
| Canonical cancellation/deactivation, no funds | `canceled` | `deactivated` | `available` | `canceled` |
| Definite creation/payment failure, no funds | `failed` | `failed` | `available` | `canceled` |
| Provider ambiguity/mismatch | `manual_review` | `unknown` or provider terminal state | `manual_review` | `payment_hold` |
| Partial payment still payable | `payment_processing` | `processing` with `underpaid` | `reserved` | `payment_hold` |
| Provider-accepted small underpayment | `paid` | `succeeded` with `underpaid` | `sold` | `payment_hold` |
| Sufficient overpayment | `paid` | `succeeded` with `overpaid` | `sold` | `payment_hold` |
| Refund requested | `refund_pending` | `refund_pending` | `sold` | `payment_hold` |
| Partial refund complete | `partially_refunded` | `partially_refunded` | `sold` | `payment_hold` |
| Full refund complete | `refunded` | `refunded` | `manual_review` | `canceled` |
| Dispute, reversal, or unresolved exception | `manual_review` | provider-derived state | `manual_review` | `payment_hold` |

`fulfillment_status=ready` additionally requires `compliance_status` to be
`not_required` or `cleared`. A late payment against an order whose inventory has since
been reserved or sold by another order never changes the current inventory row; the late
order enters manual review and refund handling. No automation releases `authorized`,
`sold`, or `manual_review` inventory.

## 7. Inventory and order transaction

`POST /api/checkout-sessions` accepts artwork slugs, validated US fulfillment fields,
affirmative consent flags, and a rail. It never accepts a client-supplied price. The
browser supplies an `Idempotency-Key` with at least 128 bits of randomness; a database
unique constraint binds that key to the validated request hash and response. Reuse with
a different body is rejected.

Before parsing, the endpoint enforces same-origin `Origin`, `application/json`, a small
16 KiB body limit, 1-10 unique slugs, and strict schema rejection of unknown fields.
It does not permit credentialed cross-origin requests.

In one serializable database transaction the service:

1. sorts and locks the requested inventory rows;
2. rejects missing, unavailable, reserved, or non-sale catalog entries;
3. loads current prices from the active approved database catalog revision and calculates
   the order;
4. verifies that a supported, approved shipping/tax decision exists;
5. resolves the currently published policy versions server-side and verifies affirmative
   acceptance rather than trusting browser-selected version identifiers;
6. performs linked-order aggregation and the configured AML/sanctions risk gate;
7. creates the order and immutable item snapshots;
8. reserves every requested work until 30 minutes after transaction time; and
9. commits before calling an external provider.

An order meeting the applicable art-market threshold or a risk trigger does not create
an external payment session. It enters `manual_review`, inventory enters `manual_review`,
and the owner completes the approved compliance process before offering payment. The
same pre-payment rule applies to card and crypto; provider KYC does not replace it.

Provider session creation uses a durable local attempt identifier stored before the
request. Stripe also receives that value through its native idempotency mechanism.
CoinGate receives it as the merchant order reference; sandbox verification must prove
that an ambiguous create can be resolved by authenticated retrieval before CoinGate is
enabled. A definite creation failure expires the attempt and releases the reservation.
An ambiguous timeout is reconciled against the same provider and attempt; it must not
create a second session or switch providers. If non-creation cannot be proven, the order
moves to manual review and retains inventory rather than risking a double sale.

Concurrent checkout requests for the same work must produce exactly one reservation.
Cart-local availability is informative only and cannot bypass this transaction.

## 8. Card flow

1. The server creates a 30-minute Stripe Checkout Session for the server-calculated EUR
   amount with a PaymentIntent configured for manual capture. Only card-backed methods
   that Stripe confirms support manual capture are enabled; dynamic incompatible payment
   methods are excluded.
2. Stripe hosts payment credentials and applicable wallet/card authentication.
3. The success redirect returns only the opaque order token and displays a pending state.
4. A signed Stripe webhook is verified from the raw request body, deduplicated by event
   ID, and followed by an authenticated Stripe fetch.
5. A valid authorization moves the order to `authorized` and inventory to `authorized`,
   clears `reserved_until`, and sets `capture_deadline` to the earlier of one business
   day or Stripe's provider-returned `capture_before` value. Reservation expiry jobs
   cannot release `authorized` inventory.
6. The owner performs the documented order/compliance review and captures before that
   deadline.
7. Successful capture moves the order to `paid` and inventory to `sold`.
8. A Checkout Session that reaches its 30-minute expiry without an authorization is
   re-fetched, marked expired, and releases inventory automatically.
9. Rejection, cancellation, or expiry after authorization moves the order to manual
   review; inventory is released only through the authenticated, idempotent
   `release_inventory` operator action after canonical reconciliation.

The owner-review interface is out of scope for the first public foundation. Initially,
capture/cancel is performed in the Stripe Dashboard using the order reference, with the
site reconciliation job importing the resulting state.

## 9. Crypto flow

1. The server creates a CoinGate hosted order in EUR with a unique callback token and
   merchant order reference only after reserving inventory locally.
2. Live activation requires sandbox proof that CoinGate can restrict each order, or the
   merchant account, to the approved asset/network allowlist. An enabled asset/network
   outside USDC, BTC, and ETH is an activation failure. Authenticated order retrieval
   must expose enough selected-asset/network detail to enforce the rule.
3. The browser is redirected to CoinGate. The site never constructs payment wallet
   addresses, QR payloads, transaction-signing requests, or exchange rates.
4. The local target deadline remains 30 minutes. The service stores CoinGate's actual
   returned order and quote timestamps; it never calculates a quote expiry by assuming
   the documented 20-minute window began at order creation.
5. A callback is accepted only from the refreshed provider IP allowlist and with a
   constant-time token comparison. The callback body alone cannot change order state.
6. The server fetches the canonical CoinGate order through the authenticated API and
   verifies provider order ID, merchant reference, EUR price, receive currency, status,
   timestamps, and every available asset/network/amount field.
7. Funds detected but not final move the order to `payment_processing`; the reservation
   remains held. `confirmation_grace_until` is the provider finalization deadline when
   supplied, otherwise two hours after first provider-detected funds. At the grace
   deadline, any nonterminal or inconsistent state becomes `manual_review` with inventory
   `manual_review`; automation never releases it.
8. Canonical `paid` status with matching merchant reference, gross EUR `price_amount`,
   `price_currency`, and EUR receive currency moves the attempt to `succeeded`, order to
   `paid`, and inventory to `sold`. Provider fees and net balance reconcile separately in
   the settlement ledger and do not redefine the gross sale price. This permits a
   provider-approved small crypto underpayment while preserving the full fiat sale-price
   record. Fulfillment remains held until compliance and exception checks pass; payment
   truth itself does not depend on later compliance approval.
9. At the local 30-minute deadline the service requests a provider-approved closure
   operation if the contracted API supplies one, then performs an authenticated re-fetch.
   Inventory becomes available only if the order is proven non-payable and no funds/
   receipts exist. Absence or failure of a closure capability, or any still-payable or
   ambiguous provider order, moves both order and inventory to `manual_review`. CoinGate
   live mode cannot be enabled until sandbox and written evidence show this closure rule
   is enforceable.

Authenticated CoinGate status mapping is exhaustive:

| CoinGate status | Normalized outcome |
|---|---|
| `new` | `payment_pending/active/reserved`; no proof of a quote or payment |
| `pending` | `payment_pending/active/reserved` while asset is selected but payment is awaited; if canonical received-amount fields are positive, use `payment_processing/processing/reserved` |
| `confirming` | `payment_processing/processing/reserved`; apply confirmation grace |
| `paid` | `paid/succeeded/sold` after merchant reference, gross EUR price/currency, receive currency, and available asset/network fields reconcile; fees/net balance reconcile separately and fulfillment may remain held |
| `invalid` | `manual_review`; classify underpayment, overpayment, mismatch, or provider-support case from canonical fields |
| `expired` or `canceled` | release only when canonical fields prove non-payable and no funds; otherwise `manual_review` |
| `refunded` | `refunded/refunded/manual_review`; never auto-relist |
| `partially_refunded` | `partially_refunded/partially_refunded/sold`; fulfillment remains held |
| missing or future value | `manual_review/unknown/manual_review` and alert |

Exception rules:

- A detected underpayment remains `payment_processing` while the canonical provider
  order permits top-up. CoinGate may accept a sufficiently small underpayment as `paid`;
  that result is recorded as `underpaid` and fulfillment remains on hold. An unresolved
  terminal underpayment moves order and inventory to `manual_review` for the provider
  refund/support workflow.
- A canonical `paid` overpayment records the excess, moves the work to `sold`, and holds
  fulfillment while excess-refund handling is reconciled.
- A payment first detected after inventory release is a late payment. It never reclaims
  artwork from another order; the original order enters manual review and refund handling.
- Wrong asset/network reports can be unlocated, unrecoverable, or subject to provider
  support and recovery fees. A buyer-supplied transaction hash is evidence for support,
  never proof of receipt. The site makes no recovery guarantee.
- A quote is never silently repriced. A retry creates a new order and provider quote only
  after the previous attempt is terminal and inventory release is canonically safe.
- CoinGate can expose hosted shopper refund requests for underpaid, overpaid, and late
  payments. Merchant-initiated refunds can require a destination wallet and asynchronous
  provider states. Prefer provider-hosted collection. If merchant collection is required,
  use an approved secure flow with wallet/network validation, sanctions re-screening,
  unrelated-wallet escalation, privacy controls, and explicit fee/volatility terms.
  Carlay never invents or silently selects a refund address and never repeats an ambiguous
  refund request; it imports and reconciles the canonical provider refund state.
- The adapter records CoinGate's contractual clocks: merchant-requested provider refunds
  for successfully credited payments are available for 90 calendar days, while incomplete
  or compliance-suspended payments can accrue the currently stated 1% daily
  administrative fee unless the required claim/information is completed within 100 days.
  Alerts begin well before each deadline. The approved consumer-refund policy must include
  a lawful, secure alternative after CoinGate availability ends and must not imply that
  CoinGate can execute every later claim.

## 10. Provider-neutral API

```http
POST /api/checkout-sessions
Content-Type: application/json
Idempotency-Key: 128-bit-or-stronger-random-value

{
  "slugs": ["artwork-slug"],
  "paymentRail": "card" | "crypto",
  "customer": {
    "givenName": "...",
    "familyName": "...",
    "email": "...",
    "shippingAddress": {
      "addressLine1": "...",
      "addressLine2": "... optional ...",
      "city": "...",
      "region": "two-letter US subdivision code",
      "postalCode": "five digits or ZIP+4",
      "countryCode": "US"
    }
  },
  "consents": {
    "terms": true,
    "shipping": true,
    "returns": true
  }
}
```

Names and city are trimmed/NFC-normalized, reject control characters, and permit at most
100 Unicode scalar values; each address line permits 200; email permits 254 and must pass
the application's conservative email schema. `countryCode` is literal `US`, `region`
normalizes to `[A-Z]{2}`, and `postalCode` must match `^[0-9]{5}(-[0-9]{4})?$`. Syntactic
acceptance is not a carrier deliverability guarantee. The server binds accepted terms/
shipping/returns versions and the privacy notice presented; cookie and marketing consent
are separate and never inferred from checkout submission.

Successful response:

```json
{
  "checkoutUrl": "https://hosted-provider.example/session",
  "orderToken": "opaque-public-token",
  "reservationExpiresAt": "ISO-8601 timestamp",
  "providerQuoteExpiresAt": "ISO-8601 timestamp or null"
}
```

Other endpoints:

```text
GET  /api/orders/:orderToken
POST /api/webhooks/stripe
POST /api/callbacks/coingate
POST /api/internal/reconcile-payments
POST /api/internal/orders/:orderId/actions
```

The internal reconciliation endpoint accepts only `POST`, denies browser CORS, and
requires a host-generated authorization secret or workload identity, constant-time
verification, timestamp/nonce replay protection, and a dedicated rate limit. Callback
source validation uses the hosting platform's trusted source-IP field, never an arbitrary
forwarded header; provider callbacks and public checkout traffic use separate limits.

The internal order-action endpoint is the initial operator surface and uses stronger
owner authentication than the scheduler: short-lived identity-provider credentials,
role authorization, recent multifactor authentication, request idempotency, reason text,
and append-only audit. It permits only these validated commands:

- `clear_compliance`: records the reviewer/evidence reference and changes compliance to
  `cleared`; it does not create a payment session by itself.
- `resume_checkout`: only after clearance and while the same order still owns
  `manual_review` inventory, transactionally creates its sole payment attempt and sets a
  fresh 30-minute reservation; after commit it invokes idempotent/uniquely referenced
  hosted-session creation. It returns a short-lived buyer checkout link for approved
  secure delivery.
- `reject_compliance`: with no payment attempt, moves the order to `canceled`, inventory
  to `available`, and fulfillment to `canceled`.
- `release_inventory`: only after authenticated provider reconciliation proves the
  attempt terminal with no funds or authorization; atomically moves the reviewed order
  to the matching terminal state and inventory to `available`.

No operator action directly sets `paid`, `authorized`, or `sold`, bypasses a provider
snapshot, edits money, or mutates completed audit events. Until this surface and its
tests exist, live card and crypto modes remain blocked; direct database mutation is not
an operating procedure.

The public order response exposes only buyer-safe normalized status, selected works,
totals, rail, and next-step copy. It never exposes provider objects, database IDs,
credentials, wallet addresses, fraud results, or internal review notes.

Order tokens contain at least 128 bits of entropy, are stored only as hashes, expire from
public lookup after 30 days, and can be rotated by support. Order
responses set `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and no-index
headers. Confirmation polls at 2 seconds, backs off to 30 seconds, and stops automatically
after 15 minutes with a manual-refresh option. Tokens are redacted from application and
access logs.

## 11. Reconciliation and state safety

A scheduled, idempotent reconciliation process handles:

- creation attempts older than a short timeout;
- active attempts near or beyond expiry;
- crypto attempts awaiting confirmation;
- authorized cards awaiting capture/cancel;
- callbacks/webhooks whose provider re-fetch initially failed;
- refunds not reaching a terminal state; and
- refund/provider-information deadlines at 60, 75, 85, 90, and 100 days, including
  accrued administrative-fee and fallback-route reconciliation; and
- any local/provider status mismatch.

Every run fetches the provider state, compares identity and amount, applies at most one
legal state transition, and records an append-only event. Unknown provider status or
invalid regression moves the order to `manual_review` and alerts the owner. A terminal
`paid` order can never regress to available inventory through automated code.

## 12. Checkout and confirmation experience

- `/commande` keeps the existing accessible address validation and order summary.
- Live mode accepts US shipping addresses only and explains that other destinations
  require an inquiry; the server enforces the same restriction.
- Live/sandbox mode replaces the demo choice with clear `Carte` and `Crypto` options.
- Card copy explains that checkout places a temporary authorization hold, not a completed
  sale; the order remains subject to review and is captured or canceled by the displayed
  deadline. Confirmation never labels authorization as payment.
- The crypto option explains that a regulated hosted provider processes the payment,
  the price is denominated in EUR, quotes expire, and blockchain transfers are generally
  irreversible without implying that consumer rights disappear.
- Before redirect, crypto copy identifies the provider and data-controller relationship,
  links its privacy notice, warns that identity verification may be required, and warns
  that wrong asset/network recovery is not guaranteed. Any provider-mandated shopper
  disclaimer is displayed unmodified with explicit acknowledgement, subject to counsel's
  approval of the complete checkout disclosure.
- Provider names and supported tokens are shown only when the corresponding rail is
  enabled and its current account configuration is verified.
- Submission disables duplicate actions and shows an inline, recoverable error. It never
  clears the cart before a provider session is successfully created.
- `/confirmation` polls normalized order status. It distinguishes pending,
  processing/authorized, paid, failed/expired, and manual-review outcomes.
- Shipping or certificate language is not presented as confirmed until the approved
  client policy exists.

## 13. Security and privacy controls

- Hosted payment pages handle card and wallet interaction.
- Stripe webhook verification uses the untouched raw body, signature, timestamp
  tolerance, and event-ID deduplication.
- CoinGate callback tokens are high-entropy, unique per attempt, stored hashed, compared
  in constant time, and combined with a regularly refreshed source-IP allowlist.
- Every callback/webhook triggers authenticated provider re-fetch before transition.
- Checkout creation, order lookup, and callback endpoints are rate limited.
- Logs use structured redaction. Card data, provider secrets, complete addresses,
  identity documents, seed phrases, private keys, and one-time codes are never logged.
- Customer and wallet/transaction-linked data is minimized, retention-limited, and
  covered by the approved privacy notice and provider agreements.
- No customer identity, email, shipping address, or internal order ID is written on-chain.
- Separate sandbox/live credentials and least-privilege scopes are mandatory.

## 14. Shipping, tax, consumer, AML, and accounting gates

Implementation may use explicit placeholders and disabled states, but live activation
requires owner-approved answers and professional review for the following:

1. Merchant legal entity, registered address, beneficial owners, French tax/VAT status,
   payout bank, and authorized account administrators.
2. US selling states, destinations served, carrier, insurance, packing, shipping price,
   delivery estimates, customs broker, importer of record, duties presentation, damage,
   returns, cancellation, and refund policy.
3. Per-artwork French cultural-property category/age/value/ownership review and any
   required French certificate or EU export licence before payment activation or shipment.
4. French export/VAT evidence workflow and accountant-approved invoicing/e-reporting:
   fiat invoice denomination; crypto quantity/rate/timestamp as settlement detail only;
   export wording and exit evidence; processor fees, exchange-rate records, and French
   international/B2C e-reporting applicability and dates.
5. US sales-tax registration/collection determination by destination.
6. Art-market AML determination, including the French EUR 10,000 transaction or linked-
   transaction threshold, customer/beneficial-owner checks, source-of-funds escalation,
   sanctions procedures, retention, reporting ownership, linked-order aggregation, and
   an approved restricted evidence system. Provider KYC cannot substitute for this gate.
7. CoinGate and Stripe merchant underwriting, account terms, enabled services, fees,
   payout schedule, reserve/hold terms, provider record access, and relevant US-state
   shopper permissions. For CoinGate this explicitly includes legal-person eligibility;
   exact France-passported services; the terms published 2026-07-31 and effective
   2026-09-01; mandatory unmodified shopper disclaimer/acknowledgement; EUR balance and
   beneficial-ownership treatment; weekly settlement/minimum; quote risk margin and
   effective spread; refund/conversion charges; supported networks; and enforceable
   30-minute hosted-order closure.
8. Crypto quote, refund currency/formula, volatility and network-fee allocation, wrong-
   network/asset handling, 90/100-day provider deadlines and fee exposure, a compliant
   fallback refund route, and provider compliance-review disclosures.
9. Terms, privacy notice, cookie policy, shipping/returns/refund policy, and checkout
   consent language approved for the actual seller and buyer markets.

The site must not claim tax exemption, zero duties, anonymity, no KYC, instant crypto
finality, guaranteed delivery, or final/no-refund sales without approved evidence.

## 15. Client-needs integration

The existing client-needs page remains the single handoff route. Implementation extends
it with a structured live-commerce section containing each gate above, its owner, status,
accepted file/value format, and where the supplied information will appear. Until inputs
arrive:

- factual text uses visibly editorial placeholders outside live checkout;
- checkout-dependent unknowns disable the live rail rather than inventing a value;
- secrets are requested through the deployment provider, never through source control,
  email, chat, or the client-needs form; and
- supplied documents are recorded by filename/version and require explicit approval
  before publication.

## 16. Test strategy and exit gates

### Unit and contract tests

- Server ignores client prices and rejects unknown/non-sale slugs.
- Request idempotency, request-hash mismatch, origin, content type, body/slug limits,
  exact schema, internal-endpoint authentication, and replay controls fail closed.
- Operator clearance/resume/reject/release commands enforce roles, fresh authentication,
  allowed source tuples, provider proof, idempotency, and audit requirements.
- State-machine tests cover every legal transition and reject terminal regressions.
- Each transition preserves the atomic order/attempt/inventory/fulfillment/compliance
  tuple and transactional provider-event deduplication.
- Stripe and CoinGate provider fixtures normalize into the same order model.
- Raw Stripe signature and CoinGate token/IP checks fail closed.
- Duplicate and out-of-order provider events are idempotent.
- Money arithmetic uses integer minor units; crypto atomic amounts never use floating point.

### Transaction and concurrency tests

- Simultaneous requests for one artwork produce one reservation.
- Multi-item reservation is all-or-nothing.
- Ambiguous provider creation cannot create a second active attempt.
- A payment detected before crypto expiry retains inventory through confirmation grace.
- Definitive unpaid expiry releases inventory exactly once.
- A still-payable CoinGate order at minute 30 cannot release inventory; provider closure
  and an authenticated no-funds snapshot are both required.
- Threshold/linked/risk-triggered orders create no hosted session before clearance.
- Late, partial, overpaid, mismatched, refund, and reversal cases enter the specified state.

### End-to-end tests

- Demo mode remains complete and cannot call provider endpoints.
- Stripe sandbox covers success, decline, authentication, authorization, capture, cancel,
  duplicate webhook, delayed webhook, expiry, and refund.
- CoinGate sandbox/fixtures cover success, quote expiry, duplicate callback, invalid token,
  invalid source, underpayment, overpayment, late payment, wrong asset/network, provider
  outage, `new` orders approaching two hours, ambiguous creation, enforced asset/network
  allowlist, hosted and merchant refund paths, conversion, settlement, and payout failure.
- Refund tests cover 90/100-day alerts, administrative-fee accrual, late consumer claims,
  fallback-route holds, and prohibition on repeated ambiguous provider refund requests.
- Confirmation never reports paid from a redirect alone.
- Accessibility, mobile checkout, keyboard, no-JavaScript disclosure, and failure copy pass.

### Activation exit gates

1. All automated tests, static build, content validation, and link checks pass.
2. Database migrations have forward and rollback instructions and succeed in an isolated
   preview database.
3. Sandbox provider callbacks reach the deployed preview and reconcile correctly.
4. Monitoring alerts are verified for webhook failure, reconciliation backlog, stuck
   reservation, capture deadline, refund failure, and manual-review order.
5. Owner completes a written sandbox acceptance checklist.
6. The legal/accounting/AML/shipping/cultural-export gates in section 14 are approved
   and versioned, including the required compliance evidence system and buyer disclosures.
7. Production credentials are installed by an authorized owner and a low-value controlled
   live transaction is separately approved before customer traffic is enabled.

## 17. Checkpoints, rollout, and rollback

Implementation is divided into reversible commits:

1. provider-neutral schema and state machine;
2. demo-compatible server API and transactional inventory;
3. Stripe sandbox adapter and reconciliation;
4. CoinGate sandbox adapter and reconciliation;
5. checkout/confirmation UI and client-needs integration;
6. deployment configuration, monitoring, security, and runbooks; and
7. sandbox end-to-end verification.

Live flags remain off through every checkpoint. Rollback disables both live rails first,
preserves orders/audit data, and returns the site to demo or inquiry-only mode. Database
rollback never deletes order, payment, refund, or audit records.

## 18. Primary references verified 2026-08-06

- Stripe Checkout lifecycle: <https://docs.stripe.com/payments/checkout/how-checkout-works>
- Stripe manual capture: <https://docs.stripe.com/payments/place-a-hold-on-a-payment-method>
- Stripe limited inventory: <https://docs.stripe.com/payments/checkout/managing-limited-inventory>
- Stripe stablecoin availability: <https://docs.stripe.com/payments/stablecoin-payments>
- Coinbase transition and eligibility: <https://help.coinbase.com/en/transitioning-from-coinbase-commerce-to-coinbase-business>
- CoinGate pricing and settlement: <https://coingate.com/pricing>
- CoinGate supported countries: <https://coingate.com/supported-countries>
- CoinGate callbacks: <https://developer.coingate.com/reference/api-callbacks>
- CoinGate order retrieval: <https://developer.coingate.com/reference/get-order>
- CoinGate order statuses: <https://developer.coingate.com/reference/order-statuses>
- CoinGate payment-processing terms: <https://coingate.com/policy/special-terms-and-conditions-for-crypto-assets-payment-processing>
- CoinGate payment-issue/refund guidance: <https://support.coingate.com/hc/en-us/articles/24676208554524-How-to-handle-customer-payment-issues-Merchant-guide>
- CoinGate shopper disclaimer: <https://coingate.com/app/uploads/2025/06/Shopper-Disclaimer.pdf>
- CoinGate regulator record: <https://www.lb.lt/en/sfi-financial-market-participants/uab-decentralized>
- ESMA MiCA register: <https://www.esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica>
- AMF MiCA overview: <https://www.amf-france.org/en/news-publications/depth/mica>
- French art-market AML scope: <https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044564139/2024-04-28/>
- Tracfin art-market guidance: <https://www.economie.gouv.fr/tracfin/focus-tracfin-ndeg1-le-blanchiment-de-capitaux-et-le-financement-du-terrorisme-dans-le-secteur-de-lart>
- French export VAT guidance: <https://www.douane.gouv.fr/fiche/tva-lexportation>
- French e-invoicing/e-reporting: <https://www.impots.gouv.fr/professionnel/je-decouvre-la-facturation-electronique>
- IRS digital-asset guidance: <https://www.irs.gov/filing/digital-assets>
