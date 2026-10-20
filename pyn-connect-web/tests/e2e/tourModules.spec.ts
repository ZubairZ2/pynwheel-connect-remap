import { expect, test, type Page } from '@playwright/test';

/**
 * The Tour Setup modules on real data — Stops, Locks, Visitors and the
 * booking settings — against a running CMS with a minted Devise session
 * (PYN_CONNECT_PROGRESS.md §7). Skips itself without the session env. The
 * default property, 1618 (Hazel), has 11 stops, an igloohome v1 and a Zerv
 * account with mapped locks, a few hundred bookings and a live scheduler.
 * Every test asserts that only GETs left the page: the module writes are
 * exercised by the Rails tests and by hand on the audit clone, not here.
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const propertyId = process.env.PYN_CONNECT_E2E_MODULES_PROPERTY ?? '1618';

test.describe('Tour Setup modules (real data)', () => {
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

  const watch = (page: Page) => {
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    return { writes, errors };
  };

  test('overview: six KPIs, the attention list and live visitors from the module reads', async ({ page }) => {
    const { writes, errors } = watch(page);
    await signIn(page);
    await page.goto(`/properties/${propertyId}/tour-setup`);
    await hydrated(page);
    await expect(page.getByTestId('tour-overview')).toBeVisible();
    await expect(page.getByTestId('tour-kpis').locator('.bo-tm__kpi')).toHaveCount(6);
    await expect(page.getByTestId('tour-attention')).toBeVisible();
    await expect(page.getByTestId('tour-live')).toBeVisible();
    // The KPI that needs the CMS rows fills in once they arrive.
    await expect(page.locator('[data-kpi="onsite"] .bo-tm__kpivalue')).not.toHaveText('—', { timeout: 30_000 });
    for (const id of ['overview', 'stops', 'elevators', 'locks', 'visitors', 'chat', 'settings']) {
      await expect(page.getByTestId(`tour-tab-${id}`)).toBeVisible();
    }
    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('stops: grouped list, the attention filter, the drawer, the route preview and the shortest-path test', async ({ page }) => {
    test.setTimeout(180_000);
    const { writes, errors } = watch(page);
    await signIn(page);
    await page.goto(`/properties/${propertyId}/tour-setup?tab=stops`);
    await hydrated(page);
    const stopsTab = page.getByTestId('tour-tab-stops');
    const count = Number((await stopsTab.locator('.bo-tour__tabcount').innerText()).trim());
    expect(count).toBeGreaterThan(0);
    const rows = page.getByTestId('stop-row');
    await expect(rows).toHaveCount(count);
    await expect(page.getByTestId('route-preview')).toBeVisible();
    await expect(page.getByTestId('path-panel')).toBeVisible();

    // Only stops that need attention.
    const filter = page.getByTestId('stops-only-issues');
    await filter.click();
    await expect(filter).toHaveAttribute('aria-checked', 'true');
    expect(await rows.count()).toBeLessThanOrEqual(count);
    await filter.click();
    await expect(rows).toHaveCount(count);

    // The shortest path, from the saved graph (a result or a named reason).
    const find = page.getByTestId('path-find');
    if (await find.isEnabled()) {
      await find.click();
      await expect(page.getByTestId('path-result')).toBeVisible({ timeout: 60_000 });
    }

    // The drawer: content, lock, preview; closing brings the route preview back.
    await rows.first().click();
    const drawer = page.getByTestId('stop-drawer');
    await expect(drawer).toBeVisible();
    await drawer.getByRole('tab', { name: 'Lock' }).click();
    await expect(page.getByTestId('stop-lock')).toBeVisible();
    await drawer.getByRole('tab', { name: 'Preview' }).click();
    await expect(page.getByTestId('stop-preview')).toBeVisible();
    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByTestId('route-preview')).toBeVisible();

    // Hide / show stays on the page.
    await rows.first().getByRole('button', { name: /^Hide from visitors/ }).click();
    await expect(rows.first()).toContainText('Hidden');
    await rows.first().getByRole('button', { name: /^Show to visitors/ }).click();
    await expect(rows.first()).not.toContainText('Hidden');

    // Add stops: pick one pinned record, add it (local, "Unsaved"), then remove it again.
    await page.getByTestId('stops-add').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Add stops');
    const pickable = dialog.locator('[data-testid="add-stop-item"]:enabled');
    if ((await pickable.count()) > 0) {
      await pickable.first().click();
      await page.getByTestId('add-stops-submit').click();
      await expect(rows).toHaveCount(count + 1);
      await expect(stopsTab.locator('.bo-tour__tabcount')).toHaveText(String(count + 1));
      await expect(page.locator('[data-testid="stop-row"]', { hasText: 'Unsaved' })).toHaveCount(1);
      await page.locator('[data-testid="stop-row"]', { hasText: 'Unsaved' }).click();
      await drawer.getByRole('button', { name: 'Remove from tour' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Remove Stop' }).click();
      await expect(rows).toHaveCount(count);
    } else {
      await dialog.getByRole('button', { name: 'Cancel' }).click();
    }
    await expect(page.getByRole('dialog')).toHaveCount(0);

    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('locks: providers, the lock inventory with its filters, and the issued codes', async ({ page }) => {
    const { writes, errors } = watch(page);
    await signIn(page);
    await page.goto(`/properties/${propertyId}/tour-setup?tab=locks`);
    await hydrated(page);
    const locks = page.getByTestId('tour-locks');
    await expect(locks).toBeVisible();
    await expect(locks.getByRole('tab', { name: 'Providers' })).toBeVisible({ timeout: 30_000 });
    await locks.getByRole('tab', { name: /^Lock inventory/ }).click();
    const table = locks.locator('.bo-tx__table tbody tr');
    expect(await table.count()).toBeGreaterThan(0);
    await locks.getByRole('button', { name: /^Mapped/ }).click();
    await locks.getByRole('button', { name: /^All/ }).click();
    await locks.getByRole('tab', { name: /^Issued codes/ }).click();
    await expect(locks.locator('.bo-tx__table')).toBeVisible();
    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('visitors: the list with its chips and filters, a profile, the export link and the booking dialog', async ({ page }) => {
    test.setTimeout(120_000);
    const { writes, errors } = watch(page);
    await signIn(page);
    await page.goto(`/properties/${propertyId}/tour-setup?tab=visitors`);
    await hydrated(page);
    const list = page.getByTestId('visitors-list');
    await expect(list).toBeVisible();
    const rows = page.getByTestId('visitor-row');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(list.locator('.bo-tx__chip')).toHaveCount(6);
    await expect(list.getByRole('link', { name: 'Export CSV' })).toHaveAttribute('href', /\/tour\/visitors\/export\?/);

    await list.getByPlaceholder(/Search/).fill('zzzz-no-such-visitor');
    await expect(rows).toHaveCount(0, { timeout: 30_000 });
    await list.getByPlaceholder(/Search/).fill('');
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });

    await page.getByTestId('new-booking').click();
    await expect(page.getByRole('dialog')).toContainText('New booking');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await rows.first().click();
    await expect(page.getByTestId('visitor-profile')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('visitor-sessions')).toBeVisible();
    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('settings: the scheduling and booking sections on the stored settings', async ({ page }) => {
    const { writes, errors } = watch(page);
    await signIn(page);
    await page.goto(`/properties/${propertyId}/tour-setup?tab=settings`);
    await hydrated(page);
    await expect(page.getByTestId('tour-settings')).toBeVisible();
    await expect(page.getByTestId('booking-rules')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('settings-hours').click();
    await expect(page.getByTestId('booking-hours')).toBeVisible();
    // October 20, 2026: the rail is grouped; the Booking & CRM pills show once that group is open.
    await page.getByTestId('settings-group-booking').click();
    await expect(page.getByTestId('booking-form')).toBeVisible();
    await expect(page.getByTestId('prospect-preview')).toBeVisible();
    await page.getByTestId('settings-link').click();
    await expect(page.getByTestId('booking-link')).toBeVisible();
    await page.getByTestId('settings-crm').click();
    await expect(page.getByTestId('booking-crm')).toBeVisible();
    await page.getByTestId('settings-group-navigation').click();
    await expect(page.locator('.bo-configgroup')).toBeVisible();
    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });
});
