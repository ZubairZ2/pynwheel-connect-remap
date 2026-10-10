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
 * floorplate tabs, Manual Plot onto a real polygon and onto a floor image,
 * the Auto Plot wizard's four steps over the real PMS numbers and polygon
 * ids, Add Floorplate — the layout is held to the plotting design (the
 * toolbar carries Auto Plot and Manual Plot only; one side panel), and the
 * assertion that matters most is the last: the browser sent nothing but GETs.
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

  /**
   * The plotting design's layout: the toolbar holds the floor, its plotted
   * count, Auto Plot and Manual Plot, and nothing else; the side column is
   * the Plot on Map panel alone.
   */
  const expectDesignLayout = async (page: Page) => {
    const toolbar = page.locator('.bo-map__toolbar');
    // A floorplate with both a floor SVG and a floor image carries the layer switch (October 10, 2026) before the plotting tools.
    const layered = (await page.getByTestId('layer-switch').count()) > 0;
    await expect(toolbar.getByRole('button')).toHaveText(layered ? [/^Floor SVG$/, /^Background image$/, /^Auto Plot/, /^Manual Plot/] : [/^Auto Plot/, /^Manual Plot/]);
    await expect(toolbar).toContainText(/\d+ of \d+ plotted/);
    await expect(page.locator('.bo-map__side > *')).toHaveCount(1);
    for (const gone of ['Publish', 'Grid', 'Place Pin', 'Junction', 'Connect', 'Move', 'Start Plotting Hallways', 'Upload SVG', 'Upload Image', 'Remove Plan', 'Run Algorithm (Animated)']) {
      await expect(page.getByRole('button', { name: gone, exact: true }), gone).toHaveCount(0);
    }
    await expect(page.getByRole('switch', { name: 'Grid' })).toHaveCount(0);
    await expect(page.getByText('Pathways & pins', { exact: false })).toHaveCount(0);
    await expect(page.getByText('Read-only: pins, nodes and connections', { exact: false })).toHaveCount(0);
  };

  test('plots onto the real floor SVG polygons and runs the Auto Plot wizard read-only', async ({ page }) => {
    test.setTimeout(240_000);
    const { writes, errors } = audit(page);
    await signIn(page);
    await page.goto(`/properties/${svgProperty}/map`);
    await hydrated(page);
    // Since October 10, 2026 a floorplate with both files opens on the frame its stored plotting is in; this test is about the SVG, so pick it.
    const layer = page.getByTestId('layer-switch').getByRole('button', { name: 'Floor SVG' });
    if (await layer.count()) await layer.click();

    // The design's shell: floorplate tabs with progress, the toolbar, the plot panel.
    await expect(page.getByRole('heading', { level: 2, name: 'Map & Plotting' })).toBeVisible();
    const tabs = page.getByRole('tablist', { name: 'Floorplates' }).getByRole('tab');
    expect(await tabs.count()).toBeGreaterThan(0);
    await expect(page.locator('.bo-map__levelpct').first()).toBeVisible();
    await expect(page.getByTestId('plot-panel')).toContainText('Plot on Map');
    await expect(page.getByRole('button', { name: /^Manual Plot/ })).toBeVisible();
    await expectDesignLayout(page);

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
    // A placement on a polygon is the filled polygon itself (the legacy page clones the shape; no marker sits on it).
    const storedOnPolygons = await page.locator('[data-plotted]').count();
    if (await todoRows.count()) {
      await todoRows.first().locator('.bo-map__plotpick').click();
      await page.getByRole('button', { name: /^Manual Plot/ }).click();
      await expect(page.locator('.bo-map__armed')).toContainText('selected');
      const shape = svgLayer.locator('polygon[id], path[id], rect[id]').first();
      await shape.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
      await expect(page.locator('[data-plotted]')).toHaveCount(storedOnPolygons + 1);
      await page.locator('.bo-map__plottab').nth(1).click();
      await expect(page.locator('.bo-map__plottab').nth(1)).not.toHaveText(before);
      // Its polygon popover lists it and can unplot it.
      await page.getByRole('button', { name: /^Manual Plot/ }).click();
      await shape.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
      await expect(page.locator('.bo-map__polypop')).toBeVisible();
      await page.locator('.bo-map__polypop').getByRole('button', { name: 'Unplot' }).first().click();
      await expect(page.locator('[data-plotted]')).toHaveCount(storedOnPolygons);
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

    // Add Floorplate: the inventory's dialog; Save only closes.
    await page.getByRole('button', { name: /Add Floorplate/ }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Add Floorplate');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Switch to the second floorplate, and back.
    if ((await tabs.count()) > 1) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    }

    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('draws the stored pins and pathway graph on a floor image, and Manual Plot drops a pin on it', async ({ page }) => {
    test.setTimeout(180_000);
    const { writes, errors } = audit(page);
    await signIn(page);
    await page.goto(`/properties/${rasterProperty}/map`);
    await hydrated(page);
    await expectDesignLayout(page);

    // The floor image with its stored pins and hallway nodes (the legacy Auto Wayfinding graph), read-only.
    await expect(page.getByTestId('plan-surface')).toBeVisible();
    await expect(page.locator('.bo-map__pin').first()).toBeVisible();
    expect(await page.locator('.bo-map__node--hallway').count()).toBeGreaterThan(0);

    // Manual Plot on an image: turning it on arms the next item to plot, a click on the plan drops its pin, Turn Off ends it.
    if (await page.locator('.bo-map__plotrow').count()) {
      const pins = await page.locator('.bo-map__pin').count();
      await page.getByRole('button', { name: /^Manual Plot/ }).click();
      await expect(page.getByRole('button', { name: /^Manual Plot/ })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.bo-map__armed')).toBeVisible();
      const plan = page.locator('.bo-map__plan');
      const box = await plan.boundingBox();
      await plan.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: box!.x + box!.width * 0.3, clientY: box!.y + box!.height * 0.3 });
      await expect(page.locator('.bo-map__pin')).toHaveCount(pins + 1);
      if (await page.locator('.bo-map__armed').count()) await page.locator('.bo-map__armed').getByRole('button', { name: 'Turn Off' }).click();
      await expect(page.getByRole('button', { name: /^Manual Plot/ })).toHaveAttribute('aria-pressed', 'false');
    }

    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('an unknown property id shows not found', async ({ page }) => {
    await signIn(page);
    await page.goto('/properties/999999999/map');
    await expect(page.getByText('Property not found')).toBeVisible();
  });
});
