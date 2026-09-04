/**
 * Reads the unparsed request body.
 *
 * Signature verification must run against the exact bytes the provider signed,
 * so a re-serialised JSON object is not good enough — key order and whitespace
 * would differ and every signature would fail. Vercel may hand us an already
 * parsed body, so fall back to re-serialising only when the stream is gone,
 * and say so, rather than silently verifying the wrong thing.
 */
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    if (typeof req.body === 'string') return resolve({ raw: req.body, exact: true });
    if (Buffer.isBuffer(req.body)) return resolve({ raw: req.body.toString('utf8'), exact: true });

    if (req.readable === false || req.readableEnded) {
      if (req.body && typeof req.body === 'object') {
        return resolve({ raw: JSON.stringify(req.body), exact: false });
      }
      return resolve({ raw: '', exact: false });
    }

    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('error', reject);
    req.on('end', () => resolve({ raw: Buffer.concat(chunks).toString('utf8'), exact: true }));
  });
}

module.exports = { readRawBody };
