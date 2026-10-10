// Probe: Clear Paths dialog on John Demo Floor 2, and the Undo tip through the Cypress Terra detect → route → detect-again flow.
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
const hydrated = () => page.waitForFunction(() => Array.from(document.querySelectorAll('.bo-map__tool, .bo-wf__mode')).some((n) => Object.keys(n).some((k) => k.startsWith('__reactFiber'))), null, { timeout: 120_000 });
const waitPlan = async () => { await page.waitForFunction(() => !document.querySelector('.bo-map__surface .bo-loading--cover') && (document.querySelector('[data-testid="plan-svg"] svg') || (document.querySelector('.bo-map__image') && document.querySelector('.bo-map__image').complete) || document.querySelector('.bo-map__missing')), null, { timeout: 180_000 }); await sleep(500); };
const tab = (name) => page.getByRole('tablist', { name: 'Floorplates' }).getByRole('tab', { name });
const mode = async (w) => { await page.getByRole('tablist', { name: 'Map mode' }).getByRole('tab', { name: w }).click(); await sleep(300); };
const undoTip = async () => `${await page.getByTestId('wf-undo').isEnabled()} "${await page.getByTestId('wf-undo').getAttribute('title')}"`;
const counts = async () => (await page.getByTestId('wf-counts').innerText()).replace(/\s+/g, ' ');
const detect = async (scope = /^This floorplate/) => { await page.getByTestId('wf-detect-button').click(); await page.getByRole('menuitem', { name: scope }).click(); await page.waitForFunction(() => { const t = document.querySelector('[data-testid="wf-detect-title"]'); return t && !/Detecting/.test(t.textContent); }, null, { timeout: 300_000 }); await sleep(300); return (await page.getByTestId('wf-detect-title').innerText()).trim(); };

// 1. John Demo: Clear Paths
await page.goto(`${BASE}/properties/1411/map`, { waitUntil: 'domcontentloaded' }); await hydrated();
await tab(/Floor 2/).click(); await waitPlan(); await mode('Wayfinding'); await waitPlan();
console.log('1411 counts', await counts(), '| undo', await undoTip());
const clear = page.locator('.bo-map__toolbar').getByRole('button', { name: 'Clear Paths', exact: true });
console.log('Clear Paths button count', await clear.count(), 'enabled', await clear.first().isEnabled().catch(() => 'n/a'), 'title', await clear.first().getAttribute('title').catch(() => 'n/a'));
await clear.first().click(); await sleep(800);
console.log('alertdialog count', await page.getByRole('alertdialog').count(), '| dialog count', await page.getByRole('dialog').count(), '| confirm texts', await page.locator('[role="alertdialog"] button, [role="dialog"] button').allInnerTexts());
await page.screenshot({ path: `${S}/shots/probe-1411-clear.png` });
const confirmBtn = page.locator('[role="alertdialog"] button, [role="dialog"] button').filter({ hasText: /Clear Paths/ });
if (await confirmBtn.count()) { await confirmBtn.first().click(); await sleep(400); console.log('after clear:', await counts(), '| undo', await undoTip()); }
const t1 = await detect(); console.log('detect after clear:', t1, '|', (await page.getByTestId('wf-detect-rows').innerText()).replace(/\s+/g, ' ').slice(0, 260), '| counts', await counts(), '| undo', await undoTip());
await page.screenshot({ path: `${S}/shots/probe-1411-detected.png` });
const sample = page.getByRole('button', { name: /Try a sample route/ }); if (await sample.count()) await sample.first().click();
const find = page.getByRole('button', { name: /^Find Shortest Path/ }); if (await find.count()) await find.first().click(); await sleep(800);
console.log('route:', ((await page.getByTestId('wf-route').allInnerTexts()).join(' ') || (await page.getByTestId('wf-route-error').allInnerTexts()).join(' ')).replace(/\s+/g, ' ').slice(0, 200), '| undo', await undoTip());
await page.getByTestId('wf-undo').click().catch(() => null); await sleep(300); console.log('after undo 1:', await counts(), '| undo', await undoTip());
await page.getByTestId('wf-undo').click().catch(() => null); await sleep(300); console.log('after undo 2:', await counts(), '| undo', await undoTip());

// 2. Cypress Terra: undo tip through detect → route → detect again
await page.goto(`${BASE}/properties/8005/map`, { waitUntil: 'domcontentloaded' }); await hydrated(); await waitPlan(); await mode('Wayfinding'); await waitPlan();
console.log('8005 start undo', await undoTip());
console.log('8005 detect:', await detect(), '| undo', await undoTip());
const s2 = page.getByRole('button', { name: /Try a sample route/ }); if (await s2.count()) await s2.first().click();
console.log('8005 after sample fill undo', await undoTip());
const f2 = page.getByRole('button', { name: /^Find Shortest Path/ }); if (await f2.count()) await f2.first().click(); await sleep(800);
console.log('8005 after route undo', await undoTip());
console.log('8005 detect again:', await detect(), '| undo', await undoTip());
await browser.close();
