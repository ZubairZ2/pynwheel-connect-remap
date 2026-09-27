import { expect, test, type Page } from '@playwright/test';

/**
 * Tour Setup on real data, driven against a running CMS with a minted Devise
 * session (PYN_CONNECT_PROGRESS.md §7). Skips itself without the session env
 * (PYN_CONNECT_E2E_RAILS_COOKIE / PYN_CONNECT_E2E_USER). The default property,
 * 2934 (Dummy-High-Rise-0012), has 20 stops on its community tour, 4
 * elevators (one with a Latch bank, one with a gallery photo) and 47 hallway
 * nodes. The last assertion is the one that matters most: only GETs.
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const propertyId = process.env.PYN_CONNECT_E2E_TOUR_PROPERTY ?? '2934';

test.describe('Tour Setup (real data)', () => {
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
      const button = document.querySelector('.bo-tour__tab');
      return !!button && Object.keys(button).some((key) => key.startsWith('__reactFiber'));
    });
  };

  test('lists the real stops, elevators and routing and stays read-only through every action', async ({ page }) => {
    test.setTimeout(180_000);
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    await signIn(page);
    await page.goto(`/properties/${propertyId}/tour-setup`);
    await hydrated(page);

    // Header and the three tabs with real counts.
    await expect(page.getByRole('heading', { level: 2, name: 'Tour Setup' })).toBeVisible();
    const stopsTab = page.getByRole('tab', { name: /^Tour Stops/ });
    const elevatorsTab = page.getByRole('tab', { name: /^Elevators & Locks/ });
    const routingTab = page.getByRole('tab', { name: /^Routing/ });
    await expect(stopsTab).toBeVisible();
    const stopCount = Number((await stopsTab.locator('.bo-tour__tabcount').innerText()).trim());
    expect(stopCount).toBeGreaterThan(0);

    // Stops: cards, reorder, hide, edit, remove, add — all local.
    const stops = page.locator('.bo-tour__stop');
    await expect(stops).toHaveCount(stopCount);
    const firstName = await stops.first().locator('.bo-tour__stopname').innerText();
    await stops.first().getByRole('button', { name: 'Move down' }).click();
    await expect(stops.nth(1).locator('.bo-tour__stopname')).toHaveText(firstName);
    await stops.nth(1).getByRole('button', { name: 'Move up' }).click();
    await expect(stops.first().locator('.bo-tour__stopname')).toHaveText(firstName);
    await stops.first().getByRole('button', { name: 'Hide' }).click();
    await expect(stops.first()).toContainText('Hidden from tour');
    await stops.first().getByRole('button', { name: 'Show' }).click();
    await stops.first().locator('.bo-tour__talk').fill('Local talking point');
    await expect(stops.first().locator('.bo-tour__talk')).toHaveValue('Local talking point');
    await stops.first().getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByRole('dialog')).toContainText('Edit Tour Stop');
    await page.getByRole('dialog').getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Add Stop' }).first().click();
    await expect(page.getByRole('dialog')).toContainText('Add Tour Stop');
    await page.getByRole('dialog').getByRole('button', { name: 'Add Stop' }).click();
    await expect(stops).toHaveCount(stopCount + 1);
    await expect(stopsTab.locator('.bo-tour__tabcount')).toHaveText(String(stopCount + 1));
    await stops.last().getByRole('button', { name: 'Remove' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove Stop' }).click();
    await expect(stops).toHaveCount(stopCount);
    // View / Plot on Plan opens the map with the stop.
    await expect(stops.first().getByRole('link', { name: /on Plan/ })).toHaveAttribute('href', /\/map\?/);

    // Elevators: real cards, gating toggle, add bank, remove — all local.
    await elevatorsTab.click();
    const elevators = page.locator('.bo-tour__elevator');
    expect(await elevators.count()).toBeGreaterThan(0);
    const toggle = elevators.first().getByRole('switch');
    const wasGated = (await toggle.getAttribute('aria-checked')) === 'true';
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', String(!wasGated));
    await page.getByRole('button', { name: 'Add Elevator Bank' }).click();
    await page.getByRole('dialog').getByPlaceholder('e.g. Bank A').fill('Local Bank');
    await page.getByRole('dialog').getByRole('button', { name: 'Add Bank' }).click();
    await expect(page.locator('.bo-tour__elevator', { hasText: 'Local Bank' })).toHaveCount(1);
    await page.locator('.bo-tour__elevator', { hasText: 'Local Bank' }).getByRole('button', { name: /^Delete/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove Bank' }).click();
    await expect(page.locator('.bo-tour__elevator', { hasText: 'Local Bank' })).toHaveCount(0);

    // Routing: starting points from the CMS, and a local multi-floor route between two real stops.
    await routingTab.click();
    await expect(page.getByText('Building Starting Points')).toBeVisible();
    const from = page.getByRole('combobox', { name: 'From' });
    const to = page.getByRole('combobox', { name: 'To' });
    const options = await from.locator('option').count();
    if (options > 2) {
      await from.selectOption({ index: 1 });
      await to.selectOption({ index: 2 });
      await page.getByRole('button', { name: 'Compute Multi-Floor Route' }).click();
      await expect(page.locator('.bo-tour__routeresult')).not.toHaveText(/Pick two stops/);
    }

    // Publish: dialog only.
    await page.getByRole('button', { name: 'Publish to Touch App' }).click();
    await expect(page.getByText('Publishing from Connect is not available yet', { exact: false })).toBeVisible();
    await page.getByRole('dialog').locator('.bo-btn--secondary').click();

    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('an unknown property id shows not found', async ({ page }) => {
    await signIn(page);
    await page.goto('/properties/999999999/tour-setup');
    await expect(page.getByText('Property not found')).toBeVisible();
  });
});
