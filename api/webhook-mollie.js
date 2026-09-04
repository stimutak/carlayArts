const { recordPayment } = require('./_orders');

/**
 * Mollie payment confirmation.
 *
 * Mollie does not sign its webhook. It posts only a payment id, and the
 * documented pattern is to call the API back and trust that response rather
 * than anything in the request body — so a forged POST can at worst make us
 * re-read a real payment.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Mollie not configured' });

  const body = typeof req.body === 'string' ? new URLSearchParams(req.body) : null;
  const id = body ? body.get('id') : req.body?.id;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing payment id' });

  try {
    const response = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) {
      console.error('Mollie webhook: payment lookup failed', response.status);
      return res.status(502).json({ error: 'Payment lookup failed' });
    }
    const payment = await response.json();

    recordPayment({
      provider: 'mollie',
      status: payment.status,
      reference: payment.id,
      amount: payment.amount?.value ? Number(payment.amount.value) : null,
      currency: payment.amount?.currency ?? null,
      email: payment.details?.consumerAccount ?? null,
      items: payment.description ?? null,
    });

    // Mollie retries on any non-2xx, so acknowledge once the status is recorded.
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Mollie webhook error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
