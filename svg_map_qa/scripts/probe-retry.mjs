import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/package.json');
const { chromium } = require('playwright');
const S = '/private/tmp/claude-501/-Users-zubairzulifqar-pynwheel-staging/6bff5f74-e6f4-4255-a23e-921645ed3527/scratchpad';
const BASE = 'http://127.0.0.1:3005';
const session = JSON.parse(readFileSync(`${S}/session.json`, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
await context.addCookies([
  { name: 'pyn_connect_rails_session', value: encodeURIComponent(session.rails_cookie), domain: '127.0.0.1', path: '/', httpOnly: true },
  { name: 'pyn_connect_user', value: encodeURIComponent(JSON.stringify(session.user)), domain: '127.0.0.1', path: '/', httpOnly: true }
]);
const page = await context.newPage();
page.on('request', (r) => { if (r.url().includes('plan-svg')) console.log('  REQUEST', new Date().toISOString().slice(11, 23), r.url().replace(BASE, '')); });
page.on('response', (r) => { if (r.url().includes('plan-svg')) console.log('  RESPONSE', new Date().toISOString().slice(11, 23), r.status(), r.url().replace(BASE, '')); });
page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[probe]')) console.log('  CONSOLE', m.type(), m.text().slice(0, 160)); });
const hydrated = () => page.waitForFunction(() => Array.from(document.querySelectorAll('.bo-map__tool, .bo-wf__mode')).some((n) => Object.keys(n).some((k) => k.startsWith('__reactFiber'))), null, { timeout: 120_000 });
const text = () => page.evaluate(() => document.querySelector('.bo-map__surface')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 200));
await page.goto(`${BASE}/properties/8005/map`, { waitUntil: 'domcontentloaded' }); await hydrated();
await page.getByRole('tablist', { name: 'Floorplates' }).getByRole('tab', { name: /Floor 3/ }).click();
await page.waitForFunction(() => /answered|could not/.test(document.querySelector('.bo-map__surface')?.textContent ?? ''), null, { timeout: 120_000 });
console.log('state:', await text());
const retry = page.getByRole('button', { name: 'Retry' });
console.log('retry buttons', await retry.count());
await retry.first().click();
for (let i = 0; i < 8; i += 1) { await sleep(500); console.log(`  +${(i + 1) * 0.5}s:`, await text()); }
await page.screenshot({ path: `${S}/shots/probe-retry.png` });
await browser.close();
