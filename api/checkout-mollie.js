const { resolveOrder, OrderError } = require('./_order');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Total is computed from the server catalog, not sent by the browser.
    const order = resolveOrder(req.body);

    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Mollie not configured' });
    const siteUrl = process.env.SITE_URL || 'https://carlay-art.com';
    const description = order.items.map(i => `${i.name} x${i.qty}`).join(', ');

    const response = await fetch('https://api.mollie.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: {
          currency: 'EUR',
          value: order.total.toFixed(2),
        },
        description: `Carlay Art — ${description}`,
        redirectUrl: `${siteUrl}/panier.html?status=success`,
        cancelUrl: `${siteUrl}/panier.html?status=cancelled`,
        webhookUrl: `${siteUrl}/api/webhook-mollie`,
        method: ['ideal', 'creditcard', 'bancontact', 'applepay', 'eps', 'giropay'],
      }),
    });

    const payment = await response.json();

    if (payment._links && payment._links.checkout) {
      res.status(200).json({ url: payment._links.checkout.href });
    } else {
      console.error('Mollie error:', payment);
      res.status(500).json({ error: 'Payment creation failed' });
    }
  } catch (error) {
    if (error instanceof OrderError) return res.status(error.status).json({ error: error.message });
    console.error('Mollie error:', error.message);
    res.status(500).json({ error: 'Payment session creation failed' });
  }
};
