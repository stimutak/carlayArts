import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const origin = 'https://carlay-art.com';
const failures = [];

const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = join(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [path];
});

const files = walk(dist);
// The studio at /studio/ is a standalone CMS shell, not a page of the site.
// It carries no canonical, description or Open Graph metadata on purpose: it
// is noindex and sits behind GitHub login, so the SEO and structure checks
// below would be asserting things that should not be true of it.
const isSitePage = (file) => !relative(dist, file).split(sep).includes('studio');
const htmlFiles = files.filter((file) => file.endsWith('.html') && isSitePage(file));
const routeFor = (file) => {
  const name = relative(dist, file).replaceAll('\\', '/');
  if (name === 'index.html') return '/';
  return `/${name.replace(/index\.html$/, '')}`;
};
const outputFor = (pathname) => {
  const clean = pathname.replace(/^\/+/, '');
  if (!clean) return join(dist, 'index.html');
  if (extname(clean)) return join(dist, clean);
  return join(dist, clean, 'index.html');
};
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};
const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

const idsByRoute = new Map();
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  idsByRoute.set(routeFor(file), new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])));
}

const canonicalOwners = new Map();
const titleOwners = new Map();
let linkCount = 0;
let imageCount = 0;
let maxHtml = { bytes: 0, route: '' };

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const route = routeFor(file);
  const bytes = Buffer.byteLength(html);
  if (bytes > maxHtml.bytes) maxHtml = { bytes, route };

  const titles = [...html.matchAll(/<title>([^<]+)<\/title>/g)].map((match) => match[1]);
  const descriptions = [...html.matchAll(/<meta name="description" content="([^"]+)">/g)];
  const robots = [...html.matchAll(/<meta name="robots" content="([^"]+)">/g)];
  const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map((match) => match[1]);
  const ogTitles = [...html.matchAll(/<meta property="og:title" content="([^"]+)">/g)];
  const ogDescriptions = [...html.matchAll(/<meta property="og:description" content="([^"]+)">/g)];
  const ogUrls = [...html.matchAll(/<meta property="og:url" content="([^"]+)">/g)].map((match) => match[1]);
  const h1s = [...html.matchAll(/<h1\b/g)];

  assert(titles.length === 1 && titles[0].trim(), `${route}: expected one non-empty title.`);
  assert(descriptions.length === 1, `${route}: expected one meta description.`);
  assert(robots.length === 1 && robots[0][1] === 'noindex, nofollow', `${route}: review noindex guard changed.`);
  assert(canonicals.length === 1, `${route}: expected one canonical URL.`);
  assert(ogTitles.length === 1 && ogDescriptions.length === 1 && ogUrls.length === 1, `${route}: Open Graph metadata is incomplete.`);
  assert(h1s.length === 1, `${route}: expected exactly one h1, found ${h1s.length}.`);
  assert(!html.includes('application/ld+json'), `${route}: unreviewed structured data was emitted.`);
  assert(!/https?:\/\/api\.fontshare\.com|https?:\/\/cdn\.fontshare\.com/.test(html), `${route}: render depends on Fontshare.`);
  assert(!/<a class="artwork-card__link"[^>]*aria-label=/.test(html), `${route}: artwork card overrides its visible accessible name.`);

  if (titles.length === 1) {
    const owner = titleOwners.get(titles[0]);
    assert(!owner, `${route}: title duplicates ${owner}.`);
    titleOwners.set(titles[0], route);
    assert(ogTitles[0]?.[1] === titles[0], `${route}: og:title differs from the document title.`);
  }
  if (descriptions.length === 1) {
    assert(ogDescriptions[0]?.[1] === descriptions[0][1], `${route}: og:description differs from the meta description.`);
  }

  if (canonicals.length === 1) {
    const expectedCanonical = `${origin}${route}`;
    assert(canonicals[0] === expectedCanonical, `${route}: canonical is ${canonicals[0]}, expected ${expectedCanonical}.`);
    assert(ogUrls[0] === canonicals[0], `${route}: og:url differs from canonical.`);
    const owner = canonicalOwners.get(canonicals[0]);
    assert(!owner, `${route}: canonical duplicates ${owner}.`);
    canonicalOwners.set(canonicals[0], route);
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert(new Set(ids).size === ids.length, `${route}: duplicate HTML id detected.`);

  const anchors = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>/g)].map((match) => match[1]);
  for (const href of anchors) {
    linkCount += 1;
    if (/^(?:mailto:|tel:|data:|javascript:)/.test(href)) continue;
    const url = new URL(href, `${origin}${route}`);
    if (url.origin !== origin) continue;
    const extension = extname(url.pathname);
    assert(url.pathname === '/' || extension || url.pathname.endsWith('/'), `${route}: internal link is not canonical: ${href}`);
    assert(existsSync(outputFor(url.pathname)), `${route}: unresolved internal link ${href}.`);
    if (url.hash) {
      const targetRoute = extension ? null : url.pathname;
      const targetIds = targetRoute ? idsByRoute.get(targetRoute) : null;
      assert(targetIds?.has(decodeURIComponent(url.hash.slice(1))), `${route}: unresolved fragment ${href}.`);
    }
  }

  const localRefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const ref of localRefs) {
    if (/^(?:mailto:|tel:|data:|javascript:|#)/.test(ref)) continue;
    const url = new URL(ref, `${origin}${route}`);
    if (url.origin !== origin) continue;
    assert(existsSync(outputFor(url.pathname)), `${route}: unresolved local reference ${ref}.`);
  }

  const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
  imageCount += images.length;
  for (const tag of images) {
    const src = attribute(tag, 'src') ?? '(missing src)';
    const width = Number(attribute(tag, 'width'));
    const height = Number(attribute(tag, 'height'));
    assert(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0, `${route}: image lacks intrinsic dimensions: ${src}.`);
    assert(attribute(tag, 'alt') !== undefined, `${route}: image lacks alt text: ${src}.`);
    assert(attribute(tag, 'decoding') === 'async', `${route}: image lacks async decoding: ${src}.`);
  }

  if (route.startsWith('/oeuvre/')) {
    assert(!/Traçabilité du dossier|Source candidate|Conflits de source|original-site\//.test(html), `${route}: internal audit mechanics leaked into the customer page.`);
    assert((html.match(/class="review-note"/g) ?? []).length === 1, `${route}: expected one restrained validation disclosure.`);
  }
}

const jsFiles = files.filter((file) => file.endsWith('.js'));
const cssFiles = files.filter((file) => file.endsWith('.css'));
const largest = (list) => list.reduce((result, file) => {
  const bytes = statSync(file).size;
  return bytes > result.bytes ? { bytes, file } : result;
}, { bytes: 0, file: '' });
const largestJs = largest(jsFiles);
const largestCss = largest(cssFiles);
const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0);

assert(maxHtml.bytes <= 100 * 1024, `${maxHtml.route}: HTML budget exceeded (${maxHtml.bytes} bytes).`);
assert(largestJs.bytes <= 20 * 1024, `${relative(dist, largestJs.file)}: JavaScript budget exceeded (${largestJs.bytes} bytes).`);
assert(largestCss.bytes <= 60 * 1024, `${relative(dist, largestCss.file)}: CSS budget exceeded (${largestCss.bytes} bytes).`);
assert(totalBytes <= 16 * 1024 * 1024, `Static output budget exceeded (${totalBytes} bytes).`);

if (failures.length) {
  console.error(`Production audit failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Production audit passed: ${htmlFiles.length} HTML pages, ${linkCount} internal/link references, and ${imageCount} rendered images checked.`);
  console.log(`Review SEO: unique canonicals + Open Graph metadata on every page; all pages remain noindex, nofollow; no structured data emitted.`);
  console.log(`Budgets: max HTML ${(maxHtml.bytes / 1024).toFixed(1)} KiB (${maxHtml.route}), max JS ${(largestJs.bytes / 1024).toFixed(1)} KiB, max CSS ${(largestCss.bytes / 1024).toFixed(1)} KiB, total output ${(totalBytes / 1024 / 1024).toFixed(1)} MiB.`);
}
