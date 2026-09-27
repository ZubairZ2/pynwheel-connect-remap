import { expect, test, type Page } from '@playwright/test';

/**
 * Map & Plotting on real data, driven against a running CMS with a minted
 * Devise session (PYN_CONNECT_PROGRESS.md §7). The spec skips itself when the
 * session is not provided:
 *
 *   PYN_CONNECT_E2E_RAILS_COOKIE   the `rails_cookie` value the mint script prints
 *   PYN_CONNECT_E2E_USER           the `user` JSON it prints
 *   PYN_CONNECT_E2E_PROPERTY       a property with floor SVGs and a pathway graph (default 1468)
 *   PYN_CONNECT_E2E_RASTER_PROPERTY a property with floor images only (default 2919)
 *
 * Every interaction the screen offers is exercised — the building pills and
 * floorplate tabs, Manual Plot onto a real polygon, the Auto Plot wizard's
 * four steps over the real PMS numbers and polygon ids, the pathway tools,
 * the dialogs — and the assertion that matters most is the last: the
 * browser sent nothing but GETs.
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const svgProperty = process.env.PYN_CONNECT_E2E_PROPERTY ?? '1468';
const rasterProperty = process.env.PYN_CONNECT_E2E_RASTER_PROPERTY ?? '2919';

test.describe('Map & Plotting (real data)', () => {
  test.skip(!railsCookie || !user, 'PYN_CONNECT_E2E_RAILS_COOKIE / PYN_CONNECT_E2E_USER not set');

  const signIn = async (page: Page) => {
    const origin = new URL(String(test.info().project.use.baseURL ?? 'http://127.0.0.1:3001'));
    await page.context().addCookies([
      { name: 'pyn_connect_rails_session', value: encodeURIComponent(railsCookie!), domain: origin.hostname, path: '/', httpOnly: true },
      { name: 'pyn_connect_user', value: encodeURIComponent(user!), domain: origin.hostname, path: '/', httpOnly: true }
    ]);
  };

  const hydrated = async (page: Page) => {
    await page.waitForFunction(() => {
      const button = document.querySelector('.bo-map__tool');
      return !!button && Object.keys(button).some((key) => key.startsWith('__reactFiber'));
    });
  };

  const audit = (page: Page) => {
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    return { writes, errors };
  };

  test('plots onto the real floor SVG polygons and runs the Auto Plot wizard read-only', async ({ page }) => {
    test.setTimeout(240_000);
    const { writes, errors } = audit(page);
    await signIn(page);
    await page.goto(`/properties/${svgProperty}/map`);
    await hydrated(page);

    // The design's shell: floorplate tabs with progress, the toolbar, the plot panel.
    await expect(page.getByRole('heading', { level: 2, name: 'Map & Plotting' })).toBeVisible();
    const tabs = page.getByRole('tablist', { name: 'Floorplates' }).getByRole('tab');
    expect(await tabs.count()).toBeGreaterThan(0);
    await expect(page.locator('.bo-map__levelpct').first()).toBeVisible();
    await expect(page.getByTestId('plot-panel')).toContainText('Plot Units & Amenities');
    await expect(page.getByRole('button', { name: /^Manual Plot/ })).toBeVisible();

    // The real floor SVG mounts with its polygons.
    const svgLayer = page.getByTestId('plan-svg');
    await expect(svgLayer).toBeVisible({ timeout: 120_000 });
    await expect(svgLayer.locator('svg')).toHaveCount(1, { timeout: 120_000 });
    const polygonCount = await svgLayer.locator('polygon[id], path[id], rect[id]').count();
    expect(polygonCount).toBeGreaterThan(0);

    // Manual Plot: tick the first item to plot, click a polygon, it moves to Plotted.
    // Stored SVG pointers already sit on polygons, so the counts are compared before and after.
    const todoRows = page.locator('.bo-map__plotrow');
    const before = await page.locator('.bo-map__plottab').nth(1).innerText();
    const storedOnPolygons = await page.locator('.bo-map__pin--poly').count();
    if (await todoRows.count()) {
      await todoRows.first().locator('.bo-map__plotpick').click();
      await page.getByRole('button', { name: /^Manual Plot/ }).click();
      await expect(page.locator('.bo-map__armed')).toContainText('selected');
      const shape = svgLayer.locator('polygon[id], path[id], rect[id]').first();
      await shape.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
      await expect(page.locator('.bo-map__pin--poly')).toHaveCount(storedOnPolygons + 1);
      await page.locator('.bo-map__plottab').nth(1).click();
      await expect(page.locator('.bo-map__plottab').nth(1)).not.toHaveText(before);
      // Its polygon popover lists it and can unplot it.
      await page.getByRole('button', { name: /^Manual Plot/ }).click();
      await shape.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
      await expect(page.locator('.bo-map__polypop')).toBeVisible();
      await page.locator('.bo-map__polypop').getByRole('button', { name: 'Unplot' }).first().click();
      await expect(page.locator('.bo-map__pin--poly')).toHaveCount(storedOnPolygons);
      await page.locator('.bo-map__plottab').nth(0).click();
    }

    // The Auto Plot wizard: Analyze over real numbers and ids, a pattern, the live preview, Confirm, Result.
    await page.getByRole('button', { name: 'Auto Plot', exact: true }).click();
    await page.getByRole('menuitem', { name: /This floorplate/ }).click();
    const wizard = page.getByRole('dialog');
    await expect(wizard).toContainText('Auto Plot ·');
    await expect(wizard.getByTestId('ap-analyze')).toBeVisible();
    await expect(wizard.locator('.bo-ap__stat')).toHaveCount(4);
    await expect(wizard.locator('.bo-ap__table tbody tr').first()).toBeVisible();
    const goPattern = wizard.getByRole('button', { name: /Define Pattern|Adjust Pattern/ });
    if (await goPattern.count()) {
      await goPattern.click();
      await expect(wizard.getByTestId('ap-pattern')).toBeVisible();
      await wizard.getByRole('button', { name: 'Stack only' }).click();
      await expect(wizard.locator('.bo-ap__pattern')).toHaveValue('{stack}');
      await wizard.getByRole('button', { name: '{digits}', exact: false }).first().click();
      await wizard.getByRole('button', { name: 'Add Rule' }).click();
      await wizard.getByPlaceholder('Find').fill('-');
      await wizard.getByRole('button', { name: 'Keep last' }).click();
      await wizard.getByRole('switch', { name: 'Ignore separators' }).click();
      await expect(wizard.locator('.bo-ap__previewcount')).toContainText('match with these rules');
      await wizard.getByRole('button', { name: 'Apply Rules' }).click();
      await expect(wizard.getByTestId('ap-analyze')).toBeVisible();
      await expect(wizard.locator('.bo-ap__rulesummary')).toContainText('On PMS numbers');
    }
    const cont = wizard.getByRole('button', { name: /^Continue/ });
    if (await cont.count()) {
      await cont.first().click();
      await expect(wizard.getByTestId('ap-confirm')).toBeVisible();
      await wizard.getByRole('button', { name: 'Confirm & Auto Plot' }).click();
      await expect(wizard.getByTestId('ap-done')).toBeVisible();
      await expect(wizard).toContainText('Auto Plot complete');
      await wizard.getByRole('button', { name: 'Done' }).click();
    } else {
      await wizard.getByRole('button', { name: /Cancel|Close/ }).first().click();
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Publish, Add Floorplate, Remove Plan: dialogs only.
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Publishing from Connect is not available yet', { exact: false })).toBeVisible();
    await page.getByRole('dialog').locator('.bo-btn--secondary').click();
    await page.getByRole('button', { name: /Add Floorplate/ }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Add Floorplate');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Remove Plan' }).click();
    await page.getByRole('dialog').locator('.bo-btn--secondary').click();

    // Grid, and the pathway tools on the floor SVG.
    await page.getByRole('switch', { name: 'Grid' }).click();
    await expect(page.locator('.bo-map__grid')).toBeVisible();
    await page.getByRole('button', { name: 'Junction', exact: true }).click();
    const plan = page.locator('.bo-map__plan');
    const box = await plan.boundingBox();
    await plan.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: box!.x + box!.width * 0.05, clientY: box!.y + box!.height * 0.05 });
    await expect(page.locator('.bo-map__node--junction')).toHaveCount(1);

    // Switch to the second floorplate, and back.
    if ((await tabs.count()) > 1) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    }

    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('renders the stored pathway graph on a floor image and stays read-only through the pathway tools', async ({ page }) => {
    test.setTimeout(180_000);
    const { writes, errors } = audit(page);
    await signIn(page);
    await page.goto(`/properties/${rasterProperty}/map`);
    await hydrated(page);

    await expect(page.getByTestId('plan-surface')).toBeVisible();
    await expect(page.locator('.bo-map__pin').first()).toBeVisible();
    const storedNodes = await page.locator('.bo-map__node--hallway').count();
    expect(storedNodes).toBeGreaterThan(0);

    // Select a pin and a node.
    await page.locator('.bo-map__pin').first().dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await expect(page.locator('.bo-map__panel--accent')).toBeVisible();
    await page.locator('.bo-map__node--hallway').first().dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await expect(page.locator('.bo-map__node--selected')).toHaveCount(1);

    // Place Pin: tick one item, turn Manual Plot on, click the image.
    const plan = page.locator('.bo-map__plan');
    const box = await plan.boundingBox();
    const queueItem = page.locator('.bo-map__plotrow').first();
    if (await queueItem.count()) {
      await queueItem.locator('.bo-map__plotpick').click();
      await page.getByRole('button', { name: /^Manual Plot/ }).click();
      await plan.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: box!.x + box!.width * 0.3, clientY: box!.y + box!.height * 0.3 });
      // Several ticked items cannot drop on an image; one armed item can.
      await page.getByRole('button', { name: /^Manual Plot/ }).click();
    }

    // Junction, Connect, Move, hallway plotting.
    await page.getByRole('button', { name: 'Junction', exact: true }).click();
    await plan.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: box!.x + box!.width * 0.5, clientY: box!.y + box!.height * 0.5 });
    await plan.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: box!.x + box!.width * 0.6, clientY: box!.y + box!.height * 0.55 });
    await expect(page.locator('.bo-map__node--junction')).toHaveCount(2);
    await page.getByRole('button', { name: 'Connect', exact: true }).click();
    await page.locator('.bo-map__node--junction').nth(0).dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await page.locator('.bo-map__node--junction').nth(1).dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await expect(page.locator('.bo-map__edges line[stroke-dasharray]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Move', exact: true }).click();
    await page.locator('.bo-map__node--junction').nth(0).dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await page.getByTestId('plan-surface').dispatchEvent('pointermove', { bubbles: true, pointerId: 1, clientX: box!.x + box!.width * 0.4, clientY: box!.y + box!.height * 0.4 });
    await page.getByTestId('plan-surface').dispatchEvent('pointerup', { bubbles: true, pointerId: 1 });
    await page.getByRole('button', { name: 'Start Plotting Hallways' }).click();
    await plan.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: box!.x + box!.width * 0.7, clientY: box!.y + box!.height * 0.7 });
    await expect(page.locator('.bo-map__node--junction')).toHaveCount(3);
    await page.getByRole('button', { name: 'Stop Plotting Hallways' }).click();

    // Run the CMS algorithm (a GET through this app's route handler) and the local preview.
    await page.getByRole('button', { name: 'Run Algorithm (Animated)' }).click();
    await expect(page.locator('.bo-map__routeresult')).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: 'Preview with local edits' }).click();
    await expect(page.locator('.bo-map__routeresult')).toBeVisible();

    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('an unknown property id shows not found', async ({ page }) => {
    await signIn(page);
    await page.goto('/properties/999999999/map');
    await expect(page.getByText('Property not found')).toBeVisible();
  });
});
