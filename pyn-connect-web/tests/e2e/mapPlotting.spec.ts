import { expect, test, type Page } from '@playwright/test';

/**
 * Map & Plotting on real data, driven against a running CMS with a minted
 * Devise session (PYN_CONNECT_PROGRESS.md §7). The spec skips itself when the
 * session is not provided:
 *
 *   PYN_CONNECT_E2E_RAILS_COOKIE   the `rails_cookie` value the mint script prints
 *   PYN_CONNECT_E2E_USER           the `user` JSON it prints
 *   PYN_CONNECT_E2E_PROPERTY       a property id with a pathway graph (default 2919)
 *
 * Every interaction the screen offers is exercised, and the one assertion
 * that matters most is the last: the browser sent nothing but GETs.
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const propertyId = process.env.PYN_CONNECT_E2E_PROPERTY ?? '2919';

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

  test('renders the stored map and stays read-only through every interaction', async ({ page }) => {
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    await signIn(page);

    await page.goto(`/properties/${propertyId}/map`);
    await hydrated(page);

    // Real levels and a real plan.
    const tabs = page.getByRole('tab');
    expect(await tabs.count()).toBeGreaterThan(0);
    await expect(page.getByTestId('plan-surface')).toBeVisible();
    await expect(page.locator('.bo-map__pin').first()).toBeVisible();
    const storedPins = await page.locator('.bo-map__pin').count();
    const storedNodes = await page.locator('.bo-map__node--hallway').count();
    expect(storedPins + storedNodes).toBeGreaterThan(0);

    // Select a pin, a node and an edge.
    await page.locator('.bo-map__pin').first().dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await expect(page.locator('.bo-map__panel--accent')).toBeVisible();
    if (storedNodes) {
      await page.locator('.bo-map__node--hallway').first().dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
      await expect(page.locator('.bo-map__node--selected')).toHaveCount(1);
    }

    // Place Pin: arm the first unplotted item and click the plan.
    const queueItem = page.locator('.bo-map__queueitem').first();
    if (await queueItem.count()) {
      await queueItem.click();
      await expect(page.getByText('click the plan to drop its pin', { exact: false })).toBeVisible();
      const plan = page.locator('.bo-map__plan');
      const box = await plan.boundingBox();
      await plan.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: box!.x + box!.width * 0.3, clientY: box!.y + box!.height * 0.3 });
      await expect(page.locator('.bo-map__pin--temp')).toHaveCount(1);
    }

    // Junction, Connect, Move, Grid, hallway plotting.
    await page.getByRole('button', { name: 'Junction', exact: true }).click();
    const plan = page.locator('.bo-map__plan');
    const box = await plan.boundingBox();
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
    await page.getByRole('switch', { name: 'Grid' }).click();
    await expect(page.locator('.bo-map__grid')).toBeVisible();
    await page.getByRole('button', { name: 'Start Plotting Hallways' }).click();
    await plan.dispatchEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: box!.x + box!.width * 0.7, clientY: box!.y + box!.height * 0.7 });
    await expect(page.locator('.bo-map__node--junction')).toHaveCount(3);
    await page.getByRole('button', { name: 'Stop Plotting Hallways' }).click();

    // Auto-Plot, Publish, Remove Plan: dialogs only.
    await page.getByRole('button', { name: 'Auto-Plot', exact: true }).click();
    const autoPlotDialog = page.getByRole('dialog');
    if (await autoPlotDialog.count()) {
      await autoPlotDialog.getByRole('button', { name: 'Auto-Plot' }).click();
      await expect(page.getByText('Auto-Plot Result')).toBeVisible();
    }
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Publishing from Connect is not available yet', { exact: false })).toBeVisible();
    await page.getByRole('dialog').locator('.bo-btn--secondary').click();
    await page.getByRole('button', { name: 'Remove Plan' }).click();
    await page.getByRole('dialog').locator('.bo-btn--secondary').click();

    // Run the CMS algorithm (a GET through this app's route handler) and the local preview.
    await page.getByRole('button', { name: 'Run Algorithm (Animated)' }).click();
    await expect(page.locator('.bo-map__routeresult')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Preview with local edits' }).click();
    await expect(page.locator('.bo-map__routeresult')).toBeVisible();

    // Switch floors.
    if ((await tabs.count()) > 1) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
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
