import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { withAccessibilityFixture } from '../src/lib/accessibility-fixture.js';
import { isCommerceEligible } from '../src/lib/inventory.js';

describe('test-only accessibility fixture safety', () => {
  it('is absent unless the explicit test-build environment is set', () => {
    const marker = { id: 'real-record' };
    expect(process.env.CARLAY_ACCESSIBILITY_FIXTURE).not.toBe('1');
    expect(withAccessibilityFixture([marker])).toEqual([marker]);
  });

  it('leaves every authoritative artwork commerce-ineligible', () => {
    const records = Object.keys(import.meta.glob('../src/content/artworks/*.json', { eager: true, import: 'default' }));
    expect(records).toHaveLength(60);
    const artworks = Object.values(import.meta.glob('../src/content/artworks/*.json', { eager: true, import: 'default' }));
    expect(artworks.filter(isCommerceEligible)).toEqual([]);
  });

  it('has no runtime query-parameter activation path', () => {
    const source = readFileSync('src/lib/accessibility-fixture.js', 'utf8');
    expect(source).toContain("process.env.CARLAY_ACCESSIBILITY_FIXTURE === '1'");
    expect(source).not.toMatch(/URLSearchParams|Astro\.url|searchParams|location\./);
  });
});
