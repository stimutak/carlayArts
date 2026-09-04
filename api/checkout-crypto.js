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

    const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Coinbase Commerce not configured' });
    const siteUrl = process.env.SITE_URL || 'https://carlay-art.com';
    const description = order.items.map(i => `${i.name} x${i.qty}`).join(', ');

    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'X-CC-Api-Key': apiKey,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Carlay Art — ${description}`,
        description: 'Peinture acrylique originale sur toile',
        pricing_type: 'fixed_price',
        local_price: {
          amount: order.total.toFixed(2),
          currency: 'EUR',
        },
        redirect_url: `${siteUrl}/panier.html?status=success`,
        cancel_url: `${siteUrl}/panier.html?status=cancelled`,
      }),
    });

    const charge = await response.json();

    if (charge.data && charge.data.hosted_url) {
      res.status(200).json({ url: charge.data.hosted_url });
    } else {
      console.error('Coinbase error:', charge);
      res.status(500).json({ error: 'Charge creation failed' });
    }
  } catch (error) {
    if (error instanceof OrderError) return res.status(error.status).json({ error: error.message });
    console.error('Coinbase error:', error.message);
    res.status(500).json({ error: 'Payment session creation failed' });
  }
};
