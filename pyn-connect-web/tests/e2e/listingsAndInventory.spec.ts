import { expect, test, type Page, type Request } from '@playwright/test';

/**
 * The September 30 brief on real data: the Inventory's on-demand units, the
 * Companies and Properties column sorting, and the Map & Plotting Building
 * row. Driven against a running CMS with a minted Devise session
 * (PYN_CONNECT_PROGRESS.md §7); skipped without one:
 *
 *   PYN_CONNECT_E2E_RAILS_COOKIE   the `rails_cookie` value the mint script prints
 *   PYN_CONNECT_E2E_USER           the `user` JSON it prints
 *   PYNWHEEL_CMS_URL               the CMS the app talks to (default http://127.0.0.1:3000)
 *   PYN_CONNECT_E2E_JOHN           the performance property (default 1411, "John Pynwheel Demo")
 *   PYN_CONNECT_E2E_HAZEL          the deep-validation property (default 1618, Hazel)
 *
 * Expected values are read from the CMS's own JSON at run time (counts, and
 * the first rows of each sorted order), so the suite asserts "the UI equals
 * the database" in whichever dump the CMS runs on. Every test ends on the same
 * assertion: the browser sent nothing but GETs.
 *
 * What a browser cannot see is which CMS requests the Next server makes; the
 * before/after audit of those (the Rails log) is in PYN_CONNECT_PROGRESS.md §24.
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const CMS = (process.env.PYNWHEEL_CMS_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const JOHN = process.env.PYN_CONNECT_E2E_JOHN ?? '1411';
const HAZEL = process.env.PYN_CONNECT_E2E_HAZEL ?? '1618';

type Json = Record<string, unknown>;

const UNITS_API = new RegExp(`/api/properties/${JOHN}/inventory/units$`);

test.describe('Listings and inventory (real data)', () => {
  test.skip(!railsCookie || !user, 'PYN_CONNECT_E2E_RAILS_COOKIE / PYN_CONNECT_E2E_USER not set');

  const cms = async (path: string): Promise<Json> => {
    const response = await fetch(`${CMS}${path}`, { headers: { Cookie: railsCookie!, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${path} answered ${response.status}`);
    return (await response.json()) as Json;
  };
  const rowsOf = (payload: Json) => payload.data as Json[];

  const signIn = async (page: Page) => {
    const origin = new URL(String(test.info().project.use.baseURL ?? 'http://127.0.0.1:3001'));
    await page.context().addCookies([
      { name: 'pyn_connect_rails_session', value: encodeURIComponent(railsCookie!), domain: origin.hostname, path: '/', httpOnly: true },
      { name: 'pyn_connect_user', value: encodeURIComponent(user!), domain: origin.hostname, path: '/', httpOnly: true }
    ]);
  };

  const hydrated = async (page: Page, selector = 'main button, main a') => {
    await page.waitForFunction(
      (s) => Array.from(document.querySelectorAll(s)).some((node) => Object.keys(node).some((key) => key.startsWith('__reactFiber'))),
      selector,
      { timeout: 90_000 }
    );
  };

  /** Every request the page makes, and the non-GET ones and page errors, which must stay empty. */
  const audit = (page: Page) => {
    const requests: Request[] = [];
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      requests.push(request);
      if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    return {
      requests,
      unitsCalls: () => requests.filter((request) => UNITS_API.test(new URL(request.url()).pathname)).length,
      clean: () => {
        expect(errors, 'page errors').toEqual([]);
        expect(writes, 'non-GET requests').toEqual([]);
      }
    };
  };

  /* ---------------- Inventory: units on demand ---------------- */

  test('Properties listing: nothing of the inventory is requested until Inventory is opened', async ({ page }) => {
    const audited = audit(page);
    await signIn(page);
    await page.goto('/properties?q=John%20Pynwheel');
    await hydrated(page);
    await page.locator(`a[href="/properties/${JOHN}/inventory"]`).first().hover();
    await page.waitForTimeout(2500);

    // A production build prefetches the linked routes only up to their
    // loading boundary (a Next-Router-Prefetch request, no CMS read); a real
    // navigation to an inventory screen or the units listing must not happen.
    const early = audited.requests.filter((request) => {
      const url = new URL(request.url());
      const prefetch = !!request.headers()['next-router-prefetch'];
      return url.pathname.startsWith('/api/properties/') || (!prefetch && /\/properties\/\d+\/(inventory|map|tour-setup|units)/.test(url.pathname));
    });
    expect(early.map((request) => request.url())).toEqual([]);
    audited.clean();
  });

  test('Inventory opens without the units listing, reads it once on the Units tab, and the counts stay real', async ({ page }) => {
    const [units, floorplans] = await Promise.all([cms(`/communities/${JOHN}/units.json`), cms(`/communities/${JOHN}/floorplans.json`)]);
    const unitTotal = rowsOf(units).length;
    const audited = audit(page);
    await signIn(page);
    await page.goto('/properties?q=John%20Pynwheel');
    await hydrated(page);
    await page.locator(`a[href="/properties/${JOHN}/inventory"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/properties/${JOHN}/inventory$`));
    await hydrated(page, '.bo-inv__tab');

    // Before any unit is loaded the badge already carries the listing's count.
    await expect(page.getByRole('tab', { name: /^Units/ })).toContainText(unitTotal.toLocaleString('en-US'));
    await expect(page.getByRole('tab', { name: /^Floorplans/ })).toContainText(String(rowsOf(floorplans).length));
    await page.getByRole('tab', { name: /^Floorplans/ }).click();
    await page.getByRole('tab', { name: /^Amenities/ }).click();
    await page.waitForTimeout(500);
    expect(audited.unitsCalls(), 'units requested before the Units tab').toBe(0);

    const answered = page.waitForResponse((response) => UNITS_API.test(new URL(response.url()).pathname));
    await page.getByRole('tab', { name: /^Units/ }).click();
    expect((await answered).status()).toBe(200);
    await expect(page.locator('.bo-record').first()).toBeVisible();
    await expect(page.locator('.bo-record')).toHaveCount(Math.min(25, unitTotal));
    await expect(page.getByRole('tab', { name: /^Units/ })).toContainText(unitTotal.toLocaleString('en-US'));

    // Leaving and coming back reuses what was read.
    await page.getByRole('tab', { name: /^Floorplates/ }).click();
    await page.getByRole('tab', { name: /^Units/ }).click();
    await expect(page.locator('.bo-record').first()).toBeVisible();
    expect(audited.unitsCalls(), 'units requests').toBe(1);
    audited.clean();
  });

  test('A link straight to the Units tab arrives with its units: no extra request', async ({ page }) => {
    const unitTotal = rowsOf(await cms(`/communities/${JOHN}/units.json`)).length;
    const audited = audit(page);
    await signIn(page);
    await page.goto(`/properties/${JOHN}/inventory?tab=units`);
    await hydrated(page, '.bo-inv__tab');
    await expect(page.locator('.bo-record')).toHaveCount(Math.min(25, unitTotal));
    expect(audited.unitsCalls()).toBe(0);
    audited.clean();
  });

  test('A dialog that needs the units shows the shared loading state until they arrive', async ({ page }) => {
    const audited = audit(page);
    await signIn(page);
    // Hold the units response for a moment, so the waiting state is observable.
    await page.route(UNITS_API, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      await route.continue();
    });
    await page.goto(`/properties/${JOHN}/inventory`);
    await hydrated(page, '.bo-inv__tab');
    await page.getByRole('button', { name: 'Edit floorplate' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('status', { name: 'Loading units…' })).toBeVisible();
    await expect(dialog.getByRole('status', { name: 'Loading units…' })).toHaveCount(0, { timeout: 30_000 });
    await expect(dialog.getByText('Building', { exact: false }).first()).toBeVisible();
    expect(audited.unitsCalls()).toBe(1);
    audited.clean();
  });

  test('A failed units request says so and Retry reads it again', async ({ page }) => {
    const audited = audit(page);
    await signIn(page);
    await page.route(UNITS_API, (route) => route.fulfill({ status: 502, contentType: 'application/json', body: '{"ok":false,"error":"failed"}' }));
    await page.goto(`/properties/${JOHN}/inventory`);
    await hydrated(page, '.bo-inv__tab');
    await page.getByRole('tab', { name: /^Units/ }).click();
    await expect(page.locator('.bo-inv__retry[role="alert"]')).toContainText('The units could not be loaded from the CMS.');
    await expect(page.locator('.bo-record')).toHaveCount(0);

    await page.unroute(UNITS_API);
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.locator('.bo-record').first()).toBeVisible();
    expect(audited.unitsCalls()).toBe(2);
    audited.clean();
  });

  /* ---------------- Sorting ---------------- */

  /** The header button of a sortable column, its `aria-sort`, and the first cell texts of the rows on screen. */
  const header = (page: Page, column: string) => page.locator('th', { has: page.getByRole('button', { name: column, exact: true }) });
  const sortBy = async (page: Page, column: string) => {
    const before = page.url();
    await page.getByRole('button', { name: column, exact: true }).click();
    await page.waitForFunction((url) => location.href !== url, before);
    await expect(page.locator('.bo-panel[aria-busy="true"]')).toHaveCount(0);
  };
  const cellTexts = (page: Page, index: number) =>
    page.locator('tbody tr').evaluateAll(
      (rows, i) => rows.map((row) => (row as HTMLTableRowElement).cells[i]?.innerText.split('\n').pop()?.trim() ?? ''),
      index
    );
  const titles = (page: Page) =>
    page.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) => (row.querySelector('.bo-identity__label, .bo-celltitle') as HTMLElement | null)?.innerText.trim() ?? '')
    );
  const names = (payload: Json) => rowsOf(payload).map((row) => String(row.name).trim());

  test('Companies: every column sorts ascending → descending → default, one column at a time, across pages', async ({ page }) => {
    const [byCountAsc, byCountDesc, byDefault, byNameDesc, byNameDescPage2] = await Promise.all([
      cms('/companies.json?sort=properties&dir=asc'),
      cms('/companies.json?sort=properties&dir=desc'),
      cms('/companies.json'),
      cms('/companies.json?sort=name&dir=desc'),
      cms('/companies.json?sort=name&dir=desc&page=2')
    ]);
    const audited = audit(page);
    await signIn(page);
    await page.goto('/companies');
    await hydrated(page, 'th button');

    for (const column of ['Company', 'Status', 'PMS Provider', 'Properties']) {
      await expect(header(page, column)).toHaveAttribute('aria-sort', 'none');
    }
    expect(await titles(page)).toEqual(names(byDefault));

    await sortBy(page, 'Properties');
    await expect(page).toHaveURL(/\/companies\?sort=properties&dir=asc$/, { timeout: 20_000 });
    await expect(header(page, 'Properties')).toHaveAttribute('aria-sort', 'ascending');
    expect(await titles(page)).toEqual(names(byCountAsc));
    const ascending = (await cellTexts(page, 3)).map(Number);
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));

    await sortBy(page, 'Properties');
    await expect(page).toHaveURL(/\/companies\?sort=properties&dir=desc$/, { timeout: 20_000 });
    await expect(header(page, 'Properties')).toHaveAttribute('aria-sort', 'descending');
    expect(await titles(page)).toEqual(names(byCountDesc));
    const descending = (await cellTexts(page, 3)).map(Number);
    expect(descending).toEqual([...descending].sort((a, b) => b - a));

    await sortBy(page, 'Properties');
    await expect(page).toHaveURL(/\/companies$/, { timeout: 20_000 });
    await expect(header(page, 'Properties')).toHaveAttribute('aria-sort', 'none');
    expect(await titles(page)).toEqual(names(byDefault));

    // Another column takes over, and paging keeps the order.
    await sortBy(page, 'Properties');
    await sortBy(page, 'Company');
    await expect(header(page, 'Company')).toHaveAttribute('aria-sort', 'ascending');
    await expect(header(page, 'Properties')).toHaveAttribute('aria-sort', 'none');
    await sortBy(page, 'Company');
    expect(await titles(page)).toEqual(names(byNameDesc));
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/sort=name&dir=desc&page=2/, { timeout: 20_000 });
    await expect.poll(() => titles(page)).toEqual(names(byNameDescPage2));
    audited.clean();
  });

  test('Properties: Status sorts by the lifecycle, Data Provider by its label with empty values last, and search keeps the sort', async ({ page }) => {
    const first = await cms('/communities.json?sort=data_provider&dir=asc');
    const lastPage = Number(((first.meta as Json).pagination as Json).total_pages);
    const [statusAsc, statusDesc, providerAscLast, providerDescLast, hazelByStatus] = await Promise.all([
      cms('/communities.json?sort=status&dir=asc'),
      cms('/communities.json?sort=status&dir=desc'),
      cms(`/communities.json?sort=data_provider&dir=asc&page=${lastPage}`),
      cms(`/communities.json?sort=data_provider&dir=desc&page=${lastPage}`),
      cms('/communities.json?q=hazel&sort=status&dir=desc')
    ]);
    const audited = audit(page);
    await signIn(page);
    await page.goto('/properties');
    await hydrated(page, 'th button');

    // Go To and Products have no order to offer.
    await expect(page.locator('th', { hasText: 'Go To' }).getByRole('button')).toHaveCount(0);
    await expect(page.locator('th', { hasText: 'Products' }).getByRole('button')).toHaveCount(0);

    await sortBy(page, 'Status');
    await expect(header(page, 'Status')).toHaveAttribute('aria-sort', 'ascending');
    expect(await titles(page)).toEqual(names(statusAsc));
    await expect(page.locator('tbody tr').first()).toContainText('Installed');
    await sortBy(page, 'Status');
    expect(await titles(page)).toEqual(names(statusDesc));
    await expect(page.locator('tbody tr').first()).toContainText('Released');
    await sortBy(page, 'Status');
    await expect(page).toHaveURL(/\/properties$/, { timeout: 20_000 });

    // Properties with no provider end the list in both directions.
    for (const [dir, expected] of [['asc', providerAscLast], ['desc', providerDescLast]] as const) {
      await page.goto(`/properties?sort=data_provider&dir=${dir}&page=${lastPage}`);
      await hydrated(page, 'th button');
      await expect(header(page, 'Data Provider')).toHaveAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
      expect(await titles(page)).toEqual(names(expected));
      expect((await cellTexts(page, 4)).at(-1)).toBe('Not connected');
    }

    // Search narrows the sorted list; the sort stays in the URL.
    await page.goto('/properties?sort=status&dir=desc');
    await hydrated(page, 'th button');
    await page.getByPlaceholder('Search properties').fill('hazel');
    await expect(page).toHaveURL(/q=hazel/, { timeout: 20_000 });
    await expect(page).toHaveURL(/sort=status&dir=desc/, { timeout: 20_000 });
    await expect.poll(() => titles(page)).toEqual(names(hazelByStatus));
    audited.clean();
  });

  /* ---------------- Map & Plotting ---------------- */

  test('Map & Plotting: a one-building property shows its Building pill, selected, and clicking it keeps the floor', async ({ page }) => {
    const plates = rowsOf(await cms(`/communities/${HAZEL}/floorplates.json`));
    const audited = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/map`);
    await hydrated(page, '.bo-map__tool');

    const pills = page.locator('.bo-map__pills [role="tab"]');
    await expect(pills).toHaveCount(1);
    await expect(pills.first()).toHaveAttribute('aria-selected', 'true');
    await expect(pills.first().locator('.bo-map__pillcount')).toHaveText(String(plates.length));
    await expect(page.getByText(`${plates.length} floorplates`, { exact: false })).toBeVisible();

    await page.locator('.bo-map__levels [role="tab"]').nth(4).click();
    const selected = page.locator('.bo-map__levels [role="tab"][aria-selected="true"]');
    await expect(selected).toContainText('Floor 5');
    await pills.first().click();
    await expect(selected).toContainText('Floor 5');
    audited.clean();
  });
});
