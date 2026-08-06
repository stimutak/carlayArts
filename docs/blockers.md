# Remaining owner and client blockers

This is the engineering stop list. Everything outside it may continue with labeled
placeholders and fail-closed behavior. The client-facing detailed checklist is rendered
at `/client-a-fournir` from `docs/artwork-inventory-review.json`.

## Artwork activation

- Owner-approved availability and price for each work intended for sale.
- Faithful, uncropped full-work media before a work can become `available`.
- Confirmed dimensions, year, signature, condition, framing, and certificate status.
- Approved series statement and work-specific note.

Current safeguard: 39 historical sold works remain `sold`; the other 21 remain
`not-for-sale`. Local-storage edits cannot bypass the build-time commerce allowlist.

## Artist and public identity

- Approved biography, process, inspirations, quote, portrait context/credit, and
  signature usage.
- Exact official Instagram/profile URL.

Current workaround: structured, visibly provisional content and a non-clickable social
status. No invented claims are presented as facts.

## Policies and live commerce

- Approved shipping, duties/taxes, returns/cancellation, damage, condition, framing,
  certificate, privacy, terms, and legal-owner content.
- Explicit live-payment decision, provider ownership, production credentials, webhook
  and inventory-reservation design, monitoring, refund flow, and transaction testing.

Current safeguard: checkout is local demo-only, requests no payment credentials, calls
no provider API, stores no customer details in confirmation, and states that no payment
was taken.

## Publication

- Owner acceptance of content/inventory and explicit approval to publish or enable
  indexing.

Current safeguard: every page emits `noindex, nofollow`, `robots.txt` disallows all
crawlers, and no deployment or public push is performed implicitly.
