import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const dist = join(process.cwd(), 'dist');
const contentDir = join(process.cwd(), 'src/content/artworks');
const slugs = readdirSync(contentDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.replace(/\.json$/, ''));

const htmlFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });

const allFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? allFiles(path) : [path];
  });

const outputForPath = (pathname) => {
  const clean = pathname.replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '');
  if (!clean) return join(dist, 'index.html');
  return join(dist, clean, 'index.html');
};

describe('static route foundation', () => {
  it('builds all required route types and every artwork route', () => {
    const required = ['/', '/boutique', '/a-propos', '/contact', '/client-a-fournir', '/panier', '/commande', '/confirmation'];
    for (const route of required) expect(existsSync(outputForPath(route)), route).toBe(true);
    expect(existsSync(join(dist, '404.html'))).toBe(true);
    for (const slug of slugs) expect(existsSync(outputForPath(`/oeuvre/${slug}`)), slug).toBe(true);
  });

  it('resolves local links and assets emitted by every HTML page', () => {
    for (const file of htmlFiles(dist)) {
      const html = readFileSync(file, 'utf8');
      const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
      for (const ref of refs) {
        if (/^(?:https?:|mailto:|tel:|data:|#)/.test(ref)) continue;
        const clean = ref.replace(/[?#].*$/, '');
        if (!clean) continue;
        const target = clean.startsWith('/')
          ? clean.includes('.')
            ? join(dist, clean.replace(/^\/+/, ''))
            : outputForPath(clean)
          : join(dirname(file), clean);
        expect(existsSync(target), `${relative(dist, file)} -> ${ref}`).toBe(true);
      }
    }
  });

  it('shares navigation, footer, draft guard, and honest artwork state', () => {
    for (const file of htmlFiles(dist)) {
      const html = readFileSync(file, 'utf8');
      expect(html).toContain('aria-label="Navigation principale"');
      expect(html).toContain('© 2026 Carlay Art');
      expect(html).toContain('content="noindex, nofollow"');
    }

    const artwork = readFileSync(outputForPath('/oeuvre/vortex-5'), 'utf8');
    expect(artwork).toContain('Hors vente — validation requise');
    expect(artwork).not.toMatch(/Ajouter au panier|Acheter maintenant/);
  });

  it('keeps image assets within budget and emits explicit dimensions', () => {
    for (const file of allFiles(dist).filter((path) => /\.(?:avif|jpe?g|png|webp)$/i.test(path))) {
      expect(statSync(file).size, relative(dist, file)).toBeLessThanOrEqual(300 * 1024);
    }
    for (const file of htmlFiles(dist)) {
      const html = readFileSync(file, 'utf8');
      for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
        expect(tag, `${relative(dist, file)} image width`).toMatch(/\bwidth="\d+"/);
        expect(tag, `${relative(dist, file)} image height`).toMatch(/\bheight="\d+"/);
      }
    }
  });

  it('emits one canonical, description, and unique title per page', () => {
    const titles = new Set();
    for (const file of htmlFiles(dist)) {
      const html = readFileSync(file, 'utf8');
      expect(html.match(/rel="canonical"/g), relative(dist, file)).toHaveLength(1);
      expect(html).toMatch(/<meta name="description" content="[^"]+"/);
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
      expect(title, relative(dist, file)).toBeTruthy();
      expect(titles.has(title), `duplicate title: ${title}`).toBe(false);
      titles.add(title);
    }
  });

  it('generates a public-content sitemap without operational draft routes', () => {
    expect(existsSync(join(dist, 'sitemap-index.xml'))).toBe(true);
    const sitemap = readFileSync(join(dist, 'sitemap-0.xml'), 'utf8');
    expect(sitemap).toContain('https://carlay-art.com/boutique/');
    expect(sitemap).toContain('https://carlay-art.com/oeuvre/vortex-5/');
    expect(sitemap).not.toMatch(/client-a-fournir|panier|commande|confirmation/);
  });
});
