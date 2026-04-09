module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.COINBASE_COMMERCE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Coinbase Commerce not configured' });
  }

  try {
    const { items, total } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const siteUrl = process.env.SITE_URL || 'https://carlay-art.com';
    const orderTotal = total || items.reduce((sum, i) => sum + (i.price * (i.qty || 1)), 0);
    const description = items.map(i => `${i.name} x${i.qty || 1}`).join(', ');

    const response = await fetch('https://api.commerce.coinbase.com/charges', {
      method: 'POST',
      headers: {
        'X-CC-Api-Key': apiKey,
        'X-CC-Version': '2018-03-22',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `Carlay Art \u2014 ${description}`,
        description: 'Peinture acrylique originale sur toile',
        pricing_type: 'fixed_price',
        local_price: {
          amount: orderTotal.toFixed(2),
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
    console.error('Coinbase error:', error.message);
    res.status(500).json({ error: 'Payment session creation failed' });
  }
};
