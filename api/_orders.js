/**
 * Records the outcome of a payment.
 *
 * There is no datastore on this project yet, so this writes a single
 * structured line to the function log, which on Vercel is durable and
 * queryable. That is enough to reconcile a payment by hand and to alert on,
 * but it is NOT an order system: it cannot be read back by the site, and it
 * will not survive log retention.
 *
 * Before taking real money at volume, point this at a real store (Vercel KV,
 * Postgres, or an email to the artist) — the call sites will not need to
 * change, only this function.
 */
function recordPayment(event) {
  const line = {
    at: new Date().toISOString(),
    kind: 'payment',
    provider: event.provider,
    status: event.status,
    reference: event.reference ?? null,
    amount: event.amount ?? null,
    currency: event.currency ?? null,
    email: event.email ?? null,
    items: event.items ?? null,
  };
  console.log(`PAYMENT ${JSON.stringify(line)}`);
  return line;
}

module.exports = { recordPayment };
