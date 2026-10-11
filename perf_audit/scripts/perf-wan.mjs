// The Map & Plotting first open under an emulated wide-area link (the owner reaches Heroku with
// ~1 s round trips) and with the Google Fonts stylesheet delayed, to see what the uncompressed
// SVG proxy, the serial request chain and the `precedence` stylesheet cost in wall-clock time.
// Usage: node perf-wan.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire('/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/package.json');
const { chromium } = require('playwright');

const S = process.env.PERF_SCRATCH ?? '<scratchpad with session.json and assets/>';
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3005';
const session = JSON.parse(readFileSync(`${S}/session.json`, 'utf8'));
const CASES = [
  { key: 'cypress', url: '/properties/8005/map', beans: true },
  { key: 'jennifer3638', url: '/properties/1412/map?level=floorplate%3A3638', beans: false },
  { key: 'john', url: '/properties/1411/map?level=floorplate%3A1867', beans: false }
];
// Emulated links: latency is the added one-way delay per request in CDP terms (ms); throughput in bytes/s.
const LINKS = {
  local: null,
  wan: { latency: 300, downloadThroughput: (4 * 1024 * 1024) / 8, uploadThroughput: (1024 * 1024) / 8 },
  slowWan: { latency: 500, downloadThroughput: (1.5 * 1024 * 1024) / 8, uploadThroughput: (512 * 1024) / 8 }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const browser = await chromium.launch({ channel: 'chrome', headless: true });

const waitHydrated = (page) => page.waitForFunction(() => Array.from(document.querySelectorAll('.bo-map__tool, .bo-wf__mode, .bo-map__levels [role="tab"]')).some((n) => Object.keys(n).some((k) => k.startsWith('__reactFiber'))), null, { timeout: 240_000 });
const waitEditor = (page) => page.waitForSelector('.bo-map__levels', { timeout: 240_000 });
const waitPlan = (page) => page.waitForFunction(() => !document.querySelector('.bo-map__surface .bo-loading--cover') && (document.querySelector('[data-testid="plan-svg"] svg') || (document.querySelector('.bo-map__image') && document.querySelector('.bo-map__image').complete) || document.querySelector('.bo-map__missing')), null, { timeout: 240_000 });
const perfOf = (page) => page.evaluate(() => {
  const nav = performance.getEntriesByType('navigation')[0];
  const res = performance.getEntriesByType('resource');
  const pick = (e) => ({ name: e.name.replace(location.origin, '').slice(0, 70), start: Math.round(e.startTime), end: Math.round(e.responseEnd), transfer: e.transferSize });
  const long = (window.__longtasks ?? []);
  return {
    nav: nav ? { ttfb: Math.round(nav.responseStart), responseEnd: Math.round(nav.responseEnd), dcl: Math.round(nav.domContentLoadedEventEnd), transfer: nav.transferSize } : null,
    plan: res.filter((e) => e.name.includes('/plan-svg')).map(pick),
    fonts: res.filter((e) => e.name.includes('fonts.g')).map(pick),
    scripts: { count: res.filter((e) => e.name.includes('/_next/static/')).length, transfer: res.filter((e) => e.name.includes('/_next/static/')).reduce((a, e) => a + e.transferSize, 0), lastEnd: Math.round(Math.max(0, ...res.filter((e) => e.name.includes('/_next/static/')).map((e) => e.responseEnd))) },
    longTasks: { count: long.length, totalMs: Math.round(long.reduce((a, t) => a + t.duration, 0)), max: Math.round(Math.max(0, ...long.map((t) => t.duration))) }
  };
});

for (const c of CASES) {
  for (const [linkName, link] of Object.entries(LINKS)) {
    for (const fonts of ['normal', 'delayed8s']) {
      if (fonts === 'delayed8s' && (linkName !== 'local')) continue;
      const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
      await context.addCookies([
        { name: 'pyn_connect_rails_session', value: encodeURIComponent(session.rails_cookie), domain: '127.0.0.1', path: '/', httpOnly: true },
        { name: 'pyn_connect_user', value: encodeURIComponent(JSON.stringify(session.user)), domain: '127.0.0.1', path: '/', httpOnly: true }
      ]);
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__longtasks = [];
        try { new PerformanceObserver((list) => list.getEntries().forEach((e) => window.__longtasks.push({ start: e.startTime, duration: e.duration }))).observe({ type: 'longtask', buffered: true }); } catch {}
      });
      if (fonts === 'delayed8s') {
        await context.route(/fonts\.googleapis\.com/, async (route) => { await sleep(8000); await route.continue(); });
      }
      if (link) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, ...link });
      }
      const t0 = Date.now();
      await page.goto(`${BASE}${c.url}`, { waitUntil: 'commit' });
      let editorMs = null;
      try { await waitEditor(page); editorMs = Date.now() - t0; } catch {}
      await waitHydrated(page);
      const hydratedMs = Date.now() - t0;
      await waitPlan(page);
      const planMs = Date.now() - t0;
      const perf = await perfOf(page);
      const row = { case: c.key, link: linkName, fonts, editorVisibleMs: editorMs, hydratedMs, planReadyMs: planMs, perf };
      results.push(row);
      console.log(JSON.stringify(row));
      await context.close();
    }
  }
}
await browser.close();
writeFileSync(`${S}/perf/perf-wan-results.json`, JSON.stringify(results, null, 2));
console.log('written');
