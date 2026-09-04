const crypto = require('node:crypto');
const { readRawBody } = require('./_raw-body');
const { recordPayment } = require('./_orders');

/**
 * Coinbase Commerce payment confirmation.
 *
 * Signed with HMAC-SHA256 over the raw body using the shared webhook secret,
 * compared in constant time so the check cannot be probed byte by byte.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'Coinbase webhook not configured' });

  const signature = req.headers['x-cc-webhook-signature'];
  if (typeof signature !== 'string') return res.status(400).json({ error: 'Missing signature header' });

  const { raw, exact } = await readRawBody(req);
  if (!exact) {
    console.error('Coinbase webhook: raw body unavailable; refusing to verify');
    return res.status(500).json({ error: 'Raw body unavailable' });
  }

  const expected = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
  const provided = Buffer.from(signature, 'utf8');
  const computed = Buffer.from(expected, 'utf8');
  if (provided.length !== computed.length || !crypto.timingSafeEqual(provided, computed)) {
    console.error('Coinbase webhook signature rejected');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(raw).event;
  } catch {
    return res.status(400).json({ error: 'Malformed payload' });
  }

  if (event?.type === 'charge:confirmed' || event?.type === 'charge:failed') {
    const charge = event.data ?? {};
    const price = charge.pricing?.local ?? {};
    recordPayment({
      provider: 'coinbase',
      status: event.type === 'charge:confirmed' ? 'paid' : 'failed',
      reference: charge.code ?? null,
      amount: price.amount ? Number(price.amount) : null,
      currency: price.currency ?? null,
      email: null,
      items: charge.name ?? null,
    });
  }

  res.status(200).json({ received: true });
};
