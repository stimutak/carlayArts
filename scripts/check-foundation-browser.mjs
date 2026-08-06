import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4322';
const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4322'], {
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
  const browserErrors = [];
  mobile.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`);
  });
  mobile.on('pageerror', (error) => browserErrors.push(`page: ${error.message}`));
  for (const route of ['/', '/boutique', '/a-propos', '/contact', '/panier', '/commande', '/confirmation', '/oeuvre/vortex-5']) {
    const response = await mobile.goto(`${origin}${route}`);
    if (!response?.ok()) throw new Error(`${route} returned ${response?.status() ?? 'no response'}`);
    const overflows = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (overflows) throw new Error(`${route} overflows horizontally at 320px.`);
  }

  await mobile.goto(origin);
  const toggle = mobile.locator('#site-menu-toggle');
  await toggle.click();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') throw new Error('Mobile menu did not expose expanded state.');
  if (await mobile.locator('#site-mobile-menu').getAttribute('hidden')) throw new Error('Mobile menu remained hidden.');
  await mobile.keyboard.press('Shift+Tab');
  const wrappedHref = await mobile.evaluate(() => document.activeElement?.getAttribute('href'));
  if (wrappedHref !== '/panier') throw new Error('Mobile menu focus did not wrap to its last link.');
  await mobile.keyboard.press('Escape');
  if ((await toggle.getAttribute('aria-expanded')) !== 'false') throw new Error('Escape did not collapse the mobile menu.');
  if (!(await toggle.evaluate((element) => element === document.activeElement))) throw new Error('Focus did not return to the menu button.');

  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`${origin}/boutique`);
  if (await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error('/boutique overflows horizontally at 390px.');
  }
  if (!(await mobile.locator('#site-menu-toggle').isVisible())) throw new Error('Mobile menu button is not visible at 390px.');

  const cards = mobile.locator('[data-artwork-card]');
  if ((await cards.count()) !== 60) throw new Error(`Boutique rendered ${await cards.count()} artwork cards instead of 60.`);
  await mobile.locator('[data-filter-series="vortex"]').click();
  if (!mobile.url().includes('serie=vortex')) throw new Error('Vortex filter was not written to the URL.');
  const visibleVortex = await mobile.locator('[data-artwork-card]:not([hidden])').count();
  if (visibleVortex !== 9) throw new Error(`Vortex filter displayed ${visibleVortex} cards instead of 9.`);
  await mobile.locator('[data-filter-available]').click();
  if ((await mobile.locator('[data-artwork-card]:not([hidden])').count()) !== 0) {
    throw new Error('Available filter exposed an unapproved artwork.');
  }
  if (!(await mobile.locator('.catalog__empty').isVisible())) throw new Error('Empty availability result is not visible.');
  await mobile.goBack();
  if ((await mobile.locator('[data-artwork-card]:not([hidden])').count()) !== 9) {
    throw new Error('Browser Back did not restore the Vortex filter.');
  }
  await mobile.goto(`${origin}/boutique?serie=insomnia`);
  if ((await mobile.locator('[data-artwork-card]:not([hidden])').count()) !== 6) {
    throw new Error('Shared Insomnia URL did not restore six results.');
  }

  await mobile.setViewportSize({ width: 1440, height: 900 });
  await mobile.goto(`${origin}/oeuvre/vortex-5`);
  if (await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error('/oeuvre/vortex-5 overflows horizontally at 1440px.');
  }
  if (!(await mobile.locator('.nav__links').isVisible())) throw new Error('Desktop navigation is not visible at 1440px.');
  if (await mobile.locator('#site-menu-toggle').isVisible()) throw new Error('Mobile menu button remains visible at 1440px.');
  if ((await mobile.locator('text=Ajouter au panier').count()) > 0) throw new Error('Unapproved artwork exposes an add action.');

  const lightboxTrigger = mobile.locator('[data-lightbox-open]').first();
  await lightboxTrigger.click();
  const lightbox = mobile.locator('[data-lightbox]');
  if (!(await lightbox.evaluate((element) => element.open))) throw new Error('Artwork lightbox did not open.');
  await mobile.keyboard.press('Escape');
  if (await lightbox.evaluate((element) => element.open)) throw new Error('Escape did not close the artwork lightbox.');
  if (!(await lightboxTrigger.evaluate((element) => element === document.activeElement))) {
    throw new Error('Artwork lightbox did not return focus.');
  }

  const cartToggle = mobile.locator('.nav .js-cart-toggle');
  await cartToggle.click();
  if (await mobile.locator('[data-cart-layer]').getAttribute('hidden')) throw new Error('Cart drawer remained hidden.');
  if (!(await mobile.locator('[data-cart-empty]').isVisible())) throw new Error('Fail-closed cart empty state is missing.');
  await mobile.keyboard.press('Escape');
  if (!(await cartToggle.evaluate((element) => element === document.activeElement))) throw new Error('Cart drawer did not return focus.');

  await mobile.goto(`${origin}/commande`);
  if (!(await mobile.locator('[data-checkout-submit]').isDisabled())) throw new Error('Empty checkout is not disabled.');
  await mobile.goto(`${origin}/confirmation`);
  if (!(await mobile.getByText('Aucun paiement n’a été pris.').isVisible())) throw new Error('Confirmation omits demo status.');

  const noJavaScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
  const noJavaScriptPage = await noJavaScript.newPage();
  await noJavaScriptPage.goto(origin);
  const revealOpacity = await noJavaScriptPage.locator('.reveal').first().evaluate((element) => getComputedStyle(element).opacity);
  if (revealOpacity !== '1') throw new Error(`Reveal content opacity without JavaScript was ${revealOpacity}.`);
  await noJavaScriptPage.goto(`${origin}/boutique`);
  if ((await noJavaScriptPage.locator('[data-artwork-card]').count()) !== 60) {
    throw new Error('No-JavaScript catalog did not retain all artwork content.');
  }
  await noJavaScript.close();

  if (browserErrors.length > 0) throw new Error(`Browser errors detected:\n${browserErrors.join('\n')}`);
  console.log('Browser site checks passed at 320px, 390px, and 1440px, including filters, dialogs, cart safety, and no-JavaScript content.');
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
