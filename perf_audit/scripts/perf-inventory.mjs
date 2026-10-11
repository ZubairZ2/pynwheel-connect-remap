// Inventory, Units tab and Unit Detail open sequences, measured against the local pair
// (CMS :3100 on pynwheel_audit_clone, Connect production build :3005).
// Usage: node perf-inventory.mjs [id ...]   default: 8005 1411 1618 4397
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';
const require = createRequire('/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/package.json');
const { chromium } = require('playwright');

const S = process.env.PERF_SCRATCH ?? '<scratchpad with session.json and assets/>';
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3005';
const RAILS_LOG = '/Users/zubairzulifqar/pynwheel-staging/log/development.log';
const session = JSON.parse(readFileSync(`${S}/session.json`, 'utf8'));
const ids = process.argv.slice(2).length ? process.argv.slice(2).map(Number) : [8005, 1411, 1618, 4397];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

const logSize = () => statSync(RAILS_LOG).size;
const railsRequests = (from) => {
  const size = logSize();
  if (size <= from) return [];
  const fd = openSync(RAILS_LOG, 'r');
  const buf = Buffer.alloc(size - from);
  readSync(fd, buf, 0, size - from, from);
  closeSync(fd);
  const text = buf.toString('utf8');
  const started = [...text.matchAll(/Started GET "([^"]+)"/g)].map((m) => m[1]);
  const completed = [...text.matchAll(/Completed (\d+) \w+ in (\d+)ms \(Views: ([\d.]+)ms \| ActiveRecord: ([\d.]+)ms/g)].map((m) => ({ status: +m[1], ms: +m[2], views: +m[3], db: +m[4] }));
  return started.map((path, i) => ({ path: path.replace(/\?.*$/, '') + (path.includes('?') ? '?' : ''), ...(completed[i] ?? {}) }));
};
const perfOf = (page) => page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  const pick = (e) => ({ name: e.name.replace(location.origin, '').replace(/today=\d{4}-\d{2}-\d{2}/, 'today=…'), start: Math.round(e.startTime), ttfb: Math.round(e.responseStart - e.startTime), total: Math.round(e.responseEnd - e.startTime), transfer: e.transferSize, decoded: e.decodedBodySize });
  return {
    nav: nav ? { ttfb: Math.round(nav.responseStart), responseEnd: Math.round(nav.responseEnd), dcl: Math.round(nav.domContentLoadedEventEnd), transfer: nav.transferSize, decoded: nav.decodedBodySize } : null,
    api: res.filter((e) => e.name.includes('/api/')).map(pick),
    rsc: res.filter((e) => e.name.includes('_rsc=')).map(pick),
    images: { count: res.filter((e) => e.initiatorType === 'img').length, transfer: res.filter((e) => e.initiatorType === 'img').reduce((a, e) => a + e.transferSize, 0) }
  };
});
const hydrated = (page, sel) => page.waitForFunction((s) => Array.from(document.querySelectorAll(s)).some((n) => Object.keys(n).some((k) => k.startsWith('__reactFiber'))), sel, { timeout: 120_000 });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const id of ids) {
  const run = { id, steps: {} };
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addCookies([
    { name: 'pyn_connect_rails_session', value: encodeURIComponent(session.rails_cookie), domain: '127.0.0.1', path: '/', httpOnly: true },
    { name: 'pyn_connect_user', value: encodeURIComponent(JSON.stringify(session.user)), domain: '127.0.0.1', path: '/', httpOnly: true }
  ]);
  const page = await context.newPage();
  const requests = [];
  page.on('request', (r) => requests.push(`${r.method()} ${r.url().replace(BASE, '').replace(/\?_rsc=.*$/, '?_rsc').replace(/today=\d{4}-\d{2}-\d{2}/, 'today=…')}`));
  const step = async (name, action) => {
    const mark = logSize();
    const t0 = Date.now();
    requests.length = 0;
    const out = await action(t0);
    await sleep(500);
    const rails = railsRequests(mark);
    run.steps[name] = { ...out, rails, browserRequests: requests.filter((r) => !r.includes('/_next/static/') && !r.includes('fonts.g') && !r.includes('amazonaws')) };
    console.log(`[${id}] ${name}: ${JSON.stringify({ ...out, rails: rails.map((r) => `${r.path} ${r.ms}ms (db ${r.db})`) })}`);
  };

  await step('inventoryOpen', async (t0) => {
    await page.goto(`${BASE}/properties/${id}/inventory`, { waitUntil: 'domcontentloaded' });
    await hydrated(page, '.bo-inv__tab');
    const t = Date.now() - t0;
    return { hydratedMs: t, perf: await perfOf(page), tabs: await page.evaluate(() => Array.from(document.querySelectorAll('.bo-inv__tab')).map((n) => n.textContent.trim())) };
  });

  await step('unitsTab', async (t0) => {
    const tab = page.getByRole('tab', { name: /^Units/ });
    if (!(await tab.count())) return { skipped: 'no Units tab' };
    await tab.click();
    await page.waitForFunction(() => document.querySelectorAll('.bo-record').length > 0 || document.querySelector('.bo-inv__empty'), null, { timeout: 60_000 });
    return { unitsShownMs: Date.now() - t0, cards: await page.locator('.bo-record').count(), perf: await perfOf(page) };
  });

  await step('unitsSearch', async (t0) => {
    const box = page.getByPlaceholder(/search/i).first();
    if (!(await box.count())) return { skipped: 'no search box' };
    await box.fill('1');
    await box.type('0');
    await sleep(1200);
    await page.waitForFunction(() => !document.querySelector('.bo-loading'), null, { timeout: 60_000 }).catch(() => {});
    return { ms: Date.now() - t0, cards: await page.locator('.bo-record').count() };
  });

  await step('unitsPage2', async (t0) => {
    const next = page.getByRole('button', { name: /next/i }).first();
    if (!(await next.count()) || !(await next.isEnabled().catch(() => false))) return { skipped: 'no next page' };
    await next.click();
    await sleep(1500);
    return { ms: Date.now() - t0, cards: await page.locator('.bo-record').count() };
  });

  await step('backToFloorplates', async (t0) => {
    await page.getByRole('tab', { name: /^Floorplates/ }).click();
    await sleep(600);
    await page.getByRole('tab', { name: /^Units/ }).click();
    await sleep(1500);
    return { ms: Date.now() - t0 };
  });

  await step('unitDetail', async (t0) => {
    const unitId = await page.evaluate(() => { const a = document.querySelector('a[href*="/units/"]'); return a ? a.getAttribute('href').split('/units/')[1].split(/[?#]/)[0] : null; });
    if (!unitId) return { skipped: 'no unit link' };
    await page.goto(`${BASE}/properties/${id}/units/${unitId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.bo-content', { timeout: 60_000 });
    await hydrated(page, '.bo-content button');
    const t = Date.now() - t0;
    const doc = await page.evaluate(async (u) => { const r = await fetch(u, { cache: 'no-store', headers: { Accept: 'text/html' } }); const h = await r.text(); return { htmlBytes: h.length, encoding: r.headers.get('content-encoding') }; }, `${BASE}/properties/${id}/units/${unitId}`);
    return { unitId, hydratedMs: t, perf: await perfOf(page), document: doc };
  });

  await step('propertyDetail', async (t0) => {
    await page.goto(`${BASE}/properties/${id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.bo-content', { timeout: 60_000 });
    return { ms: Date.now() - t0, perf: await perfOf(page) };
  });

  results.push(run);
  await context.close();
}
await browser.close();
writeFileSync(`${S}/perf/perf-inventory-results.json`, JSON.stringify(results, null, 2));
console.log('written');
