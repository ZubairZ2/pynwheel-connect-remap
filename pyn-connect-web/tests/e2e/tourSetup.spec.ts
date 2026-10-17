import { expect, test, type Page } from '@playwright/test';

/**
 * Tour Setup on real data, driven against a running CMS with a minted Devise
 * session (PYN_CONNECT_PROGRESS.md §7). Skips itself without the session env
 * (PYN_CONNECT_E2E_RAILS_COOKIE / PYN_CONNECT_E2E_USER). The default property,
 * 2934 (Dummy-High-Rise-0012), has 20 stops on its community tour, 4
 * elevators (one with a Latch bank, one with a gallery photo). The last
 * assertion is the one that matters most: only GETs.
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

  test('lists the real stops and elevators and stays read-only through every action', async ({ page }) => {
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

    // Header and the tabs with real counts (Overview · Stops · Elevators · Locks · Visitors · Live Chat · Settings).
    await expect(page.getByRole('heading', { level: 2, name: 'Tour Setup' })).toBeVisible();
    const stopsTab = page.getByRole('tab', { name: /^Stops/ });
    const elevatorsTab = page.getByRole('tab', { name: /^Elevators/ });
    await expect(stopsTab).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Locks' })).toBeVisible();
    const stopCount = Number((await stopsTab.locator('.bo-tour__tabcount').innerText()).trim());
    expect(stopCount).toBeGreaterThan(0);

    // The page opens on the Overview (Back Office design, Oct 2026): checklist and KPIs from the real tour.
    await expect(page.getByTestId('tour-overview')).toBeVisible();
    await expect(page.getByText('Set up the tour')).toBeVisible();
    await stopsTab.click();

    // Stops: the grouped list (one row per stop) with the route preview beside it; the module spec covers the rest.
    const stops = page.getByTestId('stop-row');
    await expect(stops).toHaveCount(stopCount);
    await expect(page.getByTestId('route-preview')).toBeVisible();
    await stops.first().click();
    await expect(page.getByTestId('stop-drawer')).toBeVisible();
    await page.getByTestId('stop-drawer').getByRole('button', { name: 'Close' }).click();

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
