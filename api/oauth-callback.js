const crypto = require('node:crypto');

/**
 * Step 2 of GitHub login for the studio.
 *
 * Exchanges the code for a token server-side, then hands it to the CMS window
 * via postMessage — the handshake Sveltia and Decap both expect.
 */
const readCookie = (header, name) => {
  const match = String(header || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
};

const page = (payload, origin) => `<!doctype html>
<html><head><meta charset="utf-8"><title>Connexion…</title></head>
<body><p>Connexion en cours…</p><script>
  (function () {
    var payload = ${JSON.stringify(payload)};
    function send(event) { window.opener && window.opener.postMessage(event, ${JSON.stringify(origin)}); }
    window.addEventListener('message', function () { send('authorization:github:' + payload.status + ':' + JSON.stringify(payload.body)); }, { once: true });
    send('authorizing:github');
  })();
</script></body></html>`;

module.exports = async function handler(req, res) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return res.status(500).json({ error: 'GitHub OAuth not configured' });

  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readCookie(req.headers.cookie, 'carlay_oauth_state');

  // Reject a callback for a login that did not start here.
  if (!code || !state || !expected) return res.status(400).send('Requête de connexion invalide.');
  const a = Buffer.from(state);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(400).send('Requête de connexion invalide.');
  }

  // Burn the state so the callback cannot be replayed.
  res.setHeader('Set-Cookie', 'carlay_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');

  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const data = await response.json();
    if (!data.access_token) {
      console.error('GitHub token exchange failed:', data.error || 'no token');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(page({ status: 'error', body: { message: 'Échec de la connexion.' } }, siteUrl));
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(page({ status: 'success', body: { token: data.access_token, provider: 'github' } }, siteUrl));
  } catch (error) {
    console.error('GitHub OAuth error:', error.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(page({ status: 'error', body: { message: 'Échec de la connexion.' } }, siteUrl));
  }
};
