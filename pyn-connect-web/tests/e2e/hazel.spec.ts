import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Hazel (property 1618) end to end on real data — the QA property of the
 * September 27 brief — driven against a running CMS with a minted Devise
 * session (PYN_CONNECT_PROGRESS.md §7). The suite skips itself when the
 * session is not provided:
 *
 *   PYN_CONNECT_E2E_RAILS_COOKIE   the `rails_cookie` value the mint script prints
 *   PYN_CONNECT_E2E_USER           the `user` JSON it prints
 *   PYNWHEEL_CMS_URL               the CMS the app talks to (default http://127.0.0.1:3000)
 *
 * The counts the screens must show are read from the CMS's own JSON at the
 * start of the run (units, floor plans, floorplates, amenities, tour stops,
 * elevators), so the suite asserts "the UI equals the database" whichever
 * local dump the CMS runs on (`pynwheel_development`: 238 units, 13 stops;
 * `pynwheel_prod`: 244 units, 9 stops). What is the same in every dump and
 * asserted literally: Hazel is a QuadReal property at 4733 Hazel St, Burnaby
 * BC, with 31 floorplates (floor images, no floor SVG) and 6 amenities —
 * Fitness Centre carries 2 gallery photos, Penthouse South Lounge 4 and is
 * hidden from the stop list, Boardroom has no gallery and no video. Speer
 * Blvd. (203) has 3 floorplates and The Wave (816) 19, for the strip's
 * boundaries; PYN_CONNECT_E2E_PROPERTY names a property with a floor SVG for
 * the canvas loading state (default 1468; skipped when that property has no
 * SVG in the running dump). Every test ends on the same assertion: the browser
 * sent nothing but GETs.
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const CMS = (process.env.PYNWHEEL_CMS_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const HAZEL = process.env.PYN_CONNECT_E2E_HAZEL ?? '1618';
const THREE_PLATES = process.env.PYN_CONNECT_E2E_THREE_PLATES ?? '203';
const NINETEEN_PLATES = process.env.PYN_CONNECT_E2E_NINETEEN_PLATES ?? '816';
const SVG_PROPERTY = process.env.PYN_CONNECT_E2E_PROPERTY ?? '1468';

/** A 1 × 1 PNG, served in place of a photo when a test only needs the request to finish at a known moment. */
const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

type Json = Record<string, unknown>;

/** What the CMS holds for Hazel, read once from the same JSON the screens read. */
interface HazelFacts {
  company: string;
  units: number;
  floorplans: number;
  plates: number;
  platesWithoutSvg: number;
  amenities: number;
  stops: number;
  hiddenStops: number;
  firstStopHidden: boolean;
  elevators: number;
}

test.describe('Hazel (real data)', () => {
  test.skip(!railsCookie || !user, 'PYN_CONNECT_E2E_RAILS_COOKIE / PYN_CONNECT_E2E_USER not set');

  let facts: HazelFacts;

  /** One CMS JSON read with the minted session (the same cookie the app replays). */
  const cms = async (path: string): Promise<Json> => {
    const response = await fetch(`${CMS}${path}`, { headers: { Cookie: railsCookie!, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${path} answered ${response.status}`);
    return (await response.json()) as Json;
  };

  test.beforeAll(async () => {
    if (!railsCookie || !user) return;
    const [units, floorplans, floorplates, amenities, wayfinding] = await Promise.all([
      cms(`/communities/${HAZEL}/units.json?per_page=1`),
      cms(`/communities/${HAZEL}/floorplans.json`),
      cms(`/communities/${HAZEL}/floorplates.json`),
      cms(`/communities/${HAZEL}/amenities.json`),
      cms(`/automate_plotting.json?community_id=${HAZEL}`)
    ]);
    const plates = floorplates.data as Json[];
    const meta = floorplates.meta as Json;
    // The wayfinding JSON sits in the same envelope (`data` holds the graph).
    const graph = ((wayfinding.data as Json | undefined) ?? wayfinding) as Json;
    const stops = [...((graph.tour_stops as Json[]) ?? [])].sort(
      (a, b) => Number(a.sort ?? 0) - Number(b.sort ?? 0) || Number(a.id) - Number(b.id)
    );
    facts = {
      company: String((meta.property as Json).company_name),
      units: Number((units.meta as Json).total_count),
      floorplans: (floorplans.data as Json[]).length,
      plates: plates.length,
      platesWithoutSvg: plates.filter((plate) => !plate.svg).length,
      amenities: (amenities.data as Json[]).length,
      stops: stops.length,
      hiddenStops: stops.filter((stop) => stop.display_stop === false).length,
      firstStopHidden: stops[0]?.display_stop === false,
      elevators: ((graph.elevators as Json[]) ?? []).length
    };
  });

  const signIn = async (page: Page) => {
    const origin = new URL(String(test.info().project.use.baseURL ?? 'http://127.0.0.1:3001'));
    await page.context().addCookies([
      { name: 'pyn_connect_rails_session', value: encodeURIComponent(railsCookie!), domain: origin.hostname, path: '/', httpOnly: true },
      { name: 'pyn_connect_user', value: encodeURIComponent(user!), domain: origin.hostname, path: '/', httpOnly: true }
    ]);
  };

  /** Waits until React has attached to the screen's own controls (a `__reactFiber*` key on the element). */
  const hydrated = async (page: Page, selector = 'main button, main a') => {
    await page.waitForFunction(
      (s) => Array.from(document.querySelectorAll(s)).some((node) => Object.keys(node).some((key) => key.startsWith('__reactFiber'))),
      selector,
      { timeout: 90_000 }
    );
  };

  /** Records every non-GET request, page error, and console error or warning — including React's hydration messages. */
  const audit = (page: Page) => {
    const writes: string[] = [];
    const errors: string[] = [];
    const console_: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') console_.push(`${message.type()}: ${message.text()}`);
    });
    return { writes, errors, console: console_ };
  };

  const clean = (audited: ReturnType<typeof audit>) => {
    expect(audited.errors, 'page errors').toEqual([]);
    expect(audited.writes, 'non-GET requests').toEqual([]);
  };

  /** The floorplate strip's geometry: scroll position, its limit, the arrows' disabled flags and whether the active tab is in view. */
  const strip = (page: Page) =>
    page.evaluate(() => {
      const element = document.querySelector<HTMLElement>('.bo-map__levels')!;
      const row = document.querySelector<HTMLElement>('.bo-map__levelsrow')!;
      const active = element.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      const bounds = element.getBoundingClientRect();
      const rect = active?.getBoundingClientRect();
      return {
        flexWrap: getComputedStyle(element).flexWrap,
        rowHeight: row.getBoundingClientRect().height,
        scrollLeft: Math.round(element.scrollLeft),
        max: element.scrollWidth - element.clientWidth,
        scrollable: element.scrollWidth > element.clientWidth + 2,
        arrowsDisabled: Array.from(document.querySelectorAll<HTMLButtonElement>('.bo-map__levelscroll')).map((button) => button.disabled),
        activeVisible: !!rect && rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1,
        activeText: active?.innerText.replace(/\s+/g, ' ') ?? ''
      };
    });

  const scrollRight = (page: Page) => page.getByRole('button', { name: 'Scroll floorplates right' });
  const scrollLeft = (page: Page) => page.getByRole('button', { name: 'Scroll floorplates left' });

  /** Every `<img>` in `scope` has finished with pixels (S3 photos are large; give them time). */
  const imagesLoaded = async (scope: Locator) => {
    await expect
      .poll(
        () =>
          scope.evaluateAll((nodes) =>
            nodes.every((node) => {
              const image = node as HTMLImageElement;
              return image.complete && image.naturalWidth > 0;
            })
          ),
        { timeout: 90_000 }
      )
      .toBe(true);
  };

  /** Opens a MultiFilter (its button is named "{label}: {shown}") and ticks one option. */
  const pick = async (page: Page, label: string, option: string) => {
    await page.getByRole('button', { name: new RegExp(`^${label}: `) }).click();
    await page.getByRole('checkbox', { name: option, exact: true }).click();
    await page.getByRole('button', { name: 'Done' }).click();
  };

  const clearFilter = async (page: Page, label: string) => {
    await page.getByRole('button', { name: new RegExp(`^${label}: `) }).click();
    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByRole('button', { name: 'Done' }).click();
  };

  test('Property Detail shows the Hazel record: identity, address, contacts, configuration', async ({ page }) => {
    const audited = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}`);
    await hydrated(page);

    await expect(page.getByRole('heading', { level: 2, name: 'Hazel' })).toBeVisible();
    await expect(page.getByText(`${facts.company} · Burnaby, BC · ${facts.units} units`)).toBeVisible();
    await expect(page.getByText('4733 Hazel St')).toBeVisible();
    await expect(page.getByText('Burnaby, BC V5H 0J7')).toBeVisible();
    // The on-site team block is there (a manager in one dump, "Unassigned" in another).
    await expect(page.getByText('Property Manager', { exact: true })).toBeVisible();
    await expect(page.getByText('Manager Email', { exact: true })).toBeVisible();
    await expect(page.getByText(`${facts.stops} tour stops`)).toBeVisible();
    await expect(page.getByText(`${facts.units} units · ${facts.plates} floorplates`)).toBeVisible();
    // The Inventory panel's four stat cards read the same records the tabs list; the settings cards name the property's switches.
    const main = page.locator('main');
    await expect(main).toContainText('Manage Inventory');
    await expect(main).toContainText(`${facts.units}Units${facts.floorplans}Floorplans${facts.plates}Floorplates${facts.amenities}Amenities`);
    await expect(main).toContainText('Enable Locks');
    await expect(main).toContainText('Automate Wayfinding');
    await expect(main).toContainText('Rent.com');
    clean(audited);
  });

  test('Inventory carries the counts of every listing', async ({ page }) => {
    const audited = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/inventory`);
    await hydrated(page, '.bo-inv__tab');

    await expect(page.getByRole('heading', { level: 2, name: 'Property Inventory' })).toBeVisible();
    await expect(page.getByText(`${facts.plates} floorplates · ${facts.platesWithoutSvg} without a floor SVG · ${facts.stops} tour stops`)).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Floorplates/ })).toContainText(String(facts.plates));
    await expect(page.getByRole('tab', { name: /^Floorplans/ })).toContainText(String(facts.floorplans));
    await expect(page.getByRole('tab', { name: /^Units/ })).toContainText(String(facts.units));
    await expect(page.getByRole('tab', { name: /^Amenities/ })).toContainText(String(facts.amenities));
    clean(audited);
  });

  test('Amenities: the real cards, search, filters, the Edit dialog with its gallery, and the image viewer', async ({ page }) => {
    test.setTimeout(240_000);
    const audited = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/inventory?tab=amenities`);
    await hydrated(page, '.bo-inv__tab');

    const cards = page.locator('.bo-record');
    await expect(cards).toHaveCount(6);
    await expect(page.locator('.bo-inv__showing')).toHaveText('6 amenities');

    // Boardroom: type, plotted, in the stop list, building, floor, a Zerv lock shown by its label, no video, no gallery.
    const boardroom = cards.filter({ hasText: 'Boardroom' });
    await expect(boardroom).toContainText('Conference Room');
    await expect(boardroom).toContainText('Plotted');
    await expect(boardroom).toContainText('In Stops List');
    await expect(boardroom).toContainText('Floor 31');
    await expect(boardroom).toContainText('Pynwheel Access');
    await expect(boardroom).toContainText('None');
    await expect(boardroom).toContainText('Empty');
    // Fitness Centre: a 3D Tour video link and a 2-photo gallery; Penthouse South Lounge: hidden from stops, 4 photos.
    const fitness = cards.filter({ hasText: 'Fitness Centre' });
    await expect(fitness.getByRole('link', { name: /Open the video/ })).toHaveAttribute('href', /matterport/);
    await expect(fitness).toContainText('2 images');
    const lounge = cards.filter({ hasText: 'Penthouse South Lounge' });
    await expect(lounge).toContainText('Hidden from Stops');
    await expect(lounge).toContainText('4 images');
    // Every card thumbnail is a real S3 file, and none failed.
    await expect(page.locator('.bo-thumb__image')).toHaveCount(6);
    await expect(page.locator('.bo-thumb__missing')).toHaveCount(0);

    // Search and filters over the real values.
    const search = page.getByPlaceholder('Search name, type or location');
    await search.fill('Lounge');
    await expect(cards).toHaveCount(3);
    await search.fill('');
    await expect(cards).toHaveCount(6);
    await pick(page, 'Type', 'Conference Room');
    await expect(cards).toHaveCount(1);
    await clearFilter(page, 'Type');
    await pick(page, 'Floor', 'Floor 1');
    await expect(cards).toHaveCount(2);
    await clearFilter(page, 'Floor');
    await expect(cards).toHaveCount(6);

    // Edit: the dialog holds the stored values and the gallery's four real photos, in the CMS's sort order, none "unavailable".
    await lounge.getByRole('button', { name: /^Edit/ }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Edit Amenity');
    // The amenity form waits for the units listing (its Building list names unit buildings), read on demand.
    await expect(dialog.locator('input.bo-field').first()).toHaveValue('Penthouse South Lounge', { timeout: 30_000 });
    const gallery = dialog.locator('.bo-dlg__interior');
    await expect(gallery).toHaveCount(4);
    await expect(gallery.nth(0)).toContainText('Chef Kitchen');
    await expect(gallery.nth(0)).toContainText('Lead');
    await expect(gallery.nth(1)).toContainText('Work Space');
    await expect(gallery.nth(2)).toContainText('Package Lockers');
    await expect(gallery.nth(3)).toContainText('Dog Spa');
    await expect(dialog).toContainText('4 images');
    // The photos themselves (the loading indicator over a still-streaming photo is an image too).
    const galleryImages = gallery.locator('img:not(.bo-loading__cat)');
    await expect(galleryImages).toHaveCount(4);
    for (const image of await galleryImages.all()) await expect(image).toHaveAttribute('src', /amazonaws\.com\/uploads\/amenity_gallery\/image\//);
    await imagesLoaded(galleryImages);
    await expect(dialog.locator('.bo-safeimg__missing')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // The eye: the viewer over the amenity's own image and its gallery, with position, arrows, keys and close.
    await fitness.locator('.bo-thumb').hover();
    await fitness.getByRole('button', { name: /^View/ }).first().click();
    const viewer = page.locator('.bo-viewer');
    await expect(viewer).toContainText('Fitness Centre — Amenity image');
    await expect(viewer).toContainText('1 of 3');
    await viewer.getByRole('button', { name: 'Next image' }).click();
    await expect(viewer).toContainText('Fitness Centre — Photo 1 · Cardio equipment');
    await expect(viewer).toContainText('2 of 3');
    await page.keyboard.press('ArrowRight');
    await expect(viewer).toContainText('Fitness Centre — Photo 2 · Fitness');
    await expect(viewer).toContainText('3 of 3');
    await viewer.getByRole('button', { name: 'Previous image' }).click();
    await expect(viewer).toContainText('2 of 3');
    await imagesLoaded(viewer.locator('.bo-viewer__image'));
    await expect(viewer.locator('.bo-viewer__missing')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // One image only: no position, no arrows.
    const lobby = cards.filter({ hasText: 'The Lobby' });
    await lobby.locator('.bo-thumb').hover();
    await lobby.getByRole('button', { name: /^View/ }).first().click();
    await expect(viewer).toContainText('The Lobby — Amenity image');
    await expect(viewer).not.toContainText(' of ');
    await expect(viewer.getByRole('button', { name: 'Next image' })).toHaveCount(0);
    await viewer.getByRole('button', { name: 'Close image' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // No image at all (every Hazel amenity has one, so the empty state is the Add dialog's): the drop zone, no thumbnail, no gallery.
    await page.getByRole('button', { name: 'Add Amenity' }).click();
    await expect(dialog).toContainText('Add Amenity');
    await expect(dialog).toContainText('Drag and drop, or');
    await expect(dialog.locator('.bo-upload__preview')).toHaveCount(0);
    await expect(dialog.locator('.bo-dlg__interior')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    clean(audited);
  });

  test('Amenity image viewer: a loading state while the file streams, and the failure text only when the request fails', async ({ page }) => {
    test.setTimeout(120_000);
    const audited = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/inventory?tab=amenities`);
    await hydrated(page, '.bo-inv__tab');

    // Photo 1 (gallery 969) answers after 1.5 s; photo 2 (gallery 968) never does.
    await page.route('**/uploads/amenity_gallery/image/969/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG });
    });
    await page.route('**/uploads/amenity_gallery/image/968/**', (route) => route.abort());

    const fitness = page.locator('.bo-record', { hasText: 'Fitness Centre' });
    await fitness.locator('.bo-thumb').hover();
    await fitness.getByRole('button', { name: /^View/ }).first().click();
    const viewer = page.locator('.bo-viewer');
    await viewer.getByRole('button', { name: 'Next image' }).click();
    await expect(viewer).toContainText('2 of 3');
    const cover = viewer.locator('.bo-loading--cover');
    await expect(cover).toBeVisible();
    await expect(cover).toContainText('Loading image…');
    await expect(cover.locator('img')).toHaveAttribute('src', '/images/loader.gif');
    // The veil dims the stage and the animation sits at its exact centre.
    const geometry = await cover.evaluate((element) => {
      const stage = element.parentElement!.getBoundingClientRect();
      const cat = element.querySelector('.bo-loading__cat')!.getBoundingClientRect();
      return {
        background: getComputedStyle(element).backgroundColor,
        dx: Math.abs(stage.left + stage.width / 2 - (cat.left + cat.width / 2)),
        dy: Math.abs(stage.top + stage.height / 2 - (cat.top + cat.height / 2))
      };
    });
    expect(geometry.background).toBe('rgba(23, 26, 33, 0.32)');
    expect(geometry.dx).toBeLessThan(1);
    expect(geometry.dy).toBeLessThan(1);
    await expect(cover).toHaveCount(0, { timeout: 15_000 });
    await expect(viewer.locator('.bo-viewer__image')).toBeVisible();
    await expect(viewer.locator('.bo-viewer__missing')).toHaveCount(0);

    await viewer.getByRole('button', { name: 'Next image' }).click();
    await expect(viewer).toContainText('3 of 3');
    await expect(viewer.locator('.bo-viewer__missing')).toHaveText('This image could not be loaded.');
    await expect(viewer.locator('.bo-loading--cover')).toHaveCount(0);
    await page.keyboard.press('Escape');
    clean(audited);
  });

  test('Map & Plotting: one horizontal floorplate strip with working arrows, boundaries and selection over 31 floorplates', async ({ page }) => {
    test.setTimeout(180_000);
    const audited = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/map`);
    await hydrated(page, '.bo-map__tool');

    const tabs = page.getByRole('tablist', { name: 'Floorplates' }).getByRole('tab');
    await expect(tabs).toHaveCount(31);
    // One row that scrolls, not a stack: the row stays under 120px tall for 31 cards.
    let geometry = await strip(page);
    expect(geometry.flexWrap).toBe('nowrap');
    expect(geometry.rowHeight).toBeLessThan(120);
    expect(geometry.scrollable).toBe(true);
    expect(geometry.arrowsDisabled).toEqual([true, false]);
    expect(geometry.activeText).toMatch(/^1 FLOOR Floor 1 /);
    // Each card: floor type, floor name, its SVG state and plotted count from the database.
    await expect(tabs.first()).toContainText('1 floor');
    await expect(tabs.first()).toContainText('Floor 1');
    await expect(tabs.first()).toContainText('No SVG');
    await expect(tabs.first()).toContainText(/\d+\/\d+/);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');

    // Forward: the strip moves and the left arrow wakes; repeatedly, until the end disables the right one.
    await scrollRight(page).click();
    await expect.poll(async () => (await strip(page)).scrollLeft).toBeGreaterThan(0);
    await expect(scrollLeft(page)).toBeEnabled();
    for (let i = 0; i < 12 && !(await scrollRight(page).isDisabled()); i += 1) {
      await scrollRight(page).click();
      await page.waitForTimeout(350);
    }
    geometry = await strip(page);
    expect(geometry.arrowsDisabled).toEqual([false, true]);
    expect(geometry.scrollLeft).toBe(geometry.max);
    // The selection survived the scrolling; picking the last card selects it and loads its floor.
    expect(geometry.activeText).toMatch(/Floor 1 /);
    await tabs.last().click();
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.bo-map__toolbarlevel')).toHaveText('1 · Floor 31');
    await expect(page.locator('.bo-map__image')).toBeVisible();
    // The canvas draws one unit pin per unit the Plot on Map panel lists as plotted on this floorplate ("Show: Units", the design's default).
    const plotted = Number((await page.locator('.bo-map__plottab').nth(1).innerText()).replace(/\D+/g, ''));
    await expect(page.locator('.bo-map__pin--unit')).toHaveCount(plotted);
    // Backward.
    await scrollLeft(page).click();
    await expect.poll(async () => (await strip(page)).scrollLeft).toBeLessThan(geometry.max);
    await expect(scrollRight(page)).toBeEnabled();

    // Add Floorplate sits in the strip's row, names the real count, and its dialog saves nothing.
    const addLevel = page.locator('.bo-map__levelsrow .bo-map__addlevel');
    await expect(addLevel).toBeVisible();
    await expect(addLevel).toContainText('31 floorplates');
    await addLevel.click();
    await expect(page.getByRole('dialog')).toContainText('Add Floorplate');
    await page.getByRole('dialog').getByRole('button', { name: /^Save/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(tabs).toHaveCount(31);
    clean(audited);
  });

  test('Map & Plotting: a deep link lands on its floorplate, in view, near the middle or at the end', async ({ page }) => {
    const audited = audit(page);
    await signIn(page);
    // The strip glides to the selected card (smooth scrolling), so its geometry is polled.
    await page.goto(`/properties/${HAZEL}/map?level=floorplate:2256`);
    await hydrated(page, '.bo-map__tool');
    await expect(page.locator('.bo-map__toolbarlevel')).toHaveText('1 · Floor 16');
    expect((await strip(page)).activeText).toMatch(/Floor 16 /);
    await expect.poll(async () => (await strip(page)).activeVisible).toBe(true);
    await expect.poll(async () => (await strip(page)).arrowsDisabled).toEqual([false, false]);

    await page.goto(`/properties/${HAZEL}/map?level=floorplate:2271`);
    await hydrated(page, '.bo-map__tool');
    await expect(page.locator('.bo-map__toolbarlevel')).toHaveText('1 · Floor 31');
    await expect.poll(async () => (await strip(page)).activeVisible).toBe(true);
    await expect.poll(async () => (await strip(page)).arrowsDisabled).toEqual([false, true]);
    clean(audited);
  });

  test('Map & Plotting: 3 floorplates fit without scrolling, 19 scroll', async ({ page }) => {
    const audited = audit(page);
    await signIn(page);
    await page.goto(`/properties/${THREE_PLATES}/map`);
    await hydrated(page, '.bo-map__tool');
    await expect(page.getByRole('tablist', { name: 'Floorplates' }).getByRole('tab')).toHaveCount(3);
    let geometry = await strip(page);
    expect(geometry.scrollable).toBe(false);
    expect(geometry.arrowsDisabled).toEqual([true, true]);
    expect(geometry.rowHeight).toBeLessThan(120);

    await page.goto(`/properties/${NINETEEN_PLATES}/map`);
    await hydrated(page, '.bo-map__tool');
    await expect(page.getByRole('tablist', { name: 'Floorplates' }).getByRole('tab')).toHaveCount(19);
    geometry = await strip(page);
    expect(geometry.scrollable).toBe(true);
    expect(geometry.arrowsDisabled).toEqual([true, false]);
    expect(geometry.rowHeight).toBeLessThan(120);
    clean(audited);
  });

  test('Map & Plotting: the canvas shows the loading state while a floor SVG streams', async ({ page }) => {
    test.setTimeout(180_000);
    const plates = (await cms(`/communities/${SVG_PROPERTY}/floorplates.json`)).data as Json[];
    test.skip(!plates.some((plate) => plate.svg), `property ${SVG_PROPERTY} has no floor SVG in this database; set PYN_CONNECT_E2E_PROPERTY`);
    const audited = audit(page);
    await signIn(page);
    await page.route(`**/api/properties/${SVG_PROPERTY}/plan-svg**`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.goto(`/properties/${SVG_PROPERTY}/map`);
    await hydrated(page, '.bo-map__tool');
    // Since October 10, 2026 a floorplate with both files opens on the frame its stored plotting is in; this test is about the SVG, so pick it.
    const layer = page.getByTestId('layer-switch').getByRole('button', { name: 'Floor SVG' });
    if (await layer.count()) await layer.click();
    const cover = page.locator('.bo-map__plan .bo-loading--cover');
    await expect(cover).toBeVisible();
    await expect(cover).toContainText('Loading the floor SVG…');
    await expect(page.getByTestId('plan-svg').locator('svg')).toHaveCount(1, { timeout: 120_000 });
    await expect(cover).toHaveCount(0);
    clean(audited);
  });

  test('Tour Setup: the real stops, the Edit Tour Stop dialog, elevators and routing, all local', async ({ page }) => {
    test.setTimeout(180_000);
    const audited = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/tour-setup`);
    await hydrated(page, '.bo-tour__tab');

    await expect(page.locator('main')).toContainText(`${facts.stops} stops`);
    if (facts.hiddenStops) await expect(page.locator('main')).toContainText(`${facts.hiddenStops} hidden from the tour`);
    await expect(page.getByRole('tab', { name: /^Tour Stops/ }).locator('.bo-tour__tabcount')).toHaveText(String(facts.stops));
    await expect(page.getByRole('tab', { name: /^Elevators & Locks/ }).locator('.bo-tour__tabcount')).toHaveText(String(facts.elevators));
    const stops = page.locator('.bo-tour__stop');
    await expect(stops).toHaveCount(facts.stops);
    const first = stops.first();
    const firstName = (await first.locator('.bo-tour__stopname').innerText()).trim();
    expect(firstName).not.toBe('');
    if (facts.firstStopHidden) await expect(first).toContainText('Hidden from tour');
    await expect(first.locator('.bo-tour__meta')).toContainText('Floor');
    await expect(first.getByRole('link', { name: /on Plan$/ })).toHaveAttribute('href', new RegExp(`/properties/${HAZEL}/map\\?`));

    // Edit Tour Stop: the reference's 520px dialog with the stop's own data and Cancel / Save side by side.
    await first.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('.bo-modal__title')).toHaveText('Edit Tour Stop');
    await expect(dialog.locator('.bo-modal__subtitle')).toContainText(`${firstName} · `);
    await expect(dialog.locator('.bo-modal__subtitle')).toContainText('Floor');
    await expect(dialog).toContainText('Dwell time (min)');
    await expect(dialog).toContainText('Kept on this page only; the CMS stores no dwell time.');
    await expect(dialog).toContainText('AI Concierge Talking Point');
    await expect(dialog).toContainText('The CMS stores this as the stop’s directional text (a unit’s stop description).');
    await expect(dialog).toContainText('Nothing is saved to the CMS; the change lives on this page.');
    const cancel = dialog.getByRole('button', { name: 'Cancel' });
    const save = dialog.getByRole('button', { name: 'Save Changes' });
    const [panel, cancelBox, saveBox] = await Promise.all([dialog.boundingBox(), cancel.boundingBox(), save.boundingBox()]);
    expect(Math.round(panel!.width)).toBe(520);
    expect(Math.round(cancelBox!.height)).toBe(42);
    expect(Math.round(saveBox!.height)).toBe(42);
    expect(Math.round(cancelBox!.y)).toBe(Math.round(saveBox!.y));
    expect(cancelBox!.x + cancelBox!.width).toBeLessThan(saveBox!.x);

    // Validation happens here: an out-of-range dwell time blocks Save and explains itself.
    const dwell = dialog.locator('input.bo-field');
    await dwell.fill('1000');
    await expect(dialog.locator('.bo-dlg__fielderror')).toHaveText('Enter a whole number of minutes from 0 to 999, or leave it empty.');
    await expect(save).toBeDisabled();
    await dwell.fill('7');
    await expect(dialog.locator('.bo-dlg__fielderror')).toHaveCount(0);
    await dialog.locator('textarea').fill('Local talking point from the dialog');
    await save.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(first.locator('.bo-tour__meta')).toContainText('7 min');
    await expect(first.locator('.bo-tour__talk')).toHaveValue('Local talking point from the dialog');
    // Cancel discards.
    await first.getByRole('button', { name: 'Edit' }).click();
    await dialog.locator('input.bo-field').fill('99');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(first.locator('.bo-tour__meta')).toContainText('7 min');

    // Elevators & Locks: the real elevators. Routing: a local route between two real stops.
    await page.getByRole('tab', { name: /^Elevators & Locks/ }).click();
    await expect(page.locator('.bo-tour__elevator')).toHaveCount(facts.elevators);
    await page.getByRole('tab', { name: /^Routing/ }).click();
    const from = page.getByRole('combobox', { name: 'From' });
    if ((await from.locator('option').count()) > 2) {
      await from.selectOption({ index: 1 });
      await page.getByRole('combobox', { name: 'To' }).selectOption({ index: 2 });
      await page.getByRole('button', { name: 'Compute Multi-Floor Route' }).click();
      await expect(page.locator('.bo-tour__routeresult')).not.toHaveText(/Pick two stops/);
    }
    clean(audited);
  });

  test('Navigation: Properties → Property Detail → Inventory → Amenities → Map & Plotting ↔ Tour Setup', async ({ page }) => {
    test.setTimeout(180_000);
    const audited = audit(page);
    await signIn(page);
    await page.goto('/properties');
    await hydrated(page);
    await page.getByPlaceholder('Search properties').fill('Hazel');
    await page.getByRole('link', { name: 'Hazel', exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/properties/${HAZEL}$`));
    await hydrated(page);
    await page.getByRole('link', { name: 'Inventory', exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/properties/${HAZEL}/inventory`));
    await hydrated(page, '.bo-inv__tab');
    await page.getByRole('tab', { name: /^Amenities/ }).click();
    await expect(page.locator('.bo-record')).toHaveCount(6);
    await page.getByRole('link', { name: 'Map & Plotting', exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/properties/${HAZEL}/map`));
    await hydrated(page, '.bo-map__tool');
    await page.getByRole('link', { name: 'Tour Setup', exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/properties/${HAZEL}/tour-setup`));
    await hydrated(page, '.bo-tour__tab');
    await page.getByRole('link', { name: 'Map & Plotting', exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/properties/${HAZEL}/map`));
    await hydrated(page, '.bo-map__tool');
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/properties/${HAZEL}/tour-setup`));
    await hydrated(page, '.bo-tour__tab');
    await page.getByRole('link', { name: 'Inventory', exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/properties/${HAZEL}/inventory`));
    await hydrated(page, '.bo-inv__tab');
    clean(audited);
  });

  test('Loading: the shared indicator dims the whole screen from its exact centre while a slow route resolves, then leaves', async ({ page }) => {
    test.setTimeout(120_000);
    const audited = audit(page);
    await signIn(page);
    await page.goto(`/properties/${HAZEL}/inventory`);
    await hydrated(page, '.bo-inv__tab');
    // The next screen's payload takes 3 s — the prefetch too, so a hover before the click changes nothing.
    // Map & Plotting, because its server render still waits on five CMS reads
    // (the inventory's own route answers in ~60 ms since it defers the units,
    // too fast for the veil to be observed after a pre-first-byte delay).
    await page.route(
      (url) => url.pathname === `/properties/${HAZEL}/map`,
      async (route) => {
        if (route.request().headers().rsc === '1' || route.request().url().includes('_rsc')) await new Promise((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      }
    );
    await page.getByRole('link', { name: 'Map & Plotting', exact: true }).first().click();
    const loading = page.locator('.bo-loading--page');
    await expect(loading).toBeVisible({ timeout: 5000 });
    await expect(loading.locator('img')).toHaveAttribute('src', '/images/loader.gif');
    await expect(loading).toHaveAttribute('role', 'status');
    const geometry = await loading.evaluate((element) => {
      const cat = element.querySelector('.bo-loading__cat')!.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return {
        position: getComputedStyle(element).position,
        background: getComputedStyle(element).backgroundColor,
        coversViewport: box.left === 0 && box.top === 0 && box.width === innerWidth && box.height === innerHeight,
        dx: Math.abs(innerWidth / 2 - (cat.left + cat.width / 2)),
        dy: Math.abs(innerHeight / 2 - (cat.top + cat.height / 2))
      };
    });
    expect(geometry.position).toBe('fixed');
    expect(geometry.coversViewport).toBe(true);
    expect(geometry.background).toBe('rgba(23, 26, 33, 0.32)');
    expect(geometry.dx).toBeLessThan(1);
    expect(geometry.dy).toBeLessThan(1);
    await hydrated(page, '.bo-map__tool');
    await expect(loading).toHaveCount(0);
    clean(audited);
  });

  test('Hydration: Hazel’s screens render the same on the server and in a clean browser', async ({ page }) => {
    test.setTimeout(180_000);
    const audited = audit(page);
    await signIn(page);
    for (const path of [`/properties/${HAZEL}`, `/properties/${HAZEL}/inventory?tab=amenities`, `/properties/${HAZEL}/map`, `/properties/${HAZEL}/tour-setup`]) {
      await page.goto(path);
      await hydrated(page);
      await page.waitForTimeout(500);
      expect(await page.evaluate(() => document.body.attributes.length), `${path}: body attributes`).toBe(0);
    }
    expect(audited.console.filter((line) => /hydrat|did not match|server rendered HTML/i.test(line)), 'hydration messages').toEqual([]);
    clean(audited);
  });
});
