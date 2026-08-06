import { spawn } from 'node:child_process';
import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4323';
const routes = [
  '/',
  '/boutique',
  '/oeuvre/vortex-5',
  '/a-propos',
  '/contact',
  '/client-a-fournir',
  '/panier',
  '/commande',
  '/confirmation',
  '/404.html',
];

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
      if ((await fetch(origin)).ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Astro preview did not become ready.\n${output}`);
};

let browser;
let context;
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const failures = [];

  for (const route of routes) {
    const response = await page.goto(`${origin}${route}`);
    if (!response?.ok()) {
      failures.push(`${route}: HTTP ${response?.status() ?? 'unknown'}`);
      continue;
    }
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    for (const violation of result.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')) {
      failures.push(
        `${route}: [${violation.impact}] ${violation.id} — ${violation.help} (${violation.nodes.length} node${violation.nodes.length === 1 ? '' : 's'})`,
      );
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/boutique', '/commande']) {
    await page.goto(`${origin}${route}`);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    for (const violation of result.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious')) {
      failures.push(
        `${route} at 390px: [${violation.impact}] ${violation.id} — ${violation.help} (${violation.nodes.length} node${violation.nodes.length === 1 ? '' : 's'})`,
      );
    }
  }

  if (failures.length > 0) throw new Error(`Accessibility blockers:\n${failures.join('\n')}`);
  console.log(`Accessibility checks passed with zero critical or serious violations across ${routes.length} routes and mobile representatives.`);
} finally {
  await context?.close();
  await browser?.close();
  preview.kill('SIGTERM');
}
