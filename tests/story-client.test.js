import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import inventoryReview from '../docs/artwork-inventory-review.json';

const read = (path) => readFileSync(path, 'utf8');

describe('artist and contact draft-content contract', () => {
  const artist = read('src/pages/a-propos.astro');
  const contact = read('src/pages/contact.astro');

  it('keeps unknown artist facts explicitly provisional', () => {
    expect(artist).toContain('Contenu éditorial en attente');
    expect(artist).toContain('Citation de l’artiste — texte exact à fournir.');
    expect(artist).toContain('À confirmer');
    expect(artist).not.toContain('22 collections');
    expect(artist).not.toContain('Acrylique sur toile');
    expect(artist).not.toContain('Paris · New York');
    expect(artist).not.toContain('livraison mondiale');
    expect(artist).not.toContain('paiement sécurisé');
  });

  it('publishes the repository contact email but no placeholder social destination', () => {
    expect(contact).toContain('mailto:carlayart369@gmail.com');
    expect(contact).toContain('Profil social officiel');
    expect(contact).toContain('À fournir');
    expect(contact).not.toMatch(/href=["']https?:\/\/[^"']*(instagram|facebook|tiktok)/i);
    expect(contact).toContain('href="/client-a-fournir"');
  });
});

describe('client handoff route', () => {
  const component = read('src/components/ClientNeeds.astro');
  const page = read('src/pages/client-a-fournir.astro');

  it('reads the generated inventory review as its source of truth', () => {
    expect(component).toContain("../../docs/artwork-inventory-review.json");
    expect(page).toContain('<ClientNeeds />');
    expect(inventoryReview.works).toHaveLength(60);
    expect(inventoryReview.works.filter((work) => work.availability === 'sold')).toHaveLength(39);
    expect(inventoryReview.works.filter((work) => work.availability === 'not-for-sale')).toHaveLength(21);
  });

  it('covers every missing-fact category in the report and explains placement', () => {
    const missingKeys = new Set(inventoryReview.works.flatMap((work) => work.missingFacts));
    for (const key of missingKeys) expect(component).toContain(`${key}: {`);
    expect(component).toContain('Où cela ira');
    expect(component).toContain('Destination :');
    expect(component).toContain('Blocages d’activation finale');
  });

  it('surfaces each duplicate-media association without adding client-sensitive fields', () => {
    expect(component).toContain('inventoryReview.duplicateCardImages.map');
    expect(component).not.toMatch(/phone|telephone|adresse personnelle|mot de passe|password/i);
  });

  it('provides parseable, non-secret intake templates', () => {
    for (const name of ['artist', 'site', 'policies', 'artwork']) {
      const source = read(`client-input/${name}.template.json`);
      expect(() => JSON.parse(source)).not.toThrow();
      expect(source).not.toMatch(/password|secret|token|cardNumber|cvv|oneTimeCode/i);
    }
    expect(read('client-input/README.md')).toContain('/client-a-fournir');
  });
});

describe('draft discovery and recovery routes', () => {
  it('keeps every crawler out of the draft site', () => {
    expect(read('public/robots.txt')).toMatch(/^User-agent: \*\nDisallow: \/\n/m);
  });

  it('links the 404 only to routes that exist in the source tree', () => {
    const page = read('src/pages/404.astro');
    const links = [...page.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
    expect(links).toEqual(['/', '/boutique', '/contact']);

    for (const href of links.filter((href) => href !== '/')) {
      expect(existsSync(`src/pages${href}.astro`)).toBe(true);
    }
    expect(existsSync('src/pages/index.astro')).toBe(true);
  });
});
