import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4325';
const outputDirectory = join(process.cwd(), 'docs/audits/screenshots/phase-5');
const cases = [
  { name: 'home-320.jpg', route: '/', width: 320, height: 800 },
  { name: 'boutique-390.jpg', route: '/boutique/', width: 390, height: 844 },
  { name: 'artwork-1440.jpg', route: '/oeuvre/vortex-5/', width: 1440, height: 900 },
];

const preview = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4325'], {
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
  await mkdir(outputDirectory, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const errors = [];

  for (const entry of cases) {
    const page = await browser.newPage({ viewport: { width: entry.width, height: entry.height } });
    page.on('console', (message) => message.type() === 'error' && errors.push(`${entry.route}: ${message.text()}`));
    page.on('pageerror', (error) => errors.push(`${entry.route}: ${error.message}`));
    const response = await page.goto(`${origin}${entry.route}`);
    if (!response?.ok()) throw new Error(`${entry.route} returned ${response?.status() ?? 'no response'}.`);
    await page.waitForFunction(() => document.documentElement.dataset.cartReady === 'true');
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      height: window.innerHeight,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    if (dimensions.width !== entry.width || dimensions.height !== entry.height || dimensions.overflow) {
      throw new Error(`${entry.route} did not render cleanly at ${entry.width}×${entry.height}: ${JSON.stringify(dimensions)}`);
    }
    await page.screenshot({
      path: join(outputDirectory, entry.name),
      type: 'jpeg',
      quality: 90,
      fullPage: false,
    });
    await page.close();
  }

  if (errors.length) throw new Error(`Screenshot routes produced browser errors:\n${errors.join('\n')}`);
  console.log(`Captured ${cases.map((entry) => `${entry.width}×${entry.height} ${entry.route}`).join(', ')}.`);
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
