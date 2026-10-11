// Map & Plotting open sequence, measured per stage against the local pair
// (CMS :3100 on pynwheel_audit_clone, Connect production build :3005).
// Usage: node perf.mjs [case ...]   cases: cypress jennifer3638 jennifer1865 john hazel hartwood
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, statSync, openSync, readSync, closeSync } from 'node:fs';
const require = createRequire('/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/package.json');
const { chromium } = require('playwright');

const S = process.env.PERF_SCRATCH ?? '<scratchpad with session.json and assets/>';
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3005';
const RAILS_LOG = '/Users/zubairzulifqar/pynwheel-staging/log/development.log';
const session = JSON.parse(readFileSync(`${S}/session.json`, 'utf8'));
const CASES = {
  cypress: { id: 8005, label: 'Cypress Terra 8005 · floor 1 (Beans, SVG + background)', level: null },
  jennifer3638: { id: 1412, label: 'Jennifer Demo FP 1412 · floorplate 3638 (1.41 MB flattened SVG)', level: 'floorplate:3638' },
  jennifer1865: { id: 1412, label: 'Jennifer Demo FP 1412 · floorplate 1865 (image + 1.48 MB SVG)', level: 'floorplate:1865' },
  john: { id: 1411, label: 'John Demo 1411 · floorplate 1867 (PNG + 555 KB SVG, stored hallways)', level: 'floorplate:1867' },
  hazel: { id: 1618, label: 'Hazel 1618 · floor 1 (31 image-only floorplates)', level: null },
  hartwood: { id: 4397, label: 'Hartwood 4397 · sitemap (no floorplates)', level: null }
};
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CASES);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

/** Rails log window: what the CMS served between two offsets. */
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
  const completed = [...text.matchAll(/Completed (\d+) \w+ in (\d+)ms \(Views: ([\d.]+)ms \| ActiveRecord: ([\d.]+)ms(?: \(([\d]+) quer(?:y|ies)[^)]*\))?/g)].map((m) => ({ status: +m[1], ms: +m[2], views: +m[3], db: +m[4], queries: m[5] ? +m[5] : null }));
  return started.map((path, i) => ({ path: path.replace(/\?.*$/, '') + (path.includes('?') ? '?' : ''), ...(completed[i] ?? {}) }));
};

const browser = await chromium.launch({ channel: 'chrome', headless: true });

const perfOf = (page) => page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  const pick = (e) => ({ name: e.name.replace(location.origin, ''), start: Math.round(e.startTime), ttfb: Math.round(e.responseStart - e.startTime), total: Math.round(e.responseEnd - e.startTime), transfer: e.transferSize, encoded: e.encodedBodySize, decoded: e.decodedBodySize });
  const scripts = res.filter((e) => e.initiatorType === 'script' || e.name.includes('/_next/static/'));
  return {
    nav: nav ? { ttfb: Math.round(nav.responseStart), responseEnd: Math.round(nav.responseEnd), dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), transfer: nav.transferSize, encoded: nav.encodedBodySize, decoded: nav.decodedBodySize } : null,
    plan: res.filter((e) => e.name.includes('/plan-svg')).map(pick),
    api: res.filter((e) => e.name.includes('/api/') && !e.name.includes('/plan-svg')).map(pick),
    fonts: res.filter((e) => e.name.includes('fonts.g')).map(pick),
    scripts: { count: scripts.length, transfer: scripts.reduce((a, e) => a + e.transferSize, 0), decoded: scripts.reduce((a, e) => a + e.decodedBodySize, 0) },
    rsc: res.filter((e) => e.name.includes('_rsc=')).map(pick)
  };
});

const waitHydrated = (page) => page.waitForFunction(() => Array.from(document.querySelectorAll('.bo-map__tool, .bo-wf__mode, .bo-map__levels [role="tab"]')).some((n) => Object.keys(n).some((k) => k.startsWith('__reactFiber'))), null, { timeout: 180_000 });
const waitPlan = (page) => page.waitForFunction(() => !document.querySelector('.bo-map__surface .bo-loading--cover') && (document.querySelector('[data-testid="plan-svg"] svg') || (document.querySelector('.bo-map__image') && document.querySelector('.bo-map__image').complete) || document.querySelector('.bo-map__missing')), null, { timeout: 180_000 });
const planState = (page) => page.evaluate(() => ({
  svg: !!document.querySelector('[data-testid="plan-svg"] svg'),
  background: !!document.querySelector('[data-testid="plan-background"]'),
  image: !!document.querySelector('.bo-map__image'),
  missing: document.querySelector('.bo-map__missing')?.textContent?.trim().slice(0, 80) ?? null,
  plotted: document.querySelectorAll('[data-testid="plan-svg"] [data-plotted]').length,
  markers: document.querySelectorAll('.bo-map__pin, .bo-map__node, .bo-map__marker').length,
  shapes: document.querySelectorAll('[data-testid="plan-svg"] svg polygon, [data-testid="plan-svg"] svg path, [data-testid="plan-svg"] svg rect').length,
  toolbar: document.querySelector('.bo-map__toolbarsub')?.textContent?.trim() ?? null
}));

/** Client-side cost of reading the SVG the way the page does: parse, mount, bbox every plottable shape, parse again for the layer. */
const parseCost = (page, url) => page.evaluate(async (u) => {
  const t0 = performance.now();
  const r = await fetch(u, { cache: 'no-store' });
  const text = await r.text();
  const t1 = performance.now();
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
  const t2 = performance.now();
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;left:-100000px;top:0;visibility:hidden;pointer-events:none;';
  const svg = document.importNode(parsed.documentElement, true);
  host.appendChild(svg);
  document.body.appendChild(host);
  const t3 = performance.now();
  const shapes = svg.querySelectorAll('polygon[id],path[id],rect[id],circle[id],ellipse[id],polyline[id]');
  let n = 0;
  shapes.forEach((s) => { try { s.getBBox(); s.getCTM(); n += 1; } catch {} });
  const t4 = performance.now();
  document.body.removeChild(host);
  const parsed2 = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root2 = document.importNode(parsed2.documentElement, true);
  const t5 = performance.now();
  return { bytes: text.length, fetchMs: Math.round(t1 - t0), parseMs: Math.round(t2 - t1), mountMs: Math.round(t3 - t2), bboxMs: Math.round(t4 - t3), bboxShapes: n, idShapes: shapes.length, elements: svg.querySelectorAll('*').length, secondParseMs: Math.round(t5 - t4), contentEncoding: r.headers.get('content-encoding'), cacheControl: r.headers.get('cache-control') };
}, url);

for (const key of wanted) {
  const c = CASES[key];
  if (!c) continue;
  const url = `${BASE}/properties/${c.id}/map${c.level ? `?level=${encodeURIComponent(c.level)}` : ''}`;
  const run = { case: key, label: c.label, url: url.replace(BASE, ''), steps: {} };
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  await context.addCookies([
    { name: 'pyn_connect_rails_session', value: encodeURIComponent(session.rails_cookie), domain: '127.0.0.1', path: '/', httpOnly: true },
    { name: 'pyn_connect_user', value: encodeURIComponent(JSON.stringify(session.user)), domain: '127.0.0.1', path: '/', httpOnly: true }
  ]);
  const page = await context.newPage();
  const requests = [];
  page.on('request', (r) => requests.push({ url: r.url().replace(BASE, ''), method: r.method(), t: Date.now() }));

  const step = async (name, action) => {
    const mark = logSize();
    const t0 = Date.now();
    requests.length = 0;
    const out = await action(t0);
    await sleep(400);
    const rails = railsRequests(mark);
    run.steps[name] = { ...out, railsRequests: rails, browserRequests: requests.filter((r) => !r.url.includes('/_next/static/') && !r.url.includes('fonts.g')).map((r) => `${r.method} ${r.url.replace(/\?_rsc=.*$/, '?_rsc')}`) };
    console.log(`[${key}] ${name}: ${JSON.stringify({ ...out, rails: rails.map((r) => `${r.path} ${r.ms}ms (db ${r.db})`) })}`);
  };

  // 1. First open, cold browser cache.
  await step('firstOpen', async (t0) => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const tDcl = Date.now() - t0;
    await waitHydrated(page);
    const tHydrated = Date.now() - t0;
    await waitPlan(page);
    const tPlan = Date.now() - t0;
    const perf = await perfOf(page);
    return { dclMs: tDcl, hydratedMs: tHydrated, planReadyMs: tPlan, perf, plan: await planState(page) };
  });

  // Client-side parse cost of the floor SVG shown (same bytes the page read).
  const planUrl = (await perfOf(page)).plan.find((e) => !e.name.includes('background'))?.name;
  if (planUrl) run.parseCost = await parseCost(page, planUrl);
  const bgUrl = (await perfOf(page)).plan.find((e) => e.name.includes('background'))?.name;
  if (bgUrl) run.backgroundParseCost = await parseCost(page, bgUrl);

  // 2. Reload the same floor (JS cached; data and SVG re-read).
  await step('reload', async (t0) => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitHydrated(page);
    const tHydrated = Date.now() - t0;
    await waitPlan(page);
    return { hydratedMs: tHydrated, planReadyMs: Date.now() - t0, perf: await perfOf(page) };
  });

  // 3. Plotting → Wayfinding → Plotting (mode switch) when the property has the tour.
  await step('modeSwitch', async (t0) => {
    const modes = page.getByRole('tablist', { name: 'Map mode' });
    if (!(await modes.count())) return { skipped: 'no mode switch' };
    await modes.getByRole('tab', { name: 'Wayfinding' }).click();
    await waitPlan(page);
    const t1 = Date.now() - t0;
    await modes.getByRole('tab', { name: 'Plotting' }).click();
    await waitPlan(page);
    return { toWayfindingMs: t1, backMs: Date.now() - t0 };
  });

  // 4. Switch to the next floorplate, then back to the first (second visit of the first floor's SVG).
  await step('floorSwitch', async (t0) => {
    const tabs = page.getByRole('tablist', { name: 'Floorplates' }).getByRole('tab');
    const n = await tabs.count();
    if (n < 2) return { skipped: 'one floorplate' };
    const selected = await page.evaluate(() => Array.from(document.querySelectorAll('.bo-map__levels [role="tab"]')).findIndex((t) => t.getAttribute('aria-selected') === 'true'));
    const next = selected === n - 1 ? 0 : selected + 1;
    await tabs.nth(next).click();
    await waitPlan(page);
    const t1 = Date.now() - t0;
    const mid = (await perfOf(page)).plan.length;
    await tabs.nth(selected).click();
    await waitPlan(page);
    return { otherFloorMs: t1, backToFirstMs: Date.now() - t0, planRequestsAfterSwitch: mid, planRequestsTotal: (await perfOf(page)).plan.length };
  });

  // 5. Navigate away (Property Detail) and return by the browser's Back.
  await step('awayAndBack', async (t0) => {
    await page.goto(`${BASE}/properties/${c.id}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.bo-content', { timeout: 60_000 });
    const t1 = Date.now() - t0;
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await waitHydrated(page);
    await waitPlan(page);
    return { detailMs: t1, backOnMapMs: Date.now() - t0, perf: await perfOf(page) };
  });

  // 6. Document weight of the map page (HTML with the inlined RSC data).
  run.document = await page.evaluate(async (u) => {
    const r = await fetch(u, { cache: 'no-store', headers: { Accept: 'text/html' } });
    const html = await r.text();
    const flight = (html.match(/self\.__next_f\.push/g) ?? []).length;
    return { htmlBytes: html.length, flightChunks: flight, contentEncoding: r.headers.get('content-encoding') };
  }, url);

  results.push(run);
  await context.close();
}

await browser.close();
writeFileSync(`${S}/perf/perf-results.json`, JSON.stringify(results, null, 2));
console.log('written', `${S}/perf/perf-results.json`);
