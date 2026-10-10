import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Map & Plotting's canvas (the October 1 brief): the Manual Plot control's
 * states, the zoom control and its viewport, the legacy markers and pathway
 * graph on a floor image, and the polygon labels of a floor SVG. Driven
 * against a running CMS with a minted Devise session (PYN_CONNECT_PROGRESS.md
 * §7); skipped without one:
 *
 *   PYN_CONNECT_E2E_RAILS_COOKIE    the `rails_cookie` value the mint script prints
 *   PYN_CONNECT_E2E_USER            the `user` JSON it prints
 *   PYNWHEEL_CMS_URL                the CMS the app talks to (default http://127.0.0.1:3000)
 *   PYN_CONNECT_E2E_HAZEL           a property with floor images and hallways (default 1618, Hazel)
 *   PYN_CONNECT_E2E_PROPERTY        a property with a floor SVG (default 1468)
 *
 * The label tests serve `fixtures/floor-labels.svg` — a file in the shape of
 * the CMS's real floor exports (a `Units` layer of room groups with their
 * printed numbers, an `Amenities` layer, artwork text) — in place of the SVG
 * property's first floor, so what the canvas prints can be asserted exactly
 * whichever dump the CMS runs on. Marker colours, sizes and counts are read
 * from the CMS's own JSON. Every test ends on the same assertion: the browser
 * sent nothing but GETs.
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const CMS = (process.env.PYNWHEEL_CMS_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const HAZEL = process.env.PYN_CONNECT_E2E_HAZEL ?? '1618';
const SVG_PROPERTY = process.env.PYN_CONNECT_E2E_PROPERTY ?? '1468';

const FIXTURE_SVG = readFileSync(join(__dirname, 'fixtures', 'floor-labels.svg'), 'utf8');

type Json = Record<string, unknown>;

/**
 * Since October 10, 2026 a floorplate with both files opens on the frame its
 * stored plotting lives in (the floor image for most of the dump's SVG
 * properties); these tests are about the floor SVG, so they pick it.
 */
const pickFloorSvg = async (page: Page) => {
  const button = page.getByTestId('layer-switch').getByRole('button', { name: 'Floor SVG' });
  if (await button.count()) await button.click();
};

test.describe('Map & Plotting canvas (real data)', () => {
  test.skip(!railsCookie || !user, 'PYN_CONNECT_E2E_RAILS_COOKIE / PYN_CONNECT_E2E_USER not set');

  const cms = async (path: string): Promise<Json> => {
    const response = await fetch(`${CMS}${path}`, { headers: { Cookie: railsCookie!, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${path} answered ${response.status}`);
    return (await response.json()) as Json;
  };

  const signIn = async (page: Page) => {
    const origin = new URL(String(test.info().project.use.baseURL ?? 'http://127.0.0.1:3001'));
    await page.context().addCookies([
      { name: 'pyn_connect_rails_session', value: encodeURIComponent(railsCookie!), domain: origin.hostname, path: '/', httpOnly: true },
      { name: 'pyn_connect_user', value: encodeURIComponent(user!), domain: origin.hostname, path: '/', httpOnly: true }
    ]);
  };

  const hydrated = async (page: Page) => {
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.bo-map__tool')).some((node) => Object.keys(node).some((key) => key.startsWith('__reactFiber'))),
      null,
      { timeout: 90_000 }
    );
  };

  const audit = (page: Page) => {
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    return () => {
      expect(errors, 'page errors').toEqual([]);
      expect(writes, 'non-GET requests').toEqual([]);
    };
  };

  const plan = (page: Page) => page.getByTestId('plan');
  const scaleOf = async (page: Page) => Number(await plan(page).getAttribute('data-scale'));
  const zoomIn = (page: Page) => page.getByRole('button', { name: 'Zoom in' });
  const zoomOut = (page: Page) => page.getByRole('button', { name: 'Zoom out' });
  const resetView = (page: Page) => page.getByRole('button', { name: 'Reset view' });
  const manualPlot = (page: Page) => page.getByRole('button', { name: /^Manual Plot/ });

  /** Where an element sits inside the plan, as fractions of the plan's box: the same before and after any zoom or pan when it is attached. */
  const relativeTo = async (element: Locator, container: Locator) => {
    const [box, outer] = await Promise.all([element.boundingBox(), container.boundingBox()]);
    if (!box || !outer) throw new Error('element or plan not laid out');
    return [((box.x + box.width / 2 - outer.x) / outer.width).toFixed(3), ((box.y + box.height / 2 - outer.y) / outer.height).toFixed(3)];
  };

  const styles = (button: Locator) =>
    button.evaluate((element) => {
      const own = getComputedStyle(element);
      const pill = getComputedStyle(element.querySelector('.bo-map__toolpill')!);
      return { bg: own.backgroundColor, color: own.color, border: own.borderTopColor, pillColor: pill.color, outline: own.outlineStyle };
    });

  /** A colour the CMS sends (`#d37474`, `rgba(247, 0, 0, 0.61)`) as the browser reports it. */
  const cssColor = (page: Page, value: string) =>
    page.evaluate((v) => {
      const probe = document.createElement('span');
      probe.style.color = v;
      document.body.appendChild(probe);
      const out = getComputedStyle(probe).color;
      probe.remove();
      return out;
    }, value);

  /* ---------------- Manual Plot ---------------- */

  test('Manual Plot: OFF, OFF + hover, ON, ON + hover and focus each read; the ON text never loses contrast', async ({ page }) => {
    const clean = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/map`);
    await hydrated(page);
    const button = manualPlot(page);

    await page.mouse.move(2, 2);
    const off = await styles(button);
    expect(off.bg).toBe('rgb(255, 255, 255)');
    expect(off.color).toBe('rgb(23, 26, 33)');

    await button.hover();
    const offHover = await styles(button);
    expect(offHover.bg).toBe('rgb(255, 255, 255)');
    expect(offHover.color).toBe('rgb(0, 119, 174)');
    expect(offHover.border).toBe('rgb(0, 119, 174)');

    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await page.mouse.move(2, 2);
    const on = await styles(button);
    expect(on.bg).toBe('rgb(0, 119, 174)');
    expect(on.color).toBe('rgb(255, 255, 255)');
    expect(on.pillColor).toBe('rgb(255, 255, 255)');

    // The bug of the brief: ON + hover used to paint the text in the background's own blue.
    await button.hover();
    const onHover = await styles(button);
    expect(onHover.color).toBe('rgb(255, 255, 255)');
    expect(onHover.bg).not.toBe(onHover.color);
    expect(onHover.bg).toBe('rgb(0, 95, 140)');
    expect(onHover.pillColor).toBe('rgb(255, 255, 255)');

    // Keyboard focus draws the focus ring; the text stays white.
    await page.mouse.move(2, 2);
    await page.getByRole('button', { name: 'Auto Plot', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(button).toBeFocused();
    const focused = await styles(button);
    expect(focused.outline).toBe('solid');
    expect(focused.color).toBe('rgb(255, 255, 255)');

    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    clean();
  });

  /* ---------------- Zoom ---------------- */

  test('Zoom: + and − step by 1.3 about the centre, stop at the limits, Reset restores the fitted plan, floors open fitted', async ({ page }) => {
    const clean = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/map`);
    await hydrated(page);
    await expect(page.locator('.bo-map__image')).toBeVisible();
    await expect(page.locator('.bo-map__pin').first()).toBeVisible();

    expect(await scaleOf(page)).toBe(1);
    await expect(resetView(page)).toBeDisabled();
    const fitted = (await plan(page).boundingBox())!;
    const pin = page.locator('.bo-map__pin').first();
    const node = page.locator('.bo-map__node--hallway').first();
    const before = { pin: await relativeTo(pin, plan(page)), node: await relativeTo(node, plan(page)) };

    await zoomIn(page).click();
    expect(await scaleOf(page)).toBeCloseTo(1.3, 3);
    const zoomed = (await plan(page).boundingBox())!;
    expect(zoomed.width / fitted.width).toBeCloseTo(1.3, 1);
    // Zoomed about the centre: the plan's centre did not move.
    expect(Math.abs(zoomed.x + zoomed.width / 2 - (fitted.x + fitted.width / 2))).toBeLessThan(1.5);
    // Pins and nodes stay on their points.
    expect(await relativeTo(pin, plan(page))).toEqual(before.pin);
    expect(await relativeTo(node, plan(page))).toEqual(before.node);
    await expect(resetView(page)).toBeEnabled();

    for (let i = 0; i < 12 && !(await zoomIn(page).isDisabled()); i += 1) await zoomIn(page).click();
    expect(await scaleOf(page)).toBe(8);
    await expect(zoomIn(page)).toBeDisabled();
    await expect(zoomOut(page)).toBeEnabled();

    for (let i = 0; i < 20 && !(await zoomOut(page).isDisabled()); i += 1) await zoomOut(page).click();
    expect(await scaleOf(page)).toBe(0.5);
    await expect(zoomOut(page)).toBeDisabled();
    await expect(zoomIn(page)).toBeEnabled();

    await resetView(page).click();
    expect(await scaleOf(page)).toBe(1);
    const restored = (await plan(page).boundingBox())!;
    expect(Math.abs(restored.x - fitted.x)).toBeLessThan(1);
    expect(Math.abs(restored.width - fitted.width)).toBeLessThan(1);
    await expect(resetView(page)).toBeDisabled();
    // Reset is a view change: the same floor, the same pins, no request.
    expect(await relativeTo(pin, plan(page))).toEqual(before.pin);

    // A different floor opens fitted; coming back too.
    await zoomIn(page).click();
    await zoomIn(page).click();
    const tabs = page.locator('.bo-map__levels [role="tab"]');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => scaleOf(page)).toBe(1);
    await tabs.nth(0).click();
    await expect.poll(() => scaleOf(page)).toBe(1);
    clean();
  });

  test('Zoom: the wheel zooms about the pointer without scrolling the page, and dragging the canvas pans it', async ({ page }) => {
    const clean = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/map`);
    await hydrated(page);
    await expect(page.locator('.bo-map__pin').first()).toBeVisible();
    const surface = (await page.getByTestId('plan-surface').boundingBox())!;
    const scrollBefore = await page.evaluate(() => window.scrollY);

    // Zoom in about a point left of centre: the plan grows and shifts right, the point under the pointer stays put.
    const point = { x: surface.x + surface.width * 0.3, y: surface.y + surface.height * 0.4 };
    const before = (await plan(page).boundingBox())!;
    const under = { x: (point.x - before.x) / before.width, y: (point.y - before.y) / before.height };
    await page.mouse.move(point.x, point.y);
    await page.mouse.wheel(0, -300);
    await expect.poll(() => scaleOf(page)).toBeGreaterThan(1);
    const after = (await plan(page).boundingBox())!;
    expect(Math.abs(after.x + under.x * after.width - point.x)).toBeLessThan(2);
    expect(Math.abs(after.y + under.y * after.height - point.y)).toBeLessThan(2);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

    // Drag the empty canvas: the plan follows the pointer.
    const start = { x: surface.x + surface.width * 0.6, y: surface.y + surface.height * 0.6 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 80, start.y + 50, { steps: 6 });
    await page.mouse.up();
    const panned = (await plan(page).boundingBox())!;
    expect(Math.round(panned.x - after.x)).toBe(80);
    expect(Math.round(panned.y - after.y)).toBe(50);

    // Wheel out past the fitted size, down to the minimum.
    for (let i = 0; i < 20; i += 1) await page.mouse.wheel(0, 600);
    await expect.poll(() => scaleOf(page)).toBe(0.5);
    await resetView(page).click();
    expect(await scaleOf(page)).toBe(1);
    clean();
  });

  /* ---------------- Markers and paths on a floor image ---------------- */

  test('Floor image: the legacy markers in the theme colours, the door plus, the hallway nodes and 1px paths, no coordinate text', async ({ page }) => {
    const [floorplates, wayfinding, units, amenities] = await Promise.all([
      cms(`/communities/${HAZEL}/floorplates.json`),
      cms(`/automate_plotting.json?community_id=${HAZEL}`),
      cms(`/communities/${HAZEL}/units.json`),
      cms(`/communities/${HAZEL}/amenities.json`)
    ]);
    // The screen opens on the lowest floor, as the strip orders floorplates.
    const lowest = (row: Json) => Math.min(...(((row.floors as number[]) ?? []).length ? (row.floors as number[]) : [Number.POSITIVE_INFINITY]));
    const plates = (floorplates.data as Json[]).slice().sort((a, b) => lowest(a) - lowest(b));
    const meta = floorplates.meta as Json;
    const markers = meta.markers as Json;
    expect(typeof markers.unit_color).toBe('string');
    expect(typeof markers.unit_size).toBe('number');
    const graph = ((wayfinding.data as Json | undefined) ?? wayfinding) as Json;
    // The first floorplate's stored hallway nodes and links, and its plotted units and amenities.
    const first = plates[0];
    const hallways = ((graph.hallways as Json[]) ?? []).filter((row) => row.parent_type === 'Floorplate' && Number(row.parent_id) === Number(first.id));
    const links = hallways.reduce((sum, row) => sum + ((row.next_points as number[]) ?? []).length, 0);
    const plottedUnits = (units.data as Json[]).filter((row) => Number(row.floorplate_id) === Number(first.id) && Number(row.x_plot) > 0);
    const plottedAmenities = (amenities.data as Json[]).filter(
      (row) => row.owner_type === 'Floorplate' && Number(row.owner_id) === Number(first.id) && Number(row.x_plot) > 0
    );

    const clean = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/map`);
    await hydrated(page);
    await expect(page.locator('.bo-map__image')).toBeVisible();

    await expect(page.locator('.bo-map__pin--unit')).toHaveCount(plottedUnits.length);
    await expect(page.locator('.bo-map__pin--amenity')).toHaveCount(plottedAmenities.length);
    await expect(page.locator('.bo-map__node--hallway')).toHaveCount(hallways.length);
    // Two lines per link (a wide hit line and the drawn 1px black line), as the legacy page drew them.
    await expect(page.locator('.bo-map__edges line')).toHaveCount(links * 2);
    const drawn = page.locator('.bo-map__edges line:not(.bo-map__edgehit)').first();
    if (links > 0) {
      await expect(drawn).toHaveAttribute('stroke', '#000000');
      await expect(drawn).toHaveAttribute('stroke-width', '1');
    }

    // Colours come from the property's theme (floorplates.json meta.markers), not from a palette of the app's.
    if (plottedUnits.length) {
      const glyph = page.locator('.bo-map__pin--unit .bo-map__glyph--tip path').first();
      expect(await glyph.evaluate((element) => getComputedStyle(element).fill)).toBe(await cssColor(page, String(markers.unit_color)));
    }
    if (plottedAmenities.length) {
      const square = page.locator('.bo-map__pin--amenity .bo-map__amenitybox').first();
      expect(await square.evaluate((element) => getComputedStyle(element).borderTopColor)).toBe(await cssColor(page, String(markers.amenity_color)));
    }
    // The green door plus hangs beside a marker only while the property runs auto wayfinding and the item has no door yet.
    const expectPlus = markers.auto_wayfinding === true && (amenities.meta as Json).self_tour === true;
    const withoutDoor = [...plottedUnits, ...plottedAmenities].filter((row) => row.door_id == null && !((graph.doors as Json[]) ?? []).some((door) => Number(door.attached_with_id) === Number(row.id))).length;
    if (expectPlus) await expect(page.locator('.bo-map__markerplus')).toHaveCount(withoutDoor);

    // No permanent label chips or coordinates on the map; a selected marker names itself.
    await expect(page.locator('.bo-map__nodelabel')).toHaveCount(0);
    expect(await page.getByTestId('plan-surface').innerText()).not.toMatch(/\d+\s*[,·]\s*\d+\s*(px)?/);
    const node = page.locator('.bo-map__node--hallway').first();
    if (hallways.length) {
      await node.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
      await expect(page.locator('.bo-map__node--selected')).toHaveCount(1);
      await expect(page.locator('.bo-map__node--selected .bo-map__nodelabel')).toHaveCount(1);
    }
    clean();
  });

  /* ---------------- Labels on a floor SVG ---------------- */

  test('Floor SVG: polygons are named by the SVG’s own text, amenity layers are plottable, generated ids never show, artwork text stays', async ({ page }) => {
    const floorplates = await cms(`/communities/${SVG_PROPERTY}/floorplates.json`);
    const plate = (floorplates.data as Json[]).find((row) => row.svg != null);
    test.skip(!plate, `property ${SVG_PROPERTY} has no floor SVG in this dump`);
    const clean = audit(page);
    await signIn(page);
    await page.route(new RegExp(`/api/properties/${SVG_PROPERTY}/plan-svg\\?floorplate=${plate!.id}`), (route) =>
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: FIXTURE_SVG })
    );
    await page.goto(`/properties/${SVG_PROPERTY}/map?level=floorplate:${plate!.id}`);
    await hydrated(page);
    await pickFloorSvg(page);
    const svg = page.getByTestId('plan-svg');
    await expect(svg.locator('svg')).toHaveCount(1, { timeout: 60_000 });

    // The SVG's own text is the label: the room numbers, the amenity names, the artwork.
    await expect(svg.locator('text')).toHaveCount(7);
    await expect(svg.locator('text[id="TENANT_LEASE_SPACE_2"]')).toHaveText(/TENANT LEASE SPACE/);
    await expect(svg.locator('text[id="GALILEO_WAY"]')).toHaveText(/GALILEO WAY/);
    // Nothing plotted yet, so nothing is printed over the SVG.
    await expect(page.locator('.bo-map__polylabel')).toHaveCount(0);

    // Manual Plot onto room 102 (its polygon's own id is the generated Vector_2651): the popover and toast name it 102.
    const item = page.locator('.bo-map__plotrow').first();
    const itemName = (await item.locator('.bo-map__plotname').innerText()).trim();
    await item.locator('.bo-map__plotpick').click();
    await manualPlot(page).click();
    const room102 = svg.locator('polygon[id="Vector_2651"]');
    await room102.dispatchEvent('pointermove', { bubbles: true, pointerId: 1 });
    await room102.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await expect(page.locator('[data-plotted]')).toHaveCount(1);
    await expect(room102).toHaveAttribute('data-plotted', '');
    await manualPlot(page).click();
    // Nothing is printed over a plotted polygon: the filled shape is the placement and the SVG's own "102" its label.
    await expect(page.locator('.bo-map__polylabel')).toHaveCount(0);
    await expect(page.locator('.bo-map__polypop')).toHaveCount(0);
    const surface = (await page.getByTestId('plan-surface').boundingBox())!;
    const leavePlan = () => page.mouse.move(surface.x + 4, surface.y + surface.height - 4);

    // Hovering the plotted polygon shows what a click shows — the same popover, with the item and its Unplot — and leaving hides it.
    await room102.hover({ force: true });
    await expect(page.locator('.bo-map__polypop[data-peek="1"]')).toHaveCount(1);
    await expect(page.locator('.bo-map__polypoptitle')).toHaveText('Polygon 102');
    await expect(page.locator('.bo-map__polypop')).toContainText(itemName);
    await expect(page.locator('.bo-map__polypop .bo-map__unplot')).toHaveCount(1);
    await leavePlan();
    await expect(page.locator('.bo-map__polypop')).toHaveCount(0);
    // An unplotted polygon has nothing to show on hover.
    const room103 = svg.locator('polygon[id="Vector_2652"]');
    await room103.hover({ force: true });
    await expect(page.locator('.bo-map__polypop')).toHaveCount(0);
    await leavePlan();
    // A click pins the popover open; it does not scale with the plan.
    await room102.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await expect(page.locator('.bo-map__polypop:not([data-peek])')).toHaveCount(1);
    await expect(page.locator('.bo-map__polypoptitle')).toHaveText('Polygon 102');
    const popoverBefore = (await page.locator('.bo-map__polypop').boundingBox())!;
    await zoomIn(page).click();
    const popoverAfter = (await page.locator('.bo-map__polypop').boundingBox())!;
    expect(Math.abs(popoverAfter.width - popoverBefore.width)).toBeLessThan(1);
    await resetView(page).click();
    await page.locator('.bo-map__polypop .bo-map__dismiss').click();
    await expect(page.locator('.bo-map__polypop')).toHaveCount(0);

    // Room 103 prints no number of its own: its code prints while it is the hovered drop target, and never stays.
    const second = page.locator('.bo-map__plotrow').first();
    const secondName = (await second.locator('.bo-map__plotname').innerText()).trim();
    await second.locator('.bo-map__plotpick').click();
    await manualPlot(page).click();
    await room103.dispatchEvent('pointermove', { bubbles: true, pointerId: 1 });
    await expect(page.locator('.bo-map__polycode')).toHaveText(['103']);
    expect((await page.locator('.bo-map__polylabels').allInnerTexts()).join(' ')).not.toMatch(/Vector/);
    await room103.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await expect(page.locator('[data-plotted]')).toHaveCount(2);
    await manualPlot(page).click();
    await leavePlan();
    await expect(page.locator('.bo-map__polylabel')).toHaveCount(0);
    // Hovering it again names it and lists what sits on it.
    await room103.hover({ force: true });
    await expect(page.locator('.bo-map__polycode')).toHaveText(['103']);
    await expect(page.locator('.bo-map__polypop')).toContainText(secondName);
    await leavePlan();
    await expect(page.locator('.bo-map__polypop')).toHaveCount(0);
    await expect(page.locator('.bo-map__polylabel')).toHaveCount(0);

    // The amenities layer's spaces are polygons too, named by their text; the artwork rectangle is not.
    const pool = svg.locator('g[id="POOL"] > polygon');
    await pool.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await expect(page.locator('.bo-map__polypoptitle')).toHaveText('Polygon POOL');
    await page.locator('.bo-map__polypop .bo-map__dismiss').click();
    await svg.locator('rect[id="Vector_9"]').dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await expect(page.locator('.bo-map__polypop')).toHaveCount(0);

    // The SVG's text follows its polygon through zoom, pan and a resize, and nothing of ours is printed over the plan meanwhile.
    const textBefore = await relativeTo(svg.locator('text[id="102_2"]'), plan(page));
    await zoomIn(page).click();
    await zoomIn(page).click();
    expect(await relativeTo(svg.locator('text[id="102_2"]'), plan(page))).toEqual(textBefore);
    await expect(page.locator('.bo-map__polylabel')).toHaveCount(0);
    await page.mouse.move(surface.x + surface.width * 0.7, surface.y + surface.height * 0.7);
    await page.mouse.down();
    await page.mouse.move(surface.x + surface.width * 0.5, surface.y + surface.height * 0.5, { steps: 5 });
    await page.mouse.up();
    expect(await relativeTo(svg.locator('text[id="102_2"]'), plan(page))).toEqual(textBefore);
    await page.setViewportSize({ width: 1100, height: 900 });
    // The plan is refitted to whole pixels at the new size, so the ratio may move by a thousandth; the text must not move relative to the plan.
    const close = (a: string[], b: string[]) => a.length === b.length && a.every((value, i) => Math.abs(Number(value) - Number(b[i])) <= 0.002);
    await expect.poll(async () => close(await relativeTo(svg.locator('text[id="102_2"]'), plan(page)), textBefore)).toBe(true);
    await page.setViewportSize({ width: 1440, height: 960 });
    await leavePlan();
    await expect(page.locator('.bo-map__polylabel')).toHaveCount(0);

    // The other floor, and back: the plotted state is still there, and still nothing is printed permanently.
    const tabs = page.locator('.bo-map__levels [role="tab"]');
    if ((await tabs.count()) > 1) {
      const current = await tabs.evaluateAll((nodes) => nodes.findIndex((node) => node.getAttribute('aria-selected') === 'true'));
      await tabs.nth(current === 0 ? 1 : 0).click();
      await expect(tabs.nth(current === 0 ? 1 : 0)).toHaveAttribute('aria-selected', 'true');
      await tabs.nth(current).click();
      await expect(svg.locator('svg')).toHaveCount(1, { timeout: 60_000 });
      await expect(page.locator('[data-plotted]')).toHaveCount(2);
      await expect(page.locator('.bo-map__polylabel')).toHaveCount(0);
      await expect(page.locator('.bo-map__polypop')).toHaveCount(0);
    }
    clean();
  });

  test('Floor SVG: a real floor file mounts with its polygons and the stored placements fill them, nothing else drawn on top', async ({ page }) => {
    // The real file is 2.6 MB and comes through the plan-svg proxy from S3: several seconds on its own.
    test.setTimeout(180_000);
    const [floorplates, units] = await Promise.all([cms(`/communities/${SVG_PROPERTY}/floorplates.json`), cms(`/communities/${SVG_PROPERTY}/units.json`)]);
    const plate = (floorplates.data as Json[]).find((row) => row.svg != null);
    test.skip(!plate, `property ${SVG_PROPERTY} has no floor SVG in this dump`);
    const pointers = (units.data as Json[]).filter((row) => Number(row.floorplate_id) === Number(plate!.id) && row.svg_pointer != null);
    const clean = audit(page);
    await signIn(page);
    await page.goto(`/properties/${SVG_PROPERTY}/map?level=floorplate:${plate!.id}`);
    await hydrated(page);
    await pickFloorSvg(page);
    const svg = page.getByTestId('plan-svg');
    await expect(svg.locator('svg')).toHaveCount(1, { timeout: 120_000 });
    expect(await svg.locator('polygon[id], path[id], rect[id]').count()).toBeGreaterThan(0);
    // Each stored pointer fills one shape; no marker sits on a filled polygon; the file's own text is untouched.
    await expect(page.locator('[data-plotted]')).toHaveCount(pointers.length, { timeout: 30_000 });
    await expect(page.locator('.bo-map__pin')).toHaveCount(0);
    // The label container is only rendered while something is hovered or selected; read it without waiting for it.
    expect((await page.locator('.bo-map__polylabels').allInnerTexts()).join(' ')).not.toMatch(/Vector|_x3/);
    clean();
  });
});
