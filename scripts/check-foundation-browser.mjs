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

  await mobile.setViewportSize({ width: 1440, height: 900 });
  await mobile.goto(`${origin}/oeuvre/vortex-5`);
  if (await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)) {
    throw new Error('/oeuvre/vortex-5 overflows horizontally at 1440px.');
  }
  if (!(await mobile.locator('.nav__links').isVisible())) throw new Error('Desktop navigation is not visible at 1440px.');
  if (await mobile.locator('#site-menu-toggle').isVisible()) throw new Error('Mobile menu button remains visible at 1440px.');

  const noJavaScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 800 } });
  const noJavaScriptPage = await noJavaScript.newPage();
  await noJavaScriptPage.goto(origin);
  const revealOpacity = await noJavaScriptPage.locator('.reveal').first().evaluate((element) => getComputedStyle(element).opacity);
  if (revealOpacity !== '1') throw new Error(`Reveal content opacity without JavaScript was ${revealOpacity}.`);
  await noJavaScript.close();

  console.log('Browser foundation checks passed at 320px, 390px, and 1440px, including keyboard menu and no-JavaScript reveal.');
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
