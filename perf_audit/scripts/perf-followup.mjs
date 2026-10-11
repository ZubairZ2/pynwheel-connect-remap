// Follow-up checks: (1) Units-tab search request behaviour while typing, (2) Hazel's Inventory
// hydration with and without its 31 floorplate thumbnails coming from S3, (3) a client-side
// navigation Property Detail → Map (no document load, no render-blocking stylesheet).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire('/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/package.json');
const { chromium } = require('playwright');
const S = process.env.PERF_SCRATCH ?? '<scratchpad with session.json and assets/>';
const BASE = 'http://127.0.0.1:3005';
const session = JSON.parse(readFileSync(`${S}/session.json`, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const newPage = async (block) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addCookies([
    { name: 'pyn_connect_rails_session', value: encodeURIComponent(session.rails_cookie), domain: '127.0.0.1', path: '/', httpOnly: true },
    { name: 'pyn_connect_user', value: encodeURIComponent(JSON.stringify(session.user)), domain: '127.0.0.1', path: '/', httpOnly: true }
  ]);
  if (block) await context.route(/amazonaws\.com/, (route) => route.abort());
  const page = await context.newPage();
  page.on('request', (r) => { const u = r.url(); if (u.includes('/api/properties')) (page.__api ??= []).push({ t: Date.now(), url: u.replace(BASE, '').replace(/today=\d{4}-\d{2}-\d{2}/, 'today=…') }); });
  page.on('requestfailed', (r) => { const u = r.url(); if (u.includes('/api/properties')) (page.__failed ??= []).push(u.replace(BASE, '').slice(0, 120)); });
  return { context, page };
};
const hydrated = (page, sel) => page.waitForFunction((s) => Array.from(document.querySelectorAll(s)).some((n) => Object.keys(n).some((k) => k.startsWith('__reactFiber'))), sel, { timeout: 120_000 });

// 1. Units search: type a 3-character query one key at a time (humanly), count the requests sent and aborted.
{
  const { context, page } = await newPage(false);
  await page.goto(`${BASE}/properties/1411/inventory?tab=units`, { waitUntil: 'domcontentloaded' });
  await hydrated(page, '.bo-inv__tab');
  await page.waitForSelector('.bo-record', { timeout: 60_000 });
  const box = page.locator('.bo-inv input[type="search"], .bo-inv input[placeholder*="earch"]').first();
  const placeholder = await box.getAttribute('placeholder');
  page.__api = []; page.__failed = [];
  const t0 = Date.now();
  await box.click();
  await page.keyboard.type('201', { delay: 120 });
  await sleep(2500);
  const cardsSlow = await page.locator('.bo-record').count();
  const slow = { requests: page.__api.map((r) => `${r.t - t0}ms ${r.url.replace('/api/properties/1411/inventory/units', '')}`), failed: page.__failed.length, cards: cardsSlow };
  page.__api = []; page.__failed = [];
  await box.fill('');
  await sleep(1500);
  page.__api = []; page.__failed = [];
  const t1 = Date.now();
  await page.keyboard.type('1024', { delay: 40 });
  await sleep(2500);
  out.unitsSearch = { placeholder, slowTyping: slow, fastTyping: { requests: page.__api.map((r) => `${r.t - t1}ms ${r.url.replace('/api/properties/1411/inventory/units', '')}`), failed: page.__failed.length, cards: await page.locator('.bo-record').count() } };
  console.log(JSON.stringify(out.unitsSearch));
  await context.close();
}

// 2. Hazel inventory: hydration time with and without the S3 thumbnails.
for (const block of [false, true]) {
  const { context, page } = await newPage(block);
  const t0 = Date.now();
  await page.goto(`${BASE}/properties/1618/inventory`, { waitUntil: 'domcontentloaded' });
  const dcl = Date.now() - t0;
  await hydrated(page, '.bo-inv__tab');
  const hyd = Date.now() - t0;
  const imgs = await page.evaluate(() => ({ imgs: document.querySelectorAll('img[src*="amazonaws"]').length, resources: performance.getEntriesByType('resource').filter((e) => e.name.includes('amazonaws')).length }));
  out[`hazelInventory_${block ? 'imagesBlocked' : 'imagesAllowed'}`] = { dclMs: dcl, hydratedMs: hyd, ...imgs };
  console.log(block ? 'blocked' : 'allowed', JSON.stringify(out[`hazelInventory_${block ? 'imagesBlocked' : 'imagesAllowed'}`]));
  await context.close();
}

// 3. Client-side navigation Property Detail → Map & Plotting for Cypress Terra (no document load).
{
  const { context, page } = await newPage(false);
  await page.goto(`${BASE}/properties/8005`, { waitUntil: 'domcontentloaded' });
  await hydrated(page, '.bo-content a, .bo-content button');
  await sleep(1500);
  const link = page.locator('a[href="/properties/8005/map"]').first();
  const t0 = Date.now();
  await link.click();
  await page.waitForSelector('.bo-map__levels', { timeout: 120_000 });
  const editor = Date.now() - t0;
  await page.waitForFunction(() => !document.querySelector('.bo-map__surface .bo-loading--cover') && document.querySelector('[data-testid="plan-svg"] svg'), null, { timeout: 180_000 });
  const plan = Date.now() - t0;
  const res = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => e.name.includes('/map') || e.name.includes('plan-svg')).map((e) => ({ name: e.name.replace(location.origin, '').replace(/_rsc=.*/, '_rsc'), total: Math.round(e.responseEnd - e.startTime), transfer: e.transferSize })));
  out.clientNavToMap = { editorVisibleMs: editor, planReadyMs: plan, resources: res.slice(-6) };
  console.log(JSON.stringify(out.clientNavToMap));
  await context.close();
}
await browser.close();
writeFileSync(`${S}/perf/perf-followup-results.json`, JSON.stringify(out, null, 2));
console.log('written');
