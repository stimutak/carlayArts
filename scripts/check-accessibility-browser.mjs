import { spawn } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4324';
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const preview = spawn('./node_modules/.bin/astro', ['preview', '--host', '127.0.0.1', '--port', '4324'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
let previewOutput = '';
preview.stdout.on('data', (chunk) => (previewOutput += chunk));
preview.stderr.on('data', (chunk) => (previewOutput += chunk));

const waitForServer = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // Astro preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Astro preview did not become ready.\n${previewOutput}`);
};

const criteriaFor = (result) => result.tags.filter((tag) => /^wcag\d{3,4}$/.test(tag));
const describeResult = (result) => {
  const criteria = criteriaFor(result);
  return `${result.id}${criteria.length ? ` [${criteria.join(', ')}]` : ''}: ${result.help}`;
};

const reports = [];
const criterionEvidence = [];
const verify = (condition, criterion, evidence) => {
  if (!condition) throw new Error(`${criterion} automated check failed: ${evidence}`);
  criterionEvidence.push({ criterion, evidence });
};

const hasHorizontalOverflow = (page) => page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
);

const focusIsUnobscured = (locator) => locator.evaluate((element) => {
  element.focus();
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.top >= window.innerHeight) return false;
  const x = Math.min(window.innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
  const y = Math.min(window.innerHeight - 1, Math.max(0, rect.top + Math.min(rect.height / 2, 12)));
  return document.elementsFromPoint(x, y).some((candidate) => candidate === element || element.contains(candidate));
});

const scan = async (page, state) => {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  reports.push({ state, url: page.url(), results });
  const reviewed = results.passes.length + results.incomplete.length + results.inapplicable.length + results.violations.length;
  console.log(
    `${state}: ${reviewed} WCAG A/AA rules evaluated; ` +
      `${results.passes.length} passed, ${results.violations.length} violated, ` +
      `${results.incomplete.length} need manual review, ${results.inapplicable.length} not applicable.`,
  );
};

const goto = async (page, path) => {
  const response = await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
  if (!response?.ok()) throw new Error(`${path} returned ${response?.status() ?? 'no response'}`);
  await page.locator('html[data-cart-ready="true"]').waitFor();
};

const blockExternalFonts = (context) =>
  context.route(/https:\/\/(?:api|cdn)\.fontshare\.com\//, (route) => route.abort());

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  const routes = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await blockExternalFonts(routes);
  const page = await routes.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  for (const [path, label] of [
    ['/', 'route: accueil'],
    ['/boutique/', 'route: boutique'],
    ['/a-propos/', 'route: artiste'],
    ['/contact/', 'route: contact'],
    ['/panier/', 'route: panier vide'],
    ['/commande/', 'route: commande vide'],
    ['/confirmation/', 'route: confirmation sans session'],
    ['/oeuvre/vortex-5/', 'route: œuvre représentative'],
  ]) {
    await goto(page, path);
    await scan(page, label);
  }

  await goto(page, '/boutique/');
  await page.locator('[data-filter-series="vortex"]').click();
  await scan(page, 'état: filtre série actif');
  await page.locator('[data-filter-availability]').click();
  await page.locator('[data-catalog-empty]').waitFor({ state: 'visible' });
  await scan(page, 'état: filtres sans résultat');

  await goto(page, '/');
  await page.locator('[data-cart-open]').first().click();
  await scan(page, 'état: tiroir panier vide');
  await page.keyboard.press('Escape');
  await routes.close();

  const mobile = await browser.newContext({ viewport: { width: 320, height: 800 } });
  await blockExternalFonts(mobile);
  const mobilePage = await mobile.newPage();
  mobilePage.on('pageerror', (error) => pageErrors.push(error.message));
  for (const path of ['/', '/boutique/', '/a-propos/', '/contact/', '/panier/', '/commande/', '/confirmation/', '/oeuvre/vortex-5/']) {
    await goto(mobilePage, path);
    verify(!(await hasHorizontalOverflow(mobilePage)), '1.4.10', `${path} reflows without document overflow at 320 CSS px`);
  }

  await goto(mobilePage, '/boutique/');
  await mobilePage.addStyleTag({ content: `
    body * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
    p { margin-bottom: 2em !important; }
  ` });
  verify(!(await hasHorizontalOverflow(mobilePage)), '1.4.12', 'boutique retains horizontal reflow with the WCAG text-spacing override');

  await goto(mobilePage, '/');
  await mobilePage.locator('#site-menu-toggle').click();
  verify(await mobilePage.locator('main').evaluate((node) => node.inert), '4.1.2', 'mobile dialog inerts main content');
  verify(await mobilePage.locator('.nav').evaluate((node) => node.inert), '2.1.2', 'mobile dialog removes its background trigger from keyboard navigation');
  verify(await mobilePage.locator('.footer').evaluate((node) => node.inert), '4.1.2', 'mobile dialog inerts footer content');
  await scan(mobilePage, 'état: menu mobile ouvert');
  await mobilePage.keyboard.press('Escape');
  verify(!(await mobilePage.locator('main').evaluate((node) => node.inert)), '4.1.2', 'mobile dialog restores main content');
  verify(await mobilePage.locator('#site-menu-toggle').evaluate((node) => node === document.activeElement), '2.4.3', 'mobile dialog restores focus to its trigger');
  verify(await focusIsUnobscured(mobilePage.locator('#site-menu-toggle')), '2.4.11', 'restored menu-trigger focus is not entirely obscured');
  await mobile.close();

  const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await blockExternalFonts(reduced);
  const reducedPage = await reduced.newPage();
  await goto(reducedPage, '/');
  const reducedStyles = await reducedPage.locator('.reveal').first().evaluate((element) => ({
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    transform: getComputedStyle(element).transform,
    transitionDurationSeconds: parseFloat(getComputedStyle(element).transitionDuration),
  }));
  verify(
    reducedStyles.scrollBehavior === 'auto' && reducedStyles.transform === 'none' && reducedStyles.transitionDurationSeconds <= 0.00001,
    'motion-preference',
    'prefers-reduced-motion removes smooth scrolling, reveal movement, and meaningful transition duration',
  );
  await reduced.close();

  const forced = await browser.newContext({ viewport: { width: 390, height: 844 }, forcedColors: 'active' });
  await blockExternalFonts(forced);
  const forcedPage = await forced.newPage();
  await goto(forcedPage, '/');
  const forcedFocus = await forcedPage.locator('#site-menu-toggle').evaluate((element) => {
    element.focus();
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth) };
  });
  verify(forcedFocus.outlineStyle !== 'none' && forcedFocus.outlineWidth >= 2, 'forced-colors', 'keyboard focus remains visibly outlined in forced-colors mode');
  await forced.close();

  const journey = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await blockExternalFonts(journey);
  const demo = await journey.newPage();
  demo.on('pageerror', (error) => pageErrors.push(error.message));
  await goto(demo, '/boutique/');
  await demo.waitForFunction(() => document.querySelector('[data-filter-shell]')?.classList.contains('is-enhanced'));
  await demo.locator('[data-filter-availability]').click();
  await demo.locator('[data-result-count]').filter({ hasText: '1 œuvre affichée' }).waitFor();
  await demo.locator('a[href="/oeuvre/accessibility-test-fixture/"]').waitFor({ state: 'visible' });
  await scan(demo, 'état: filtre disponible avec résultat');
  await demo.locator('a[href="/oeuvre/accessibility-test-fixture/"]').click();
  await scan(demo, 'route: détail éligible synthétique');
  await demo.locator('[data-lightbox-open]').click();
  verify(await demo.locator('.nav').evaluate((node) => node.inert), '4.1.2', 'verified-media dialog inerts background navigation');
  await scan(demo, 'état: visionneuse vérifiée ouverte');
  await demo.locator('[data-lightbox-close]').click();
  await demo.waitForFunction(() => document.activeElement?.hasAttribute('data-lightbox-open'));
  await demo.locator('[data-cart-add="synthetic-accessibility-fixture"]').click();
  verify(await demo.locator('main').evaluate((node) => node.inert), '4.1.2', 'populated cart dialog inerts main content');
  await scan(demo, 'état: tiroir panier rempli');
  await demo.locator('[data-cart-close]').click();
  await goto(demo, '/commande/');
  await scan(demo, 'état: commande prête');

  await demo.locator('[data-checkout-submit]').click();
  await demo.locator('[data-error-summary]').waitFor({ state: 'visible' });
  await scan(demo, 'état: erreurs de validation commande');
  await demo.locator('[data-error-list] a').first().click();
  verify(await demo.locator('#prenom').evaluate((node) => node === document.activeElement), '3.3.1', 'error-summary link moves focus to the invalid field');
  verify(await focusIsUnobscured(demo.locator('#prenom')), '2.4.11', 'invalid-field focus is not entirely obscured by sticky content');

  await demo.fill('#prenom', 'Ada');
  await demo.fill('#nom', 'Lovelace');
  await demo.fill('#email', 'ada@example.com');
  await demo.fill('#adresse', '1 rue de test');
  await demo.fill('#cp', '75001');
  await demo.fill('#ville', 'Paris');
  await demo.selectOption('#pays', 'FR');
  await demo.check('[data-demo-ack]');
  await demo.locator('.failure-control summary').click();
  await demo.check('input[name="simulate_failure"]');
  await demo.locator('[data-checkout-submit]').click();
  await demo.locator('[data-error-summary]').waitFor({ state: 'visible' });
  await scan(demo, 'état: échec simulé et récupération');

  await demo.uncheck('input[name="simulate_failure"]');
  await demo.locator('[data-checkout-submit]').click();
  await demo.waitForURL('**/confirmation/');
  await scan(demo, 'état: confirmation démo');
  await journey.close();

  if (pageErrors.length) throw new Error(`Browser page errors:\n${pageErrors.join('\n')}`);

  const violations = reports.flatMap(({ state, url, results }) =>
    results.violations.map((result) => ({ state, url, result })),
  );
  if (violations.length) {
    const details = violations.map(({ state, url, result }) => {
      const nodes = result.nodes.map((node) => `    ${node.target.join(' ')} — ${node.failureSummary}`).join('\n');
      return `  ${state} (${url})\n  ${describeResult(result)}\n${nodes}`;
    });
    throw new Error(`Confirmed axe WCAG A/AA violations:\n${details.join('\n\n')}`);
  }

  const rules = new Set(
    reports.flatMap(({ results }) =>
      [...results.passes, ...results.incomplete, ...results.inapplicable, ...results.violations].map(({ id }) => id),
    ),
  );
  const incomplete = new Set(reports.flatMap(({ results }) => results.incomplete.map(describeResult)));
  console.log(`Accessibility browser checks passed across ${reports.length} representative route/state scans and ${rules.size} distinct automated WCAG A/AA rules.`);
  const criterionSummary = [...new Set(criterionEvidence.map(({ criterion }) => criterion))].join(', ');
  console.log(`Additional criterion-oriented assertions passed (${criterionEvidence.length} checks): ${criterionSummary}.`);
  if (incomplete.size) {
    console.log(`Manual-review findings retained (${incomplete.size} unique): ${[...incomplete].join('; ')}`);
    for (const { state, results } of reports) {
      for (const result of results.incomplete) {
        const examples = result.nodes.slice(0, 3).map((node) => node.target.join(' ')).join(', ');
        console.log(`  ${state}: ${describeResult(result)} — ${result.nodes.length} target(s); examples: ${examples}`);
      }
    }
  }
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
