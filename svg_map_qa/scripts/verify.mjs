// End-to-end verification of the SVG / dual-map / detection work on the isolated clone
// (CMS :3100 on pynwheel_audit_clone, Connect :3005 from the scratchpad copy), signed in with a minted session.
// Usage: node verify.mjs [case ...]   cases: cypress jennifer john hazel retry
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require = createRequire('/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/package.json');
const { chromium } = require('playwright');

const S = '/private/tmp/claude-501/-Users-zubairzulifqar-pynwheel-staging/6bff5f74-e6f4-4255-a23e-921645ed3527/scratchpad';
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3005';
const session = JSON.parse(readFileSync(`${S}/session.json`, 'utf8'));
const cases = process.argv.slice(2).length ? process.argv.slice(2) : ['cypress', 'jennifer', 'john', 'hazel'];
const results = [];
const log = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
await context.addCookies([
  { name: 'pyn_connect_rails_session', value: encodeURIComponent(session.rails_cookie), domain: '127.0.0.1', path: '/', httpOnly: true },
  { name: 'pyn_connect_user', value: encodeURIComponent(JSON.stringify(session.user)), domain: '127.0.0.1', path: '/', httpOnly: true }
]);
const page = await context.newPage();
const writes = [], pageErrors = [], consoleErrors = [], planRequests = [];
page.on('request', (r) => { if (r.method() !== 'GET' && r.method() !== 'HEAD') writes.push(`${r.method()} ${r.url()}`); });
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('response', async (r) => {
  const url = r.url();
  if (!url.includes('/plan-svg')) return;
  let body = '';
  try { if (!r.ok()) body = (await r.text()).slice(0, 200); } catch {}
  planRequests.push({ url: url.replace(BASE, ''), status: r.status(), type: r.headers()['content-type'] ?? '', length: r.headers()['content-length'] ?? '', body });
});

const hydrated = async () => page.waitForFunction(() => Array.from(document.querySelectorAll('.bo-map__tool, .bo-wf__mode')).some((n) => Object.keys(n).some((k) => k.startsWith('__reactFiber'))), null, { timeout: 120_000 });
const openMap = async (id) => { await page.goto(`${BASE}/properties/${id}/map`, { waitUntil: 'domcontentloaded' }); await hydrated(); };
const tab = (name) => page.getByRole('tablist', { name: 'Floorplates' }).getByRole('tab', { name });
const mode = async (which) => { await page.getByRole('tablist', { name: 'Map mode' }).getByRole('tab', { name: which }).click(); await sleep(300); };
const planState = async () => page.evaluate(() => {
  const svg = document.querySelector('[data-testid="plan-svg"] svg');
  const bg = document.querySelector('[data-testid="plan-background"]');
  const img = document.querySelector('.bo-map__image');
  const missing = document.querySelector('.bo-map__missing');
  const bgErr = document.querySelector('[data-testid="plan-background-error"]');
  const sw = Array.from(document.querySelectorAll('[data-testid="layer-switch"] button')).map((b) => `${b.textContent}:${b.getAttribute('aria-pressed')}`);
  return {
    svg: !!svg, svgViewBox: svg?.getAttribute('viewBox') ?? null, plotted: document.querySelectorAll('[data-testid="plan-svg"] [data-plotted]').length,
    background: bg ? { natural: `${bg.naturalWidth}x${bg.naturalHeight}`, box: bg.getAttribute('style') } : null,
    image: img ? { src: img.getAttribute('src')?.slice(0, 90), natural: `${img.naturalWidth}x${img.naturalHeight}` } : null,
    missing: missing ? missing.textContent.replace(/\s+/g, ' ').trim() : null, backgroundError: bgErr ? bgErr.textContent.trim() : null,
    layerSwitch: sw, toolbarSub: document.querySelector('.bo-map__toolbarsub')?.textContent ?? null,
    interFont: !!document.querySelector('link[href*="family=Inter"]'),
    planBox: document.querySelector('[data-testid="plan"]')?.getAttribute('style')?.match(/width: ?[^;]+; ?height: ?[^;]+/)?.[0] ?? null
  };
});
const waitPlan = async (ms = 180_000) => {
  await page.waitForFunction(() => !document.querySelector('.bo-map__surface .bo-loading--cover') && (document.querySelector('[data-testid="plan-svg"] svg') || (document.querySelector('.bo-map__image') && document.querySelector('.bo-map__image').complete) || document.querySelector('.bo-map__missing')), null, { timeout: ms });
  await sleep(600);
};
const waitBackground = async (ms = 180_000) => page.waitForFunction(() => { const b = document.querySelector('[data-testid="plan-background"]'); return (b && b.complete && b.naturalWidth > 0) || document.querySelector('[data-testid="plan-background-error"]') || !document.querySelector('[data-testid="plan-svg"] svg'); }, null, { timeout: ms }).catch(() => null);
const counts = async () => (await page.getByTestId('wf-counts').innerText()).replace(/\s+/g, ' ');
const detect = async (scope = /^This floorplate/) => {
  await page.getByTestId('wf-detect-button').click();
  await page.getByRole('menuitem', { name: scope }).click();
  await page.waitForFunction(() => { const t = document.querySelector('[data-testid="wf-detect-title"]'); return t && !/Detecting/.test(t.textContent); }, null, { timeout: 300_000 });
  await sleep(300);
  return { title: (await page.getByTestId('wf-detect-title').innerText()).trim(), rows: (await page.getByTestId('wf-detect-rows').innerText()).replace(/\s+/g, ' ').trim() };
};
const panelText = async () => (await page.getByTestId('wayfinding-panel').innerText()).replace(/\s+/g, ' ');
const sampleRoute = async () => {
  const sample = page.getByRole('button', { name: /Try a sample route/ });
  if (await sample.count()) await sample.first().click();
  const find = page.getByRole('button', { name: /^Find Shortest Path/ });
  if (await find.count()) await find.first().click();
  await sleep(800);
  const route = page.getByTestId('wf-route'); const err = page.getByTestId('wf-route-error');
  return { route: (await route.count()) ? (await route.first().innerText()).replace(/\s+/g, ' ').slice(0, 300) : null, error: (await err.count()) ? (await err.first().innerText()).replace(/\s+/g, ' ').slice(0, 300) : null };
};
const shot = (name) => page.screenshot({ path: `${S}/shots/${name}.png`, fullPage: false });
const clearPaths = async () => {
  await page.locator('.bo-map__toolbar').getByRole('button', { name: 'Clear Paths', exact: true }).click();
  const confirm = page.locator('[role="alertdialog"] button, [role="dialog"] button').filter({ hasText: /^Clear Paths$/ });
  await confirm.first().waitFor({ timeout: 10_000 });
  await confirm.first().click();
  await sleep(400);
};
const undo = async () => {
  const button = page.getByTestId('wf-undo');
  if (await button.isEnabled()) { await button.click(); await sleep(300); return true; }
  console.log('  (Undo disabled: ' + (await button.getAttribute('title')) + ')');
  return false;
};

try {
  if (cases.includes('cypress')) {
    await openMap(8005);
    for (const floor of [/Floor 1/, /Floor 2/, /Floor 3/]) {
      await tab(floor).click(); await waitPlan(); await waitBackground();
      const st = await planState();
      log(`8005 ${floor} plan`, st.svg && !!st.background && !st.missing, JSON.stringify(st));
    }
    await tab(/Floor 1/).click(); await waitPlan(); await waitBackground();
    await shot('8005-floor1-plotting');
    const plot = await planState();
    log('8005 Floor 1 units plotted on polygons', plot.plotted >= 100, `plotted polygons ${plot.plotted}, toolbar "${plot.toolbarSub}", Inter font ${plot.interFont}`);
    await mode('Wayfinding'); await waitPlan();
    const wfState = await planState();
    log('8005 Wayfinding stays on the SVG with the background', wfState.svg && !!wfState.background, JSON.stringify({ svg: wfState.svg, background: !!wfState.background }));
    const before = await counts();
    const card = await detect();
    log('8005 Floor 1 Detect Hallways', /Hallways detected/.test(card.title) && /shared background map/.test(card.rows), `${card.title} | ${card.rows} | before: ${before} | after: ${await counts()}`);
    await shot('8005-floor1-detected');
    const route = await sampleRoute();
    log('8005 Floor 1 shortest path', !!route.route && !route.error, JSON.stringify(route));
    await shot('8005-floor1-route');
    const again = await detect();
    log('8005 Floor 1 Detect again keeps the result', /Existing paths kept|Nothing to detect/.test(again.title), `${again.title} | ${again.rows}`);
    const undone = await undo();
    log('8005 Floor 1 Undo clears the run', undone && (await counts()).startsWith('0'), `${undone ? 'undone' : 'undo was disabled'}: ${await counts()}`);
    if (!undone) { await page.reload({ waitUntil: 'domcontentloaded' }); await hydrated(); await waitPlan(); await mode('Wayfinding'); }
    const all = await detect(/^All floorplates(?! in)/);
    log('8005 All floorplates Detect', /Hallways detected on 3/.test(all.title), `${all.title} | ${all.rows}`);
    await shot('8005-all-detected');
    await tab(/Floor 3/).click(); await waitPlan();
    const floor3 = await sampleRoute();
    log('8005 Floor 3 route after All', !!floor3.route && !floor3.error, JSON.stringify(floor3));
    await undo();
  }

  if (cases.includes('jennifer')) {
    await openMap(1412);
    await tab(/Floor 5/).click(); await waitPlan();
    const p5 = await planState();
    log('1412 Floor 5 Plotting opens on the floor image (its 54 units are plotted there)', !!p5.image && !p5.svg && p5.layerSwitch.join(',').includes('Background image:true'), JSON.stringify(p5));
    await mode('Wayfinding'); await waitPlan();
    const w5 = await planState();
    log('1412 Floor 5 Wayfinding shows the same image', !!w5.image && !w5.svg, JSON.stringify({ image: w5.image, svg: w5.svg }));
    await mode('Plotting'); await waitPlan();
    const b5 = await planState();
    log('1412 Floor 5 back to Plotting: still the image', !!b5.image && !b5.svg, JSON.stringify({ image: b5.image?.natural, svg: b5.svg }));
    await page.getByTestId('layer-switch').getByRole('button', { name: 'Floor SVG' }).click(); await waitPlan();
    const s5 = await planState();
    log('1412 Floor 5 the user can still pick the floor SVG (the unrelated Boca Raton export)', s5.svg && !s5.image, JSON.stringify({ svg: s5.svg, viewBox: s5.svgViewBox, plotted: s5.plotted, switch: s5.layerSwitch }));
    await shot('1412-floor5-svg');
    await mode('Wayfinding'); await waitPlan();
    const ws5 = await planState();
    log('1412 Floor 5 Wayfinding keeps the image, where its stored plotting is', !!ws5.image && !ws5.svg, JSON.stringify({ image: ws5.image?.natural, panel: (await panelText()).slice(0, 160) }));
    await tab(/Floors 1–3|Floors 1-3/).click(); await waitPlan();
    const f13 = await planState();
    log('1412 Floors 1–3 (flattened export) renders its SVG', f13.svg && !f13.missing, JSON.stringify({ svg: f13.svg, plotted: f13.plotted, viewBox: f13.svgViewBox }));
    const c13 = await detect();
    log('1412 Floors 1–3 Detect says no named layers', /no named layers/.test(c13.rows), `${c13.title} | ${c13.rows}`);
    await shot('1412-floors1-3-detect');
    await tab(/^.*Floor 3$|Floor 3/).first().click(); await waitPlan();
    const c3 = await detect();
    log('1412 Floor 3 (image only) Detect: skipped, no SVG', /no SVG/.test(c3.rows), `${c3.title} | ${c3.rows}`);
    await tab(/Floors 4–5|Floors 4-5/).click(); await waitPlan();
    const c45 = await detect();
    log('1412 Floors 4–5 Detect traces its walkway layer', /Hallways detected/.test(c45.title), `${c45.title} | ${c45.rows}`);
    await shot('1412-floors4-5-detected');
    await undo();
  }

  if (cases.includes('john')) {
    await openMap(1411);
    await tab(/Floor 2/).click(); await waitPlan();
    const p2 = await planState();
    log('1411 Floor 2 Plotting opens on the floor image (stored hallways live there), with the layer switch', !!p2.image && p2.layerSwitch.join(',').includes('Background image:true'), JSON.stringify(p2));
    await mode('Wayfinding'); await waitPlan();
    const kept = await detect();
    log('1411 Floor 2 Detect keeps the stored paths', /kept|Nothing to detect/i.test(kept.title + kept.rows), `${kept.title} | ${kept.rows}`);
    await clearPaths();
    const fresh = await detect();
    log('1411 Floor 2 after Clear Paths: detected from the Path layer with corridors inferred inside the outline', /Hallways detected/.test(fresh.title) && /inferred/.test(fresh.rows), `${fresh.title} | ${fresh.rows} | counts ${await counts()}`);
    await shot('1411-floor2-detected');
    const r2 = await sampleRoute();
    log('1411 Floor 2 route on the detected graph', !!r2.route && !r2.error, JSON.stringify(r2));
    const undone1 = await undo(); const undone2 = await undo();
    log('1411 Floor 2 Undo restores the stored paths', (await counts()).startsWith('3 '), `${undone1}/${undone2}: ${await counts()}`);
  }

  if (cases.includes('hazel')) {
    await openMap(1618);
    await waitPlan();
    const h = await planState();
    log('1618 Hazel Floor 1 image renders, no layer switch', !!h.image && !h.svg && h.layerSwitch.length === 0, JSON.stringify(h));
    await mode('Wayfinding'); await waitPlan();
    const before = await counts();
    const all = await detect(/^All floorplates(?! in)/);
    log('1618 Hazel All floorplates: every floorplate kept, nothing detected', /Nothing to detect|Existing paths kept/.test(all.title) && !/Detected/.test(all.rows.replace(/Kept/g, '')), `${all.title} | ${all.rows.slice(0, 300)} | ${before} → ${await counts()}`);
    const route = await sampleRoute();
    log('1618 Hazel route still works', !!route.route && !route.error, JSON.stringify(route));
    await shot('1618-hazel');
  }

  if (cases.includes('retry')) {
    await openMap(8005);
    await tab(/Floor 3/).click(); await waitPlan();
    const st = await planState();
    log('retry: Floor 3 shows the failure with its reason', !!st.missing && /answered (403|404)/.test(st.missing), st.missing);
    await shot('8005-floor3-failed');
    const count4604 = () => planRequests.filter((r) => r.url.includes('floorplate=4604')).length;
    const n = count4604();
    await page.getByRole('button', { name: 'Retry' }).click();
    const loadingSeen = await page.waitForFunction(() => /Loading the floor SVG/.test(document.querySelector('.bo-map__surface')?.textContent ?? ''), null, { timeout: 10_000 }).then(() => true).catch(() => false);
    for (let i = 0; i < 120 && count4604() === n; i += 1) await sleep(500);
    await page.waitForFunction(() => !/Loading the floor SVG/.test(document.querySelector('.bo-map__surface')?.textContent ?? ''), null, { timeout: 120_000 });
    await sleep(300);
    const n2 = count4604();
    const st2 = await planState();
    log('retry: Retry shows loading, issues a fresh request and reports again', loadingSeen && n2 === n + 1 && !!st2.missing && /answered 403/.test(st2.missing), `loading shown ${loadingSeen}; ${n} → ${n2} requests; ${st2.missing}`);
    writeFileSync(`${S}/retry-wait.flag`, 'fix the row now');
    console.log('WAITING for the floorplate row to be restored (press on: touch ' + S + '/retry-go.flag)');
    for (let i = 0; i < 120; i += 1) { try { readFileSync(`${S}/retry-go.flag`); break; } catch { await sleep(1000); } }
    await page.getByRole('button', { name: 'Retry' }).click();
    for (let i = 0; i < 120 && count4604() === n2; i += 1) await sleep(500);
    await page.waitForFunction(() => document.querySelector('[data-testid="plan-svg"] svg') || /answered|could not/.test(document.querySelector('.bo-map__missing')?.textContent ?? ''), null, { timeout: 180_000 });
    await waitPlan(); await waitBackground();
    const st3 = await planState();
    const n3 = count4604();
    log('retry: after the file is back, Retry loads the floor SVG and clears the error', st3.svg && !st3.missing && !!st3.background, `${n2} → ${n3} requests; ${JSON.stringify({ svg: st3.svg, background: !!st3.background, missing: st3.missing })}`);
    await shot('8005-floor3-recovered');
  }
} catch (error) {
  log('script', false, String(error.stack ?? error).slice(0, 600));
}

console.log('\nplan-svg requests:'); planRequests.forEach((r) => console.log(`  ${r.status} ${r.type} ${r.length}B ${r.url} ${r.body}`));
log('no non-GET requests', writes.length === 0, writes.join(', ').slice(0, 300));
log('no page errors', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 400));
log('no console errors', consoleErrors.length === 0, consoleErrors.join(' | ').slice(0, 400));
writeFileSync(`${S}/verify-results.json`, JSON.stringify({ results, planRequests, writes, pageErrors, consoleErrors }, null, 2));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
await browser.close();
