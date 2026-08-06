import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
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

  it('gates dimming behind completed enhancement and never starts fully invisible', () => {
    expect(css).toContain('html.js.js-ready .reveal');
    expect(css).toMatch(/html\.js\.js-ready \.reveal \{[\s\S]*?opacity: 1/);
    expect(css).not.toMatch(/transition:\s*opacity/);
    expect(css).not.toMatch(/opacity:\s*0\s*;/);
    expect(layout).toContain("document.documentElement.classList.add('js')");
    expect(layout).toContain("document.documentElement.classList.add('js-ready')");
  });

  it('makes reveals immediate under reduced motion', () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*?html\.js\.js-ready \.reveal \{[\s\S]*?opacity: 1/);
  });
});

describe('implementation authority', () => {
  it('quarantines plans that contain obsolete authority or verbatim-copy directives', () => {
    const planDirectory = 'docs/superpowers/plans';
    const obsoleteDirectives = [
      'boutique.html`, which is the inventory source of truth',
      'pixel reference',
      'contents copied verbatim',
    ];

    for (const file of readdirSync(planDirectory).filter((name) => name.endsWith('.md'))) {
      const source = readFileSync(`${planDirectory}/${file}`, 'utf8');
      if (!obsoleteDirectives.some((directive) => source.includes(directive))) continue;
      expect(source, `${file} contains obsolete directives without a superseded warning`).toMatch(
        /^# SUPERSEDED — DO NOT EXECUTE/m,
      );
    }
  });

  it('defines Gate D by WCAG conformance rather than scanner severity', () => {
    const specification = readFileSync(
      'docs/superpowers/specs/2026-08-05-noir-gallery-v2-design.md',
      'utf8',
    );
    expect(specification).toContain('zero confirmed applicable WCAG 2.2 A or AA failures');
    expect(specification).toContain('scanner results supplement rather than replace criterion-level review');
  });
});
