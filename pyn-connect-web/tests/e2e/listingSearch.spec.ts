import { expect, test, type Page, type Request } from '@playwright/test';

/**
 * The Companies and Properties listings' search, filters and paging as one
 * request each (`useServerListing`), on real data:
 *
 * - typing is debounced, a newer search aborts the older request, and a late
 *   answer to an older search never writes back — not the rows, not the box,
 *   not the URL;
 * - clearing the search cannot be undone by an older request landing;
 * - a filter, a page or a sort always request with the current search;
 * - long filter lists carry a search box that narrows the options as you type.
 *
 * Driven against a running CMS with a minted Devise session (PYN_CONNECT_PROGRESS.md §7):
 *
 *   PYN_CONNECT_E2E_RAILS_COOKIE   the `rails_cookie` value the mint script prints
 *   PYN_CONNECT_E2E_USER           the `user` JSON it prints
 *   PYNWHEEL_CMS_URL               the CMS the app talks to (default http://127.0.0.1:3000)
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const CMS = (process.env.PYNWHEEL_CMS_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

type Json = Record<string, unknown>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test.describe('Listing search, filters and paging (real data)', () => {
  test.skip(!railsCookie || !user, 'PYN_CONNECT_E2E_RAILS_COOKIE / PYN_CONNECT_E2E_USER not set');

  const cms = async (path: string): Promise<Json> => {
    const response = await fetch(`${CMS}${path}`, { headers: { Cookie: railsCookie!, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${path} answered ${response.status}`);
    return (await response.json()) as Json;
  };
  const names = (payload: Json) => (payload.data as Json[]).map((row) => String(row.name).trim());

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

  /** Every listing request the page made, with the non-GET ones and page errors, which must stay empty. */
  const audit = (page: Page, listing: 'companies' | 'properties') => {
    const requests: Request[] = [];
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === `/api/listings/${listing}`) requests.push(request);
      if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    return {
      requests,
      params: () => requests.map((request) => new URL(request.url()).searchParams),
      clean: () => {
        expect(errors, 'page errors').toEqual([]);
        expect(writes, 'non-GET requests').toEqual([]);
      }
    };
  };

  const isListing = (listing: string) => (url: URL) => url.pathname === `/api/listings/${listing}`;
  /** The rows' names; the "nothing matches" row has none and is left out. */
  const titles = (page: Page) =>
    page.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) => (row.querySelector('.bo-identity__label, .bo-celltitle') as HTMLElement | null)?.innerText.trim() ?? '').filter(Boolean)
    );
  const settled = async (page: Page) => expect(page.locator('.bo-panel[aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 });

  /**
   * The race the brief describes: "ha" is requested, the user types "z", "haz"
   * is requested and answers first, then the old "ha" answer arrives. The box,
   * the rows and the URL must all stay with "haz".
   */
  const raceTest = (listing: 'companies' | 'properties', path: string, placeholder: string, jsonPath: string) =>
    test(`${listing}: a slow older search never overwrites a newer one — the box, the rows and the URL stay with the latest`, async ({ page }) => {
      const [forHaz, forHa] = await Promise.all([cms(`${jsonPath}?per_page=25&q=haz`), cms(`${jsonPath}?per_page=25&q=ha`)]);
      expect(names(forHa), 'the fixture needs "ha" and "haz" to differ').not.toEqual(names(forHaz));
      const audited = audit(page, listing);
      await signIn(page);
      // "ha" takes 2.5 s to answer; everything else answers at once.
      await page.route(isListing(listing), async (route) => {
        const q = new URL(route.request().url()).searchParams.get('q');
        if (q === 'ha') await sleep(2500);
        await route.continue().catch(() => undefined);
      });
      await page.goto(path);
      await hydrated(page);
      const input = page.getByRole('searchbox', { name: placeholder, exact: true });

      const requestedHa = page.waitForRequest((request) => isListing(listing)(new URL(request.url())) && new URL(request.url()).searchParams.get('q') === 'ha');
      await input.pressSequentially('ha', { delay: 60 });
      const requestHa = await requestedHa;
      // Typing is debounced: "h" alone was never requested.
      expect(audited.params().map((p) => p.get('q'))).toEqual(['ha']);

      const answeredHaz = page.waitForResponse((response) => isListing(listing)(new URL(response.url())) && new URL(response.url()).searchParams.get('q') === 'haz');
      await input.press('z');
      await answeredHaz;
      await settled(page);
      await expect(input).toHaveValue('haz');
      await expect(page).toHaveURL(/[?&]q=haz(&|$)/);
      expect(await titles(page)).toEqual(names(forHaz));

      // Now the time the old answer would have arrived: nothing moves backwards.
      await sleep(3000);
      await expect(input).toHaveValue('haz');
      await expect(page).toHaveURL(/[?&]q=haz(&|$)/);
      expect(await titles(page)).toEqual(names(forHaz));
      await expect(page.locator('.bo-panel[aria-busy="true"]')).toHaveCount(0);
      // The older request was cancelled (or, had it landed, ignored — the rows above say so either way).
      const failure = requestHa.failure();
      expect(failure == null || /ERR_ABORTED/.test(failure.errorText), `older request: ${failure?.errorText ?? 'answered'}`).toBe(true);
      audited.clean();
    });

  raceTest('companies', '/companies', 'Search companies', '/companies.json');
  raceTest('properties', '/properties', 'Search properties', '/communities.json');

  test('companies: clearing the search cannot be undone by an older search landing late', async ({ page }) => {
    const all = names(await cms('/companies.json?per_page=25'));
    const audited = audit(page, 'companies');
    await signIn(page);
    await page.route(isListing('companies'), async (route) => {
      if (new URL(route.request().url()).searchParams.get('q') === 'ha') await sleep(2500);
      await route.continue().catch(() => undefined);
    });
    await page.goto('/companies');
    await hydrated(page);
    const input = page.getByRole('searchbox', { name: 'Search companies', exact: true });
    const requestedHa = page.waitForRequest((request) => isListing('companies')(new URL(request.url())) && new URL(request.url()).searchParams.get('q') === 'ha');
    await input.pressSequentially('ha', { delay: 60 });
    await requestedHa;
    const cleared = page.waitForResponse((response) => isListing('companies')(new URL(response.url())) && !new URL(response.url()).searchParams.get('q'));
    await input.fill('');
    await cleared;
    await settled(page);
    await expect(input).toHaveValue('');
    await expect(page).toHaveURL(/\/companies$/);
    expect(await titles(page)).toEqual(all);
    await sleep(3000);
    await expect(input).toHaveValue('');
    expect(await titles(page)).toEqual(all);
    audited.clean();
  });

  test('properties: a filter, a page and a sort always request with the current search, and a new search starts from page 1', async ({ page }) => {
    const audited = audit(page, 'properties');
    await signIn(page);
    await page.goto('/properties');
    await hydrated(page);
    const input = page.getByRole('searchbox', { name: 'Search properties', exact: true });

    // A search with more than one page of results.
    const searched = page.waitForResponse((response) => isListing('properties')(new URL(response.url())) && new URL(response.url()).searchParams.get('q') === 'the');
    await input.pressSequentially('the', { delay: 40 });
    await searched;
    await settled(page);
    const total = Number((await cms('/communities.json?per_page=25&q=the')).meta ? ((await cms('/communities.json?per_page=25&q=the')).meta as Json).total_count : 0);
    test.skip(total <= 25, 'the fixture needs more than one page of "the"');

    // Page 2 carries the search.
    const paged = page.waitForResponse((response) => isListing('properties')(new URL(response.url())) && new URL(response.url()).searchParams.get('page') === '2');
    await page.getByRole('button', { name: 'Next page' }).click();
    const pagedParams = new URL((await paged).url()).searchParams;
    expect(pagedParams.get('q')).toBe('the');
    await settled(page);
    expect(await titles(page)).toEqual(names(await cms('/communities.json?per_page=25&q=the&page=2')));
    await expect(page).toHaveURL(/q=the&page=2/);

    // A filter carries the search and starts from page 1.
    const filtered = page.waitForResponse((response) => isListing('properties')(new URL(response.url())) && !!new URL(response.url()).searchParams.get('stage'));
    await page.getByRole('button', { name: /^Status:/ }).click();
    await page.getByRole('checkbox', { name: 'Released' }).click();
    const filteredParams = new URL((await filtered).url()).searchParams;
    expect(filteredParams.get('q')).toBe('the');
    expect(filteredParams.get('page')).toBeNull();
    await page.keyboard.press('Escape');
    await settled(page);
    expect(await titles(page)).toEqual(names(await cms('/communities.json?per_page=25&q=the&stage=released')));

    // A sort keeps both.
    const sorted = page.waitForResponse((response) => isListing('properties')(new URL(response.url())) && new URL(response.url()).searchParams.get('sort') === 'name');
    await page.getByRole('button', { name: 'Property', exact: true }).click();
    const sortedParams = new URL((await sorted).url()).searchParams;
    expect(sortedParams.get('q')).toBe('the');
    expect(sortedParams.get('stage')).toBe('released');
    await settled(page);
    expect(await titles(page)).toEqual(names(await cms('/communities.json?per_page=25&q=the&stage=released&sort=name&dir=asc')));

    // A new search keeps the filter and the sort, from page 1.
    const again = page.waitForResponse((response) => isListing('properties')(new URL(response.url())) && new URL(response.url()).searchParams.get('q') === 'park');
    await input.fill('park');
    const againParams = new URL((await again).url()).searchParams;
    expect(againParams.get('stage')).toBe('released');
    expect(againParams.get('sort')).toBe('name');
    expect(againParams.get('page')).toBeNull();
    await settled(page);
    expect(await titles(page)).toEqual(names(await cms('/communities.json?per_page=25&q=park&stage=released&sort=name&dir=asc')));
    await expect(page).toHaveURL(/q=park&stage=released&sort=name&dir=asc$/);

    // Back returns to the previous state, with its rows.
    await page.goBack();
    await expect(page).toHaveURL(/q=the&stage=released&sort=name&dir=asc$/);
    await settled(page);
    await expect(input).toHaveValue('the');
    expect(await titles(page)).toEqual(names(await cms('/communities.json?per_page=25&q=the&stage=released&sort=name&dir=asc')));
    audited.clean();
  });

  test('properties: the Companies and Data Providers filters are searchable; the short Status and Products lists are not', async ({ page }) => {
    const companies = ((await cms('/communities.json?per_page=1')).meta as Json).filters as { companies: { id: number; name: string }[] };
    test.skip(companies.companies.length < 6, 'the fixture needs a long company list');
    const audited = audit(page, 'properties');
    await signIn(page);
    await page.goto('/properties');
    await hydrated(page);

    const panel = (name: string) => page.getByRole('group', { name, exact: true });
    await page.getByRole('button', { name: /^Status:/ }).click();
    await expect(panel('Status').getByRole('searchbox')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Products:/ }).click();
    await expect(panel('Products').getByRole('searchbox')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Companies:/ }).click();
    const search = panel('Companies').getByRole('searchbox', { name: 'Search companies…' });
    await expect(search).toBeFocused();
    await expect(panel('Companies').getByRole('checkbox')).toHaveCount(companies.companies.length);

    // Case-insensitive, anywhere in the name; the list narrows at once and the panel stays open.
    const target = companies.companies.find((company) => company.name.trim().length >= 5)!;
    const fragment = target.name.trim().slice(1, 5);
    await search.pressSequentially(fragment.toUpperCase(), { delay: 30 });
    const expected = companies.companies.filter((company) => company.name.toLowerCase().includes(fragment.toLowerCase()));
    await expect(panel('Companies').getByRole('checkbox')).toHaveCount(expected.length);
    await expect(panel('Companies')).toBeVisible();
    await expect(page.locator('.bo-multifilter__summary')).toContainText(`${expected.length} of ${companies.companies.length} shown`);

    // Selecting a narrowed option applies the filter; the selection survives the search box.
    const picked = panel('Companies').getByRole('checkbox', { name: target.name.trim(), exact: true });
    const filtered = page.waitForResponse((response) => isListing('properties')(new URL(response.url())) && new URL(response.url()).searchParams.get('company_id') === String(target.id));
    await picked.click();
    await filtered;
    await expect(picked).toHaveAttribute('aria-checked', 'true');
    await expect(page).toHaveURL(new RegExp(`company_id=${target.id}`));
    // Clearing the box shows every option again, the pick still ticked; Escape closes; reopening starts empty.
    await page.getByRole('button', { name: 'Clear the search' }).click();
    await expect(panel('Companies').getByRole('checkbox')).toHaveCount(companies.companies.length);
    await expect(panel('Companies').getByRole('checkbox', { name: target.name.trim(), exact: true })).toHaveAttribute('aria-checked', 'true');
    await search.fill('zzzzzz-no-such-company');
    await expect(page.locator('.bo-multifilter__empty')).toContainText('Nothing matches');
    await page.keyboard.press('Escape');
    await expect(panel('Companies')).toHaveCount(0);
    await page.getByRole('button', { name: /^Companies:/ }).click();
    await expect(panel('Companies').getByRole('searchbox', { name: 'Search companies…' })).toHaveValue('');
    await expect(panel('Companies').getByRole('checkbox')).toHaveCount(companies.companies.length);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Data Providers:/ }).click();
    await expect(panel('Data Providers').getByRole('searchbox', { name: 'Search data providers…' })).toBeVisible();
    await page.keyboard.press('Escape');
    await settled(page);
    audited.clean();
  });

  test('companies: PMS Provider is searchable, Status and Properties are not, and Enter ticks the first match', async ({ page }) => {
    const audited = audit(page, 'companies');
    await signIn(page);
    await page.goto('/companies');
    await hydrated(page);
    const panel = (name: string) => page.getByRole('group', { name, exact: true });
    await page.getByRole('button', { name: /^Status:/ }).click();
    await expect(panel('Status').getByRole('searchbox')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Properties:/ }).click();
    await expect(panel('Properties').getByRole('searchbox')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^PMS Provider:/ }).click();
    const search = panel('PMS Provider').getByRole('searchbox', { name: 'Search pms provider…' });
    await expect(search).toBeFocused();
    const applied = page.waitForResponse((response) => isListing('companies')(new URL(response.url())) && new URL(response.url()).searchParams.get('pms_provider') === 'resman');
    await search.pressSequentially('resm', { delay: 30 });
    await expect(panel('PMS Provider').getByRole('checkbox')).toHaveCount(1);
    await search.press('Enter');
    await applied;
    await expect(panel('PMS Provider').getByRole('checkbox', { name: 'ResMan' })).toHaveAttribute('aria-checked', 'true');
    await expect(page).toHaveURL(/pms_provider=resman/);
    await page.keyboard.press('Escape');
    await settled(page);
    expect(await titles(page)).toEqual(names(await cms('/companies.json?per_page=25&pms_provider=resman')));
    audited.clean();
  });
});
