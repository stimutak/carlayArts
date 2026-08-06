import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const read = (path) => readFileSync(join(process.cwd(), path), 'utf8');
const records = readdirSync(join(process.cwd(), 'src/content/artworks'))
  .filter((file) => file.endsWith('.json'))
  .map((file) => JSON.parse(read(`src/content/artworks/${file}`)));

describe('gallery catalog contract', () => {
  it('renders the complete authoritative catalog through unique artwork routes', () => {
    const card = read('src/components/ArtworkCard.astro');
    const boutique = read('src/pages/boutique.astro');

    expect(records).toHaveLength(60);
    expect(new Set(records.map((artwork) => artwork.seriesSlug))).toHaveLength(14);
    expect(card).toContain('href={`/oeuvre/${artwork.slug}/`}');
    expect(card).toContain('data-artwork-card');
    expect(card).toContain('Recadrage catalogue');
    expect(boutique).toContain('group.artworks.map((artwork) => <ArtworkCard artwork={artwork} />)');
  });

  it('keeps availability filters URL-backed and fail-closed', () => {
    const filter = read('src/components/FilterBar.astro');

    expect(records.some((artwork) => artwork.availability === 'available')).toBe(false);
    expect(filter).toContain('data-filter-available');
    expect(filter).toContain("params.get('serie')");
    expect(filter).toContain("params.get('disponibilite') === 'available'");
    expect(filter).toContain('window.history.pushState');
    expect(filter).toContain("window.addEventListener('popstate', render)");
    expect(filter).toContain('aria-live="polite"');
  });
});

describe('faithful artwork media and commerce boundaries', () => {
  it('labels legacy crops and never presents them as full-work zoom media', () => {
    const media = read('src/components/ArtworkMedia.astro');
    const detail = read('src/pages/oeuvre/[slug].astro');

    expect(media).toContain("label: 'Aperçu catalogue recadré'");
    expect(media).toContain('L’image intégrale fidèle reste à fournir');
    expect(media).toContain('Aucun zoom de détail n’est annoncé');
    expect(detail).toContain('<ArtworkMedia artwork={artwork} />');
  });

  it('provides an accessible modal interaction with escape, trapping, and focus return', () => {
    const lightbox = read('src/components/Lightbox.astro');

    expect(lightbox).toContain('<dialog');
    expect(lightbox).toContain("event.key === 'Escape'");
    expect(lightbox).toContain("event.key !== 'Tab'");
    expect(lightbox).toContain('returnTarget.focus()');
    expect(lightbox).toContain('data-lightbox-previous');
    expect(lightbox).toContain('data-lightbox-next');
  });

  it('exposes no purchase action while owner-approved availability is empty', () => {
    const detail = read('src/pages/oeuvre/[slug].astro');
    const home = read('src/pages/index.astro');

    expect(detail).not.toMatch(/Ajouter au panier|Acheter maintenant/);
    expect(home).not.toMatch(/Ajouter au panier|Acheter maintenant/);
    expect(detail).toContain('Aucune action d’achat n’est proposée');
  });
});
