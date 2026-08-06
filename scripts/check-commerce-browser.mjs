import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4323';
const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4323'], {
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

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const assertNoOverflow = async (page, route, width) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  assert(!overflow, `${route} overflows horizontally at ${width}px.`);
};

const patchInventory = async (route) => {
  if (route.request().resourceType() !== 'document') return route.continue();
  const response = await route.fetch();
  const type = response.headers()['content-type'] || '';
  if (!type.includes('text/html')) return route.fulfill({ response });
  const body = await response.text();
  const patched = body.replace(
    /(<script id="carlay-cart-inventory" type="application\/json">)([\s\S]*?)(<\/script>)/,
    (_, start, json, end) => {
      const records = JSON.parse(json);
      const work = records.find((record) => record.id === 'legacy-vortex-5');
      if (work) {
        const approved = (value) => ({ value, reviewStatus: 'owner-approved' });
        work.availability = 'available';
        work.availabilityReviewStatus = 'owner-approved';
        work.price.reviewStatus = 'owner-approved';
        work.medium = approved('Acrylique sur toile');
        work.year = approved(2026);
        work.dimensions.reviewStatus = 'owner-approved';
        work.signaturePlacement = approved('Dos de la toile');
        work.condition = approved('Neuve');
        work.framingStatus = approved('Non encadrée');
        work.certificateStatus = approved('Inclus');
        work.images.full = { src: work.image.src, alt: `${work.title}, vue intégrale test`, reviewStatus: 'owner-approved' };
        work.images.details = [{ src: work.image.src, alt: `${work.title}, détail test`, reviewStatus: 'owner-approved' }];
      }
      return `${start}${JSON.stringify(records)}${end}`;
    },
  );
  return route.fulfill({ response, body: patched, headers: { ...response.headers(), 'content-type': 'text/html; charset=utf-8' } });
};

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });

  const guarded = await browser.newContext({ viewport: { width: 320, height: 800 } });
  const page = await guarded.newPage();
  const errors = [];
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${origin}/oeuvre/vortex-5`);
  assert((await page.locator('[data-availability="not-for-sale"]').count()) === 1, 'Not-for-sale state is not visible on the work page.');
  assert((await page.locator('[data-cart-add]').count()) === 0, 'Not-for-sale work exposed an add control.');
  await page.evaluate(() => localStorage.setItem('carlay-cart-v2', JSON.stringify({ version: 2, itemIds: ['legacy-vortex-5', 'invented'] })));
  await page.reload();
  assert((await page.locator('[data-cart-count]').first().textContent()) === '0', 'Unavailable or unknown persisted work was not removed.');

  await page.setViewportSize({ width: 1440, height: 900 });
  const open = page.locator('[data-cart-open]').first();
  await open.click();
  assert(await page.locator('#cart-drawer').isVisible(), 'Cart drawer did not open.');
  assert(await page.locator('main').evaluate((node) => node.inert), 'Drawer did not make background content inert.');
  assert(await page.locator('[data-cart-close]').evaluate((node) => node === document.activeElement), 'Drawer focus did not move to the close button.');
  await page.keyboard.press('Shift+Tab');
  assert((await page.evaluate(() => document.activeElement?.getAttribute('href'))) === '/boutique', 'Drawer focus did not wrap to its final control.');
  await page.keyboard.press('Escape');
  assert(await open.evaluate((node) => node === document.activeElement), 'Drawer focus did not return to its trigger.');
  assert(!await page.locator('main').evaluate((node) => node.inert), 'Drawer did not restore background interactivity.');

  await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ['/panier', '/commande', '/confirmation']) {
    await page.goto(`${origin}${route}`);
    await assertNoOverflow(page, route, 320);
  }
  await page.goto(`${origin}/panier`);
  assert(!await page.locator('[data-cart-page-review]').isVisible(), 'Empty cart exposed checkout totals or CTA.');
  await page.goto(`${origin}/commande`);
  assert(await page.locator('[data-checkout-cart-error]').isVisible(), 'Empty checkout did not expose a recovery state.');
  assert(await page.locator('[data-checkout-submit]').isDisabled(), 'Empty checkout submit remained enabled.');
  const bodyText = await page.locator('body').innerText();
  assert(!/Stripe|Mollie|Coinbase/i.test(bodyText), 'Checkout implies a named live provider.');
  const noJavaScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
  const noJavaScriptCheckout = await noJavaScript.newPage();
  await noJavaScriptCheckout.goto(`${origin}/commande`);
  assert(await noJavaScriptCheckout.locator('[data-checkout-form]').isVisible(), 'Checkout essentials disappear when JavaScript does not initialize.');
  assert(await noJavaScriptCheckout.locator('[data-checkout-submit]').isDisabled(), 'Non-enhanced checkout exposed an actionable submit.');
  assert((await noJavaScriptCheckout.locator('noscript').innerText()).includes('Aucun paiement'), 'Non-enhanced checkout lacks an accurate no-payment message.');
  await noJavaScript.close();
  await guarded.close();

  const journey = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await journey.route('**/*', patchInventory);
  const demo = await journey.newPage();
  const journeyErrors = [];
  demo.on('console', (message) => message.type() === 'error' && journeyErrors.push(message.text()));
  demo.on('pageerror', (error) => journeyErrors.push(error.message));
  await demo.goto(`${origin}/oeuvre/vortex-5`);
  await demo.evaluate(() => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Ajouter le fixture disponible';
    button.dataset.cartAdd = 'legacy-vortex-5';
    button.setAttribute('data-cart-open-after-add', '');
    document.querySelector('[data-cart-actions]')?.append(button);
  });
  const fixtureAdd = demo.locator('[data-cart-add="legacy-vortex-5"]');
  await fixtureAdd.click();
  assert(await demo.locator('#cart-drawer').isVisible(), 'Successful add did not open the drawer.');
  assert((await demo.locator('[data-cart-count]').first().textContent()) === '1', 'Successful add did not update the count.');
  await demo.locator('[data-cart-close]').click();
  await fixtureAdd.click();
  await demo.waitForTimeout(40);
  assert((await demo.locator('[data-cart-count]').first().textContent()) === '1', 'Duplicate add changed the unique-work count.');
  assert((await demo.locator('[data-cart-announcer]').textContent()).includes('déjà'), 'Duplicate add was not announced.');
  await demo.reload();
  assert((await demo.locator('[data-cart-count]').first().textContent()) === '1', 'Cart did not persist across reload.');

  await demo.goto(`${origin}/panier`);
  assert((await demo.locator('[data-cart-page-items] .cart-line').count()) === 1, 'Full cart did not render the persisted work.');
  await assertNoOverflow(demo, '/panier', 390);
  await demo.locator('main a[href="/commande"]').filter({ hasText: 'Continuer' }).click();
  assert(!await demo.locator('[data-order-summary]').getAttribute('open'), 'Mobile order summary should begin collapsed.');

  await demo.locator('[data-checkout-submit]').click();
  assert(!await demo.locator('[data-error-summary]').getAttribute('hidden'), 'Invalid checkout did not expose the error summary.');
  assert(await demo.locator('[data-error-summary]').evaluate((node) => node === document.activeElement), 'Checkout errors did not receive focus.');
  assert((await demo.locator('[aria-invalid="true"]').count()) >= 7, 'Required fields were not associated with inline errors.');

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
  assert((await demo.locator('[data-error-summary]').innerText()).includes('Aucune donnée'), 'Simulated failure did not explain that nothing was transmitted.');
  assert(await demo.locator('[data-error-summary]').evaluate((node) => node === document.activeElement), 'Simulated failure did not move focus to recovery guidance.');
  assert(await demo.locator('#prenom').inputValue() === 'Ada', 'Corrected values were not retained after failure.');

  await demo.uncheck('input[name="simulate_failure"]');
  await demo.locator('[data-checkout-submit]').click();
  await demo.waitForURL('**/confirmation');
  assert(await demo.getByRole('heading', { name: 'Aucun paiement n’a été pris' }).isVisible(), 'Confirmation lacks the no-payment outcome.');
  assert((await demo.locator('[data-confirmation-items]').innerText()).includes('Vortex 5'), 'Confirmation does not repeat the selected work.');
  assert((await demo.locator('[data-cart-count]').first().textContent()) === '0', 'Successful demo did not clear the cart.');
  await assertNoOverflow(demo, '/confirmation', 390);

  await demo.setViewportSize({ width: 1440, height: 900 });
  await demo.goto(`${origin}/commande`);
  await assertNoOverflow(demo, '/commande', 1440);

  assert(errors.length === 0, `Guarded journey produced console errors:\n${errors.join('\n')}`);
  assert(journeyErrors.length === 0, `Demo journey produced console errors:\n${journeyErrors.join('\n')}`);
  await journey.close();

  console.log('Commerce browser checks passed: fail-closed inventory, drawer keyboard focus, persistence, duplicate prevention, mobile checkout validation, simulated failure/retry, and no-payment confirmation.');
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
