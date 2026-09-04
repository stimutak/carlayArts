const Stripe = require('stripe');
const { resolveOrder, OrderError } = require('./_order');

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    // Prices, names and images come from the server catalog — never from the
    // request body, which a buyer can edit.
    const order = resolveOrder(req.body);
    const siteUrl = process.env.SITE_URL || 'https://carlay-art.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: order.items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name,
            description: item.description || 'Acrylique sur toile · Certificat d\'authenticité inclus',
            images: item.image ? [`${siteUrl}/${item.image}`] : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty,
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
        order_items: JSON.stringify(order.items.map(i => `${i.name} x${i.qty}`)),
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    if (error instanceof OrderError) return res.status(error.status).json({ error: error.message });
    console.error('Stripe error:', error.message);
    res.status(500).json({ error: 'Payment session creation failed' });
  }
};
