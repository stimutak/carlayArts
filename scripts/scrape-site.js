/**
 * Carlay Art Website Scraper
 * Uses Playwright to mirror the site including all images and pages
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const BASE_URL = 'https://carlay-art.com';
const OUTPUT_DIR = path.join(__dirname, '..', 'original-site');
const IMAGES_DIR = path.join(OUTPUT_DIR, 'images');

// Track visited URLs to avoid duplicates
const visitedUrls = new Set();
const allImages = new Set();
const allPages = [];

// Create output directories
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Download a file
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
        downloadFile(response.headers.location, filepath).then(resolve).catch(reject);
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

// Extract filename from URL
function getFilename(url) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const filename = pathname.split('/').pop() || 'index';
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}

async function scrapePage(page, url) {
  if (visitedUrls.has(url)) return;
  visitedUrls.add(url);

  console.log(`Scraping: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for images to load
    await page.waitForTimeout(2000);

    // Get page content
    const html = await page.content();
    const title = await page.title();

    // Extract all images
    const images = await page.evaluate(() => {
      const imgs = [];
      document.querySelectorAll('img').forEach(img => {
        if (img.src) imgs.push(img.src);
        if (img.dataset.src) imgs.push(img.dataset.src);
      });
      // Also get background images
      document.querySelectorAll('[style*="background"]').forEach(el => {
        const style = el.getAttribute('style');
        const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (match) imgs.push(match[1]);
      });
      return imgs;
    });

    images.forEach(img => {
      if (img.startsWith('http')) {
        allImages.add(img);
      } else if (img.startsWith('/')) {
        allImages.add(BASE_URL + img);
      }
    });

    // Extract all internal links
    const links = await page.evaluate((baseUrl) => {
      const anchors = [];
      document.querySelectorAll('a[href]').forEach(a => {
        const href = a.href;
        if (href.includes(new URL(baseUrl).hostname)) {
          anchors.push(href);
        }
      });
      return anchors;
    }, BASE_URL);

    // Save page info
    allPages.push({
      url,
      title,
      html,
      images: images.length,
      links: links.length
    });

    // Take screenshot
    const screenshotName = url === BASE_URL ? 'homepage' : getFilename(url);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `screenshot-${screenshotName}.png`),
      fullPage: true
    });

    // Save HTML
    fs.writeFileSync(
      path.join(OUTPUT_DIR, `page-${screenshotName}.html`),
      html
    );

    // Recursively scrape linked pages (limit depth)
    for (const link of links) {
      if (!visitedUrls.has(link) && visitedUrls.size < 50) {
        await scrapePage(page, link);
      }
    }

  } catch (err) {
    console.error(`Error scraping ${url}:`, err.message);
  }
}

async function main() {
  console.log('Starting Carlay Art scraper...\n');

  ensureDir(OUTPUT_DIR);
  ensureDir(IMAGES_DIR);

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome',
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Start scraping from homepage
  await scrapePage(page, BASE_URL);

  // Also try known pages from search results
  const knownPages = [
    '/boutique/vortex-5',
    '/boutique/vortex-9',
    '/boutique/purple-galaxy-7',
    '/boutique/splatsh-3',
  ];

  for (const pagePath of knownPages) {
    await scrapePage(page, BASE_URL + pagePath);
  }

  await browser.close();

  // Download all images
  console.log(`\nDownloading ${allImages.size} images...`);
  let downloaded = 0;

  for (const imgUrl of allImages) {
    try {
      const filename = getFilename(imgUrl);
      const filepath = path.join(IMAGES_DIR, filename);
      if (!fs.existsSync(filepath)) {
        await downloadFile(imgUrl, filepath);
        downloaded++;
        console.log(`  Downloaded: ${filename}`);
      }
    } catch (err) {
      console.error(`  Failed: ${imgUrl} - ${err.message}`);
    }
  }

  // Save summary
  const summary = {
    scrapedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    pagesScraped: allPages.length,
    imagesFound: allImages.size,
    imagesDownloaded: downloaded,
    pages: allPages.map(p => ({ url: p.url, title: p.title, images: p.images })),
    imageUrls: Array.from(allImages)
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'scrape-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  console.log('\n========================================');
  console.log('Scraping complete!');
  console.log(`Pages scraped: ${allPages.length}`);
  console.log(`Images found: ${allImages.size}`);
  console.log(`Images downloaded: ${downloaded}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('========================================\n');
}

main().catch(console.error);
