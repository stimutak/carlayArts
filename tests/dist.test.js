import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

const outputForPath = (pathname) => {
  const clean = pathname.replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '');
  if (!clean) return join(dist, 'index.html');
  return join(dist, clean, 'index.html');
};

describe('static route foundation', () => {
  it('builds all required route types and every artwork route', () => {
    const required = ['/', '/boutique', '/a-propos', '/contact', '/panier', '/commande', '/confirmation'];
    for (const route of required) expect(existsSync(outputForPath(route)), route).toBe(true);
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
});
