import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4322';
const preview = spawn('./node_modules/.bin/astro', ['preview', '--host', '127.0.0.1', '--port', '4322'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
preview.stdout.on('data', (chunk) => (output += chunk));
preview.stderr.on('data', (chunk) => (output += chunk));

const waitForServer = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Astro preview did not become ready.\n${output}`);
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  const mobile = await browser.newPage({ viewport: { width: 320, height: 800 } });
  const pageErrors = [];
  mobile.on('pageerror', (error) => pageErrors.push(error.message));
  for (const route of ['/', '/boutique/', '/a-propos/', '/contact/', '/panier/', '/commande/', '/confirmation/', '/oeuvre/vortex-5/']) {
    const response = await mobile.goto(`${origin}${route}`);
    if (!response?.ok()) throw new Error(`${route} returned ${response?.status() ?? 'no response'}`);
    const overflows = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (overflows) throw new Error(`${route} overflows horizontally at 320px.`);
  }

  await mobile.goto(origin);
  const toggle = mobile.locator('#site-menu-toggle');
  await toggle.click();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') throw new Error('Mobile menu did not expose expanded state.');
  if (await mobile.locator('#site-mobile-menu').evaluate((element) => element.hidden)) throw new Error('Mobile menu remained hidden.');
  for (const selector of ['.nav', 'main', '.footer', '[data-cart-shell]']) {
    if (!(await mobile.locator(selector).evaluate((element) => element.inert))) throw new Error(`Mobile menu did not inert ${selector}.`);
  }
  await mobile.keyboard.press('Shift+Tab');
  const wrappedHref = await mobile.evaluate(() => document.activeElement?.getAttribute('href'));
  if (wrappedHref !== '/panier/') throw new Error('Mobile menu focus did not wrap to its last link.');
  await mobile.keyboard.press('Escape');
  if ((await toggle.getAttribute('aria-expanded')) !== 'false') throw new Error('Escape did not collapse the mobile menu.');
  if (!(await toggle.evaluate((element) => element === document.activeElement))) throw new Error('Focus did not return to the menu button.');
  if (await mobile.locator('main').evaluate((element) => element.inert)) throw new Error('Escape did not restore background interactivity.');

  await toggle.click();
  await mobile.locator('#site-mobile-menu').click({ position: { x: 4, y: 4 } });
  if (!(await toggle.evaluate((element) => element === document.activeElement))) throw new Error('Overlay close did not restore menu trigger focus.');
  if (await mobile.locator('main').evaluate((element) => element.inert)) throw new Error('Overlay close did not restore background interactivity.');

  await toggle.click();
  await mobile.locator('#site-mobile-menu a[href="/contact/"]').click();
  await mobile.waitForURL('**/contact/');
  if (await mobile.locator('main').evaluate((element) => element.inert)) throw new Error('Menu navigation did not restore background interactivity.');

  await mobile.goto(origin);
  await mobile.locator('#site-menu-toggle').click();
  await mobile.setViewportSize({ width: 1440, height: 900 });
  await mobile.waitForFunction(() => document.querySelector('#site-mobile-menu')?.hidden === true);
  if (!(await mobile.locator('#site-mobile-menu').evaluate((element) => element.hidden))) throw new Error('Desktop breakpoint did not close the mobile menu.');
  if (await mobile.locator('main').evaluate((element) => element.inert)) throw new Error('Desktop breakpoint did not restore background interactivity.');

  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`${origin}/boutique/`);
  if (await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error('/boutique overflows horizontally at 390px.');
  }
  if (!(await mobile.locator('#site-menu-toggle').isVisible())) throw new Error('Mobile menu button is not visible at 390px.');
  if ((await mobile.locator('[data-artwork-card]').count()) !== 60) throw new Error('Boutique did not render all 60 candidate works.');
  if ((await mobile.locator('[data-result-count]').textContent())?.trim() !== '60 œuvres affichées') throw new Error('Initial boutique result count is not 60.');

  await mobile.locator('[data-filter-series="vortex"]').click();
  if (new URL(mobile.url()).searchParams.get('serie') !== 'vortex') throw new Error('Series filter was not preserved in the URL.');
  if ((await mobile.locator('[data-result-count]').textContent())?.trim() !== '9 œuvres affichées') throw new Error('Vortex result count is not 9.');
  await mobile.locator('[data-filter-availability]').click();
  if (new URL(mobile.url()).searchParams.get('disponibilite') !== 'disponibles') throw new Error('Availability filter was not preserved in the URL.');
  if ((await mobile.locator('[data-result-count]').textContent())?.trim() !== '0 œuvres affichées') throw new Error('Fail-closed availability result count is not 0.');
  if (!(await mobile.locator('[data-catalog-empty]').isVisible())) throw new Error('Empty available-state explanation is hidden.');
  await mobile.goBack();
  if ((await mobile.locator('[data-result-count]').textContent())?.trim() !== '9 œuvres affichées') throw new Error('Back navigation did not restore the series filter.');

  await mobile.goto(`${origin}/oeuvre/vortex-5/`);
  const stage = mobile.locator('[data-unverified-media]');
  if ((await stage.locator('img').evaluate((image) => getComputedStyle(image).objectFit)) !== 'contain') throw new Error('Artwork stage does not use object-fit: contain.');
  if (await mobile.locator('[data-lightbox-open], [data-lightbox]').count()) throw new Error('Unverified media incorrectly exposes enlargement controls.');

  await mobile.setViewportSize({ width: 1440, height: 900 });
  await mobile.goto(`${origin}/oeuvre/vortex-5/`);
  if (await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error('/oeuvre/vortex-5 overflows horizontally at 1440px.');
  }
  if (!(await mobile.locator('.nav__links').isVisible())) throw new Error('Desktop navigation is not visible at 1440px.');
  if (await mobile.locator('#site-menu-toggle').isVisible()) throw new Error('Mobile menu button remains visible at 1440px.');
  if ((await mobile.locator('.artwork-room').evaluate((element) => getComputedStyle(element).gridTemplateColumns)).split(' ').length < 2) {
    throw new Error('Artwork detail did not retain its desktop two-column composition.');
  }

  const noJavaScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
  const noJavaScriptPage = await noJavaScript.newPage();
  await noJavaScriptPage.goto(origin);
  const revealOpacity = await noJavaScriptPage.locator('.reveal').first().evaluate((element) => getComputedStyle(element).opacity);
  if (revealOpacity !== '1') throw new Error(`Reveal content opacity without JavaScript was ${revealOpacity}.`);
  if (!(await noJavaScriptPage.locator('.nav__links').isVisible())) throw new Error('Primary navigation is hidden without JavaScript at 320px.');
  await noJavaScriptPage.goto(`${origin}/boutique/`);
  if ((await noJavaScriptPage.locator('[data-artwork-card]').count()) !== 60) throw new Error('Essential catalog content is hidden without JavaScript.');
  await noJavaScript.close();

  if (pageErrors.length) throw new Error(`Browser page errors:\n${pageErrors.join('\n')}`);

  console.log('Phase 3 browser checks passed at 320px, 390px, and 1440px: layout, URL filters, counts, fail-closed commerce/media, menu focus return, contain media, and no-JavaScript content/navigation.');
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
