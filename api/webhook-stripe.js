const Stripe = require('stripe');
const { readRawBody } = require('./_raw-body');
const { recordPayment } = require('./_orders');

/**
 * Stripe payment confirmation.
 *
 * The browser redirect to success_url is not proof of payment — a buyer can
 * open that URL directly. This is the only trustworthy signal.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !apiKey) return res.status(500).json({ error: 'Stripe webhook not configured' });

  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing stripe-signature header' });

  const { raw, exact } = await readRawBody(req);
  if (!exact) {
    // Verifying a re-serialised body would either fail outright or, worse,
    // appear to succeed against bytes Stripe never signed.
    console.error('Stripe webhook: raw body unavailable; refusing to verify');
    return res.status(500).json({ error: 'Raw body unavailable' });
  }

  const stripe = new Stripe(apiKey);
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (error) {
    console.error('Stripe webhook signature rejected:', error.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    recordPayment({
      provider: 'stripe',
      status: session.payment_status === 'paid' ? 'paid' : session.payment_status,
      reference: session.id,
      amount: session.amount_total != null ? session.amount_total / 100 : null,
      currency: (session.currency || 'eur').toUpperCase(),
      email: session.customer_details?.email ?? null,
      items: session.metadata?.order_items ?? null,
    });
  }

  // Acknowledge everything else so Stripe stops retrying.
  res.status(200).json({ received: true });
};
