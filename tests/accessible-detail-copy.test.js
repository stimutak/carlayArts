import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('eligible artwork detail copy', () => {
  const detail = readFileSync('src/pages/oeuvre/[slug].astro', 'utf8');

  it('shows unverified-media wording only when the full image is not verified', () => {
    expect(detail).toMatch(/\{verifiedFull \? \([\s\S]*?Médias vérifiés\.[\s\S]*?\) : \([\s\S]*?Média non homologué\./);
  });

  it('does not retain pre-Phase-4 integration wording for eligible works', () => {
    expect(detail).not.toContain('L’intégration panier relève de la phase commerce');
    expect(detail).toContain('Cette œuvre peut suivre le parcours panier et commande de démonstration.');
  });
});
