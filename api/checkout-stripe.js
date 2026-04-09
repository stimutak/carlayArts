const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const { items } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const siteUrl = process.env.SITE_URL || 'https://carlay-art.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name,
            description: item.description || 'Acrylique sur toile \u00b7 Certificat d\'authenticit\u00e9 inclus',
            images: item.image ? [`${siteUrl}/${item.image}`] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty || 1,
      })),
      mode: 'payment',
      success_url: `${siteUrl}/panier.html?status=success`,
      cancel_url: `${siteUrl}/panier.html?status=cancelled`,
      shipping_address_collection: {
        allowed_countries: [
          'FR', 'US', 'DE', 'NL', 'BE', 'GB', 'IT', 'ES', 'CH', 'AT',
          'CA', 'AU', 'JP', 'SE', 'DK', 'NO', 'FI', 'PT', 'IE', 'LU'
        ],
      },
      metadata: {
        order_items: JSON.stringify(items.map(i => `${i.name} x${i.qty || 1}`)),
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: 'Payment session creation failed' });
  }
};
