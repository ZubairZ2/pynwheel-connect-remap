import { expect, test, type Page } from '@playwright/test';

/**
 * How Map & Plotting's floor SVGs reach the browser since the October 11, 2026
 * performance work: gzipped, with an ETag the browser revalidates (a mount that
 * already holds the file gets a 304), preloaded by the page for a floor that
 * opens on its SVG, and not requested at all for a floor that opens on its
 * image. Driven against a running CMS with a minted Devise session
 * (PYN_CONNECT_PROGRESS.md §7); skipped without one:
 *
 *   PYN_CONNECT_E2E_RAILS_COOKIE    the `rails_cookie` value the mint script prints
 *   PYN_CONNECT_E2E_USER            the `user` JSON it prints
 *   PYNWHEEL_CMS_URL                the CMS the app talks to (default http://127.0.0.1:3000)
 *   PYN_CONNECT_E2E_PROPERTY        a property with a floor SVG (default 1468)
 *   PYN_CONNECT_E2E_JOHN            a property for the Unit Detail check (default 1411)
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const CMS = (process.env.PYNWHEEL_CMS_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const SVG_PROPERTY = process.env.PYN_CONNECT_E2E_PROPERTY ?? '1468';
const JOHN = process.env.PYN_CONNECT_E2E_JOHN ?? '1411';

type Json = Record<string, unknown>;

test.describe('Map & Plotting: floor SVG delivery (real data)', () => {
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

  const hydrated = async (page: Page) =>
    page.waitForFunction(
      () => Array.from(document.querySelectorAll('.bo-map__tool')).some((node) => Object.keys(node).some((key) => key.startsWith('__reactFiber'))),
      null,
      { timeout: 120_000 }
    );

  const planShown = async (page: Page) =>
    page.waitForFunction(
      () =>
        !document.querySelector('.bo-map__surface .bo-loading--cover') &&
        (document.querySelector('[data-testid="plan-svg"] svg') || (document.querySelector('.bo-map__image') as HTMLImageElement | null)?.complete || document.querySelector('.bo-map__missing')),
      null,
      { timeout: 180_000 }
    );

  const firstSvgPlate = async () => {
    const plates = (await cms(`/communities/${SVG_PROPERTY}/floorplates.json`)).data as Json[];
    return plates.find((plate) => plate.svg) ?? null;
  };

  test('the plan-svg route answers gzipped with an ETag, and a matching If-None-Match with 304', async ({ page }) => {
    test.setTimeout(240_000);
    const plate = await firstSvgPlate();
    test.skip(!plate, `property ${SVG_PROPERTY} has no floor SVG in this database; set PYN_CONNECT_E2E_PROPERTY`);
    await signIn(page);
    const url = `/api/properties/${SVG_PROPERTY}/plan-svg?floorplate=${plate!.id}`;

    const first = await page.request.get(url, { headers: { 'Accept-Encoding': 'gzip' }, timeout: 180_000 });
    expect(first.status()).toBe(200);
    expect(first.headers()['content-type']).toContain('image/svg+xml');
    expect(first.headers()['content-encoding']).toBe('gzip');
    expect(first.headers()['cache-control']).toContain('no-cache');
    const etag = first.headers().etag;
    expect(etag).toMatch(/^"plan-[0-9a-f]+"$/);
    const body = await first.text();
    expect(body).toMatch(/<svg[\s>]/i);
    // Fewer bytes on the wire than the document itself.
    expect(Number(first.headers()['content-length'])).toBeLessThan(body.length);

    const second = await page.request.get(url, { headers: { 'If-None-Match': etag }, timeout: 180_000 });
    expect(second.status()).toBe(304);
    expect(second.headers().etag).toBe(etag);
    expect((await second.body()).length).toBe(0);

    // A Retry goes past every cache: `fresh=1` with the same validator answers the file again.
    const fresh = await page.request.get(`${url}&fresh=1`, { headers: { 'If-None-Match': etag }, timeout: 180_000 });
    expect(fresh.status()).toBe(200);
    expect(fresh.headers().etag).toBe(etag);
  });

  test('a floor that opens on its image does not download its SVG until the Floor SVG layer is picked', async ({ page }) => {
    test.setTimeout(240_000);
    const plates = (await cms(`/communities/${SVG_PROPERTY}/floorplates.json`)).data as Json[];
    const plate = plates.find((row) => row.svg && row.image) ?? null;
    test.skip(!plate, `property ${SVG_PROPERTY} has no floorplate with both files; set PYN_CONNECT_E2E_PROPERTY`);
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/plan-svg')) requests.push(request.url());
    });
    await signIn(page);
    await page.goto(`/properties/${SVG_PROPERTY}/map?level=floorplate%3A${plate!.id}`);
    await hydrated(page);
    await planShown(page);
    // The switch offers "Floor SVG" and "Background image"; the floor opens on the image when the SVG button is not the pressed one.
    const layer = page.getByTestId('layer-switch');
    const onImage = (await layer.count()) > 0 && (await layer.getByRole('button', { name: 'Floor SVG' }).getAttribute('aria-pressed')) !== 'true';
    test.skip(!onImage, `floorplate ${plate!.id} opens on its SVG in this database (its stored plotting is on the SVG)`);
    expect(requests.filter((url) => url.includes(`floorplate=${plate!.id}`))).toHaveLength(0);

    await layer.getByRole('button', { name: 'Floor SVG' }).click();
    await expect(page.getByTestId('plan-svg').locator('svg')).toHaveCount(1, { timeout: 180_000 });
    expect(requests.filter((url) => url.includes(`floorplate=${plate!.id}`))).toHaveLength(1);
  });

  test('a floor that opens on its SVG is preloaded by the page and requested once; a reload revalidates (304)', async ({ page }) => {
    test.setTimeout(300_000);
    const plates = (await cms(`/communities/${SVG_PROPERTY}/floorplates.json`)).data as Json[];
    const plate = plates.find((row) => row.svg && !row.image) ?? null;
    test.skip(!plate, `property ${SVG_PROPERTY} has no SVG-only floorplate; the preload applies to a floor that opens on its SVG`);
    const responses: { url: string; status: number }[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/plan-svg')) responses.push({ url: response.url(), status: response.status() });
    });
    await signIn(page);
    await page.goto(`/properties/${SVG_PROPERTY}/map?level=floorplate%3A${plate!.id}`);
    await expect(page.locator(`link[rel="preload"][as="fetch"][href*="plan-svg?floorplate=${plate!.id}"]`)).toHaveCount(1);
    await hydrated(page);
    await expect(page.getByTestId('plan-svg').locator('svg')).toHaveCount(1, { timeout: 180_000 });
    const firstOpen = responses.filter((row) => row.url.includes(`floorplate=${plate!.id}`));
    expect(firstOpen).toHaveLength(1);
    expect(firstOpen[0].status).toBe(200);

    responses.length = 0;
    await page.reload();
    await hydrated(page);
    await expect(page.getByTestId('plan-svg').locator('svg')).toHaveCount(1, { timeout: 180_000 });
    const reload = responses.filter((row) => row.url.includes(`floorplate=${plate!.id}`));
    expect(reload).toHaveLength(1);
    expect(reload[0].status).toBe(304);
  });

  test('Unit Detail opens on one unit read as a page of one', async ({ page }) => {
    test.setTimeout(120_000);
    const first = ((await cms(`/communities/${JOHN}/units.json?page=1&per_page=1`)).data as Json[])[0];
    test.skip(!first, `property ${JOHN} has no units`);
    const one = (await cms(`/communities/${JOHN}/units.json?page=1&per_page=1&ids=${first.id}`)).data as Json[];
    expect(one.map((row) => row.id)).toEqual([first.id]);
    await signIn(page);
    await page.goto(`/properties/${JOHN}/units/${first.id}`);
    await expect(page.locator('.bo-content h2').first()).toContainText(String(first.marketing_name), { timeout: 60_000 });
    // The document carries the one unit, not the property's whole listing.
    const html = await page.content();
    expect(html.length).toBeLessThan(200_000);
  });
});
