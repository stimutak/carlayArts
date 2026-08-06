import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { accentFor, formatPrice } from '../src/lib/series.js';
import { canonicalPath, pageTitle } from '../src/lib/metadata.js';

describe('series and metadata helpers', () => {
  it('maps approved series accents and uses a neutral fallback', () => {
    expect(accentFor('vortex')).toBe('#2DD4BF');
    expect(accentFor('romeo')).toBe('#87CEEB');
    expect(accentFor('insomnia')).toBe('#4ADE80');
    expect(accentFor('unknown')).toBe('rgba(255,255,255,0.16)');
  });

  it('formats catalog prices and canonical paths consistently', () => {
    expect(formatPrice(1000)).toBe('€1,000');
    expect(formatPrice(3000)).toBe('€3,000');
    expect(pageTitle('Œuvres')).toBe('Œuvres — CARLAY ART');
    expect(pageTitle('CARLAY ART')).toBe('CARLAY ART');
    expect(canonicalPath('/oeuvre/vortex-5')).toBe('/oeuvre/vortex-5/');
    expect(canonicalPath('/')).toBe('/');
  });
});

describe('fail-visible reveal contract', () => {
  const css = readFileSync('src/styles/base.css', 'utf8');
  const layout = readFileSync('src/layouts/Base.astro', 'utf8');

  it('gates dimming behind html.js and never starts fully invisible', () => {
    expect(css).toContain('html.js .reveal');
    expect(css).toMatch(/html\.js \.reveal \{[\s\S]*?opacity: 0\.35/);
    expect(css).not.toMatch(/opacity:\s*0\s*;/);
    expect(layout).toContain("document.documentElement.classList.add('js')");
  });

  it('makes reveals immediate under reduced motion', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*?html\.js \.reveal \{[\s\S]*?opacity: 1/);
  });
});
