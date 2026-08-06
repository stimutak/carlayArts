import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const records = readdirSync('src/content/artworks')
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(readFileSync(join('src/content/artworks', file), 'utf8')));

describe('Phase 3 production surfaces', () => {
  it('renders every candidate artwork as a uniquely routed boutique card', () => {
    const card = readFileSync('src/components/ArtworkCard.astro', 'utf8');
    const boutique = readFileSync('src/pages/boutique.astro', 'utf8');
    expect(records).toHaveLength(60);
    expect(new Set(records.map((record) => record.slug))).toHaveLength(60);
    expect(card).toContain('href={`/oeuvre/${artwork.slug}/`}');
    expect(boutique).toContain('group.works.map((artwork) => <ArtworkCard artwork={artwork} />)');
  });

  it('ships URL-restored series and availability filters with a live count', () => {
    const source = readFileSync('src/pages/boutique.astro', 'utf8');
    expect(source).toContain("params.get('serie')");
    expect(source).toContain("params.get('disponibilite') === 'disponibles'");
    expect(source).toContain("window.addEventListener('popstate'");
    expect(source).toContain('aria-live="polite"');
  });

  it('suppresses enlargement until full media is verified and keeps an accessible integration point', () => {
    const detail = readFileSync('src/pages/oeuvre/[slug].astro', 'utf8');
    const lightbox = readFileSync('src/components/Lightbox.astro', 'utf8');
    const css = readFileSync('src/styles/components.css', 'utf8');
    expect(records.every((record) => record.availability !== 'available')).toBe(true);
    expect(detail).not.toMatch(/Ajouter au panier|Acheter maintenant/);
    expect(detail).toContain('verifiedFull={verifiedFull}');
    expect(lightbox).toContain('{verifiedFull ? (');
    expect(lightbox).toContain('data-unverified-media');
    expect(lightbox).toContain('<dialog');
    expect(css).toMatch(/\.artwork-stage img \{[\s\S]*?object-fit: contain/);
  });

  it('inerts the full background and returns focus for a future verified-media dialog', () => {
    const lightbox = readFileSync('src/components/Lightbox.astro', 'utf8');
    expect(lightbox).toContain('sibling.inert = true');
    expect(lightbox).toContain('restoreBackground()');
    expect(lightbox).toContain('returnFocus.focus()');
  });

  it('uses only real related artwork routes', () => {
    const card = readFileSync('src/components/ArtworkCard.astro', 'utf8');
    const detail = readFileSync('src/pages/oeuvre/[slug].astro', 'utf8');
    expect(card).not.toMatch(/href="#"/);
    expect(detail).toContain('related.map((candidate) => <ArtworkCard artwork={candidate} />)');
  });

  it('keeps unverified biography, social, shipping, and certificate claims explicit', () => {
    const about = readFileSync('src/pages/a-propos.astro', 'utf8');
    const contact = readFileSync('src/pages/contact.astro', 'utf8');
    const home = readFileSync('src/pages/index.astro', 'utf8');
    expect(about).toContain('en attente de validation');
    expect(contact).toContain('Instagram · destination officielle en attente');
    expect(home).not.toMatch(/livraison mondiale|paiement sécurisé/i);
    expect(home).not.toMatch(/certificat d.authenticité inclus/i);
  });
});
