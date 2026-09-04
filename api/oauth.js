const crypto = require('node:crypto');

/**
 * Step 1 of GitHub login for the studio.
 *
 * The CMS runs entirely in the browser, and GitHub will not issue a token to a
 * browser because that would mean shipping the client secret to every visitor.
 * These two functions are the smallest possible server that holds the secret.
 *
 * The state parameter is random per attempt and echoed back by GitHub, so a
 * response from a login nobody started here is rejected.
 */
module.exports = async function handler(req, res) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'GitHub OAuth not configured' });

  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;
  const state = crypto.randomBytes(16).toString('hex');

  res.setHeader(
    'Set-Cookie',
    `carlay_oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', `${siteUrl}/api/oauth-callback`);
  authorize.searchParams.set('scope', 'repo,user');
  authorize.searchParams.set('state', state);

  res.writeHead(302, { Location: authorize.toString() });
  res.end();
};
