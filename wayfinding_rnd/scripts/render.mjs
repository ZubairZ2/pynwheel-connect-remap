// Render SVG files to PNG with Chrome (faithful to what the Connect canvas shows). Usage: node render.mjs out.png file1.svg [file2.svg ...] (later files overlay earlier ones)
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web/package.json');
const { chromium } = require('playwright');
const [out, ...files] = process.argv.slice(2);
const scale = Number(process.env.SCALE ?? 1.5);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1412, height: 932 }, deviceScaleFactor: scale });
const layers = files.map((f) => readFileSync(f, 'utf8').replace(/<\?xml[^>]*>/, '')).map((t) => `<div style="position:absolute;inset:0">${t.replace(/<svg /, '<svg style="width:1412px;height:932px" ')}</div>`).join('');
await page.setContent(`<html><body style="margin:0;background:#fff;position:relative;width:1412px;height:932px">${layers}</body></html>`);
await page.waitForTimeout(300);
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1412, height: 932 } });
await browser.close();
console.log('wrote', out);
