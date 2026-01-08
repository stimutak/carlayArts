#!/usr/bin/env node
/**
 * Carlay Art Website Scraper (Standalone)
 *
 * USAGE:
 *   1. Make sure you have Node.js installed (v18+)
 *   2. Run: npm install playwright
 *   3. Run: npx playwright install chromium
 *   4. Run: node scrape-site-standalone.js
 *
 * Output will be saved to ./original-site/
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BASE_URL = 'https://carlay-art.com';
const OUTPUT_DIR = path.join(process.cwd(), 'original-site');
const IMAGES_DIR = path.join(OUTPUT_DIR, 'images');

const visitedUrls = new Set();
const allImages = new Set();
const allPages = [];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);

    protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(filepath);
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filepath);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

function getFilename(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    let filename = pathname.split('/').pop() || 'index';
    // Preserve extension if present
    if (!filename.includes('.')) {
      filename += '.html';
    }
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  } catch {
    return 'unknown';
  }
}

function getPageSlug(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/\/$/, '') || 'homepage';
    return pathname.replace(/\//g, '_').replace(/^_/, '') || 'homepage';
  } catch {
    return 'unknown';
  }
}

async function scrapePage(page, url, depth = 0) {
  if (visitedUrls.has(url) || depth > 2) return;
  visitedUrls.add(url);

  console.log(`[${'█'.repeat(depth + 1)}${'░'.repeat(2 - depth)}] Scraping: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const html = await page.content();
    const title = await page.title();

    // Extract all images including lazy-loaded
    const images = await page.evaluate(() => {
      const imgs = new Set();

      // Regular images
      document.querySelectorAll('img').forEach(img => {
        if (img.src && !img.src.startsWith('data:')) imgs.add(img.src);
        if (img.dataset.src) imgs.add(img.dataset.src);
        if (img.dataset.lazySrc) imgs.add(img.dataset.lazySrc);
        // srcset
        if (img.srcset) {
          img.srcset.split(',').forEach(s => {
            const src = s.trim().split(' ')[0];
            if (src && !src.startsWith('data:')) imgs.add(src);
          });
        }
      });

      // Picture sources
      document.querySelectorAll('source').forEach(source => {
        if (source.srcset) {
          source.srcset.split(',').forEach(s => {
            const src = s.trim().split(' ')[0];
            if (src && !src.startsWith('data:')) imgs.add(src);
          });
        }
      });

      // Background images in style
      document.querySelectorAll('[style*="background"]').forEach(el => {
        const style = el.getAttribute('style') || '';
        const matches = style.match(/url\(['"]?([^'")\s]+)['"]?\)/g) || [];
        matches.forEach(m => {
          const url = m.replace(/url\(['"]?/, '').replace(/['"]?\)/, '');
          if (!url.startsWith('data:')) imgs.add(url);
        });
      });

      // CSS background images
      document.querySelectorAll('*').forEach(el => {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          const matches = bg.match(/url\(['"]?([^'")\s]+)['"]?\)/g) || [];
          matches.forEach(m => {
            const url = m.replace(/url\(['"]?/, '').replace(/['"]?\)/, '');
            if (!url.startsWith('data:')) imgs.add(url);
          });
        }
      });

      return Array.from(imgs);
    });

    // Normalize image URLs
    images.forEach(img => {
      try {
        const imgUrl = new URL(img, BASE_URL).href;
        if (imgUrl.includes('carlay-art.com') || imgUrl.includes('wp-content') || imgUrl.includes('uploads')) {
          allImages.add(imgUrl);
        }
      } catch {}
    });

    // Extract internal links
    const links = await page.evaluate((baseHost) => {
      const anchors = new Set();
      document.querySelectorAll('a[href]').forEach(a => {
        try {
          const url = new URL(a.href);
          if (url.hostname === baseHost || url.hostname.endsWith('.' + baseHost)) {
            anchors.add(a.href);
          }
        } catch {}
      });
      return Array.from(anchors);
    }, new URL(BASE_URL).hostname);

    // Extract CSS and fonts
    const assets = await page.evaluate(() => {
      const css = [];
      const fonts = [];

      document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (link.href) css.push(link.href);
      });

      document.querySelectorAll('link[rel="preload"][as="font"]').forEach(link => {
        if (link.href) fonts.push(link.href);
      });

      return { css, fonts };
    });

    // Save page data
    const slug = getPageSlug(url);
    allPages.push({
      url,
      slug,
      title,
      images: images.length,
      links: links.length,
      assets
    });

    // Take full page screenshot
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `screenshot-${slug}.png`),
      fullPage: true
    });

    // Take viewport screenshot
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `viewport-${slug}.png`),
      fullPage: false
    });

    // Save HTML
    fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.html`), html);

    console.log(`    ✓ Saved: ${slug} (${images.length} images, ${links.length} links)`);

    // Recursively scrape linked pages
    for (const link of links) {
      if (!visitedUrls.has(link) && visitedUrls.size < 30) {
        await scrapePage(page, link, depth + 1);
      }
    }

  } catch (err) {
    console.error(`    ✗ Error: ${err.message}`);
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           CARLAY ART WEBSITE SCRAPER                         ║
║                                                               ║
║  Target: ${BASE_URL.padEnd(43)}  ║
╚═══════════════════════════════════════════════════════════════╝
`);

  ensureDir(OUTPUT_DIR);
  ensureDir(IMAGES_DIR);

  console.log('Launching browser...\n');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Scrape from homepage
  await scrapePage(page, BASE_URL);

  // Also try specific known pages
  const knownPages = [
    '/boutique',
    '/boutique/vortex-5',
    '/boutique/vortex-9',
    '/boutique/purple-galaxy-7',
    '/boutique/splatsh-3',
    '/boutique/romeo-1',
    '/boutique/romeo-2',
    '/boutique/romeo-3',
    '/boutique/juliette-1',
    '/boutique/juliette-2',
    '/about',
    '/contact',
  ];

  for (const pagePath of knownPages) {
    const fullUrl = BASE_URL + pagePath;
    if (!visitedUrls.has(fullUrl)) {
      await scrapePage(page, fullUrl, 1);
    }
  }

  await browser.close();

  // Download all images
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Downloading ${allImages.size} images...\n`);

  let downloaded = 0;
  let failed = 0;

  for (const imgUrl of allImages) {
    try {
      const filename = getFilename(imgUrl);
      const filepath = path.join(IMAGES_DIR, filename);

      if (!fs.existsSync(filepath)) {
        process.stdout.write(`  ↓ ${filename.substring(0, 50).padEnd(50)} `);
        await downloadFile(imgUrl, filepath);
        console.log('✓');
        downloaded++;
      } else {
        console.log(`  ○ ${filename} (exists)`);
      }
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed++;
    }
  }

  // Create image manifest
  const imageManifest = {};
  for (const imgUrl of allImages) {
    const filename = getFilename(imgUrl);
    imageManifest[filename] = imgUrl;
  }
  fs.writeFileSync(
    path.join(IMAGES_DIR, '_manifest.json'),
    JSON.stringify(imageManifest, null, 2)
  );

  // Save comprehensive summary
  const summary = {
    scrapedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    stats: {
      pagesScraped: allPages.length,
      imagesFound: allImages.size,
      imagesDownloaded: downloaded,
      imagesFailed: failed,
    },
    pages: allPages,
    images: Array.from(allImages),
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'scrape-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  // Generate index file
  const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Carlay Art - Scraped Site Index</title>
  <style>
    body { font-family: system-ui; max-width: 1200px; margin: 0 auto; padding: 2rem; background: #0a0a0a; color: #fafafa; }
    h1 { border-bottom: 1px solid #333; padding-bottom: 1rem; }
    h2 { color: #ff3366; margin-top: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .card { background: #1a1a1a; padding: 1rem; border-radius: 4px; }
    .card img { width: 100%; height: 200px; object-fit: cover; border-radius: 2px; }
    .card h3 { margin: 0.5rem 0; font-size: 1rem; }
    .card p { color: #888; font-size: 0.875rem; margin: 0; }
    a { color: #6366f1; }
  </style>
</head>
<body>
  <h1>Carlay Art - Scraped Content</h1>
  <p>Scraped: ${new Date().toLocaleString()}</p>

  <h2>Pages (${allPages.length})</h2>
  <div class="grid">
    ${allPages.map(p => `
      <div class="card">
        <img src="screenshot-${p.slug}.png" alt="${p.title}">
        <h3>${p.title || p.slug}</h3>
        <p><a href="${p.slug}.html">View HTML</a> · <a href="${p.url}" target="_blank">Original</a></p>
      </div>
    `).join('')}
  </div>

  <h2>Images (${allImages.size})</h2>
  <div class="grid">
    ${Array.from(allImages).slice(0, 50).map(img => `
      <div class="card">
        <img src="images/${getFilename(img)}" alt="" onerror="this.style.display='none'">
        <p>${getFilename(img)}</p>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    SCRAPING COMPLETE                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Pages scraped:     ${String(allPages.length).padEnd(39)} ║
║  Images found:      ${String(allImages.size).padEnd(39)} ║
║  Images downloaded: ${String(downloaded).padEnd(39)} ║
║  Images failed:     ${String(failed).padEnd(39)} ║
╠═══════════════════════════════════════════════════════════════╣
║  Output: ${OUTPUT_DIR.padEnd(51)} ║
║                                                               ║
║  Open original-site/index.html to browse results              ║
╚═══════════════════════════════════════════════════════════════╝
`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
