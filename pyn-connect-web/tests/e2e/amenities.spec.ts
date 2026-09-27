import { expect, test, type Page } from '@playwright/test';

/**
 * The Amenities tab on real data, driven against a running CMS with a minted
 * Devise session (PYN_CONNECT_PROGRESS.md §7). The spec skips itself when the
 * session is not provided:
 *
 *   PYN_CONNECT_E2E_RAILS_COOKIE   the `rails_cookie` value the mint script prints
 *   PYN_CONNECT_E2E_USER           the `user` JSON it prints
 *
 * The expected counts are the local database's (`psql`, Sep 26): property 2157
 * (Bowers Residences) has 19 amenities, 6 with a Dwelo lock, 13 on "Main
 * Building", 8 on floor 1, 4 Fitness Centers, 13 plotted, one hidden from the
 * stop list, 13 without a description, 6 without directional text, none with a
 * video or an empty image; 1106 (The Carson) has Matterport video links; 1232
 * (Lincoln at Dilworth) has "Sky" with a 3-image gallery. The last assertion
 * is the one that matters most: the browser sent nothing but GETs.
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;

test.describe('Amenities (real data)', () => {
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
      const button = document.querySelector('.bo-inv__tab');
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

  const cards = (page: Page) => page.locator('.bo-record');
  const showing = (page: Page) => page.locator('.bo-inv__showing');

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

  test('lists, searches and filters the real amenities of Bowers Residences', async ({ page }) => {
    const { writes, errors } = audit(page);
    await signIn(page);
    await page.goto('/properties/2157/inventory?tab=amenities');
    await hydrated(page);

    // Header from the real property.
    await expect(page.getByRole('heading', { level: 2, name: 'Property Inventory' })).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Amenities/ })).toContainText('19');
    await expect(page.getByRole('heading', { name: 'Amenities', exact: true })).toBeVisible();
    await expect(page.getByText('Show amenity name on webpages')).toBeVisible();
    await expect(showing(page)).toHaveText('19 amenities');
    await expect(cards(page)).toHaveCount(19);

    // A real card: Elevator Room 1 — Other, Main Building, Floor 1, Dwelo, no video, empty gallery.
    const elevator = cards(page).filter({ hasText: 'Elevator Room 1' }).first();
    await expect(elevator.locator('.bo-record__tag')).toHaveText('Other');
    await expect(elevator.getByText('Plotted', { exact: true })).toBeVisible();
    await expect(elevator.getByText('In Stops List', { exact: true })).toBeVisible();
    await expect(elevator.locator('.bo-meta__item').filter({ hasText: 'Building' })).toContainText('Main Building');
    await expect(elevator.locator('.bo-meta__item').filter({ hasText: 'Floor' })).toContainText('Floor 1');
    await expect(elevator.locator('.bo-meta__item').filter({ hasText: 'Lock Provider' })).toContainText('Dwelo');
    await expect(elevator.locator('.bo-meta__item').filter({ hasText: 'Video' })).toContainText('None');
    await expect(elevator.locator('.bo-meta__item').filter({ hasText: 'Gallery' })).toContainText('Empty');
    await expect(elevator.locator('.bo-inv-chip--on')).toHaveCount(2); // Description, Directional Text

    // The one amenity hidden from the stop list.
    const hidden = cards(page).filter({ hasText: 'Hidden from Stops' });
    await expect(hidden).toHaveCount(1);
    await expect(hidden.first()).toContainText('Fitness Center');

    // Search over name, type, building and floor.
    const search = page.getByRole('searchbox', { name: 'Search name, type or location' });
    await search.fill('fitness');
    await expect(showing(page)).toHaveText('Showing 5 of 19');
    await search.fill('main building');
    await expect(showing(page)).toHaveText('Showing 13 of 19');
    await search.fill('floor 8');
    await expect(showing(page)).toHaveText('Showing 2 of 19');
    await search.fill('zzz-no-such-amenity');
    await expect(page.getByText('No amenities match these filters.')).toBeVisible();
    await search.fill('');
    await expect(showing(page)).toHaveText('19 amenities');

    // Each filter on its own.
    await pick(page, 'Type', 'Fitness Center');
    await expect(showing(page)).toHaveText('Showing 4 of 19');
    await pick(page, 'Type', 'No type');
    await expect(showing(page)).toHaveText('Showing 9 of 19');
    await clearFilter(page, 'Type');

    await pick(page, 'Building', 'Main Building');
    await expect(showing(page)).toHaveText('Showing 13 of 19');
    await clearFilter(page, 'Building');
    await pick(page, 'Building', 'No building');
    await expect(showing(page)).toHaveText('Showing 6 of 19');
    await clearFilter(page, 'Building');

    await pick(page, 'Floor', 'Floor 1');
    await expect(showing(page)).toHaveText('Showing 8 of 19');
    await clearFilter(page, 'Floor');

    await pick(page, 'Lock', 'Dwelo');
    await expect(showing(page)).toHaveText('Showing 6 of 19');
    await clearFilter(page, 'Lock');
    await pick(page, 'Lock', 'No lock');
    await expect(showing(page)).toHaveText('Showing 13 of 19');
    await clearFilter(page, 'Lock');

    await pick(page, 'State', 'Hidden from Stops List');
    await expect(showing(page)).toHaveText('Showing 1 of 19');
    await clearFilter(page, 'State');
    await pick(page, 'State', 'Plotted');
    await expect(showing(page)).toHaveText('Showing 13 of 19');
    await pick(page, 'State', 'Not on map');
    await expect(showing(page)).toHaveText('19 amenities');
    await clearFilter(page, 'State');

    await pick(page, 'Setup', 'No description');
    await expect(showing(page)).toHaveText('Showing 13 of 19');
    await clearFilter(page, 'Setup');
    await pick(page, 'Setup', 'No directional text');
    await expect(showing(page)).toHaveText('Showing 6 of 19');
    await clearFilter(page, 'Setup');
    await pick(page, 'Setup', 'Has video');
    await expect(page.getByText('No amenities match these filters.')).toBeVisible();
    await clearFilter(page, 'Setup');
    await pick(page, 'Setup', 'Empty gallery');
    await expect(showing(page)).toHaveText('19 amenities');
    await clearFilter(page, 'Setup');

    // Combined: Building = Main Building + Floor = Floor 1 + Lock = Dwelo + State = In Stops List → Elevator Room 1.
    await pick(page, 'Building', 'Main Building');
    await pick(page, 'Floor', 'Floor 1');
    await pick(page, 'Lock', 'Dwelo');
    await pick(page, 'State', 'In Stops List');
    await expect(showing(page)).toHaveText('Showing 1 of 19');
    await expect(cards(page).first()).toContainText('Elevator Room 1');
    await search.fill('elevator');
    await expect(showing(page)).toHaveText('Showing 1 of 19');
    await search.fill('pool');
    await expect(page.getByText('No amenities match these filters.')).toBeVisible();
    await search.fill('');
    await clearFilter(page, 'Building');
    await clearFilter(page, 'Floor');
    await clearFilter(page, 'Lock');
    await clearFilter(page, 'State');
    await expect(showing(page)).toHaveText('19 amenities');

    // The image viewer on a real amenity image.
    const first = cards(page).first();
    await first.locator('.bo-thumb').hover();
    await first.getByRole('button', { name: 'View image' }).click();
    const viewer = page.getByRole('dialog');
    await expect(viewer).toBeVisible();
    await expect(viewer.locator('.bo-viewer__image')).toBeVisible();
    await viewer.getByRole('button', { name: 'Close image' }).click();
    await expect(viewer).toHaveCount(0);

    // Add Amenity: the form opens, can be filled in, and Save only closes it.
    await page.getByRole('button', { name: 'Add Amenity' }).click();
    const add = page.getByRole('dialog', { name: 'Add Amenity' });
    await expect(add).toBeVisible();
    await expect(add.getByText('Shown on the kiosk, web widget, Pynwheel Map and self-guided tours.')).toBeVisible();
    await add.getByPlaceholder('e.g. Rooftop Pool').fill('Test Pool');
    await add.getByRole('combobox', { name: 'Amenity Type' }).selectOption('Pool');
    await add.getByRole('combobox', { name: 'Lock Provider' }).selectOption('Dwelo');
    await expect(add.getByPlaceholder('PLAY VIDEO')).toHaveValue('PLAY VIDEO');
    await add.getByRole('switch', { name: 'Show in Stops List' }).click();
    await add.getByRole('textbox', { name: 'Description' }).fill('A test description');
    await expect(add.getByText('Amenity Gallery')).toBeVisible();
    await expect(add.getByText('No gallery images yet', { exact: false })).toBeVisible();
    await add.getByRole('button', { name: 'Add Amenity' }).click();
    await expect(add).toHaveCount(0);

    // Edit Amenity opens on the real values.
    await cards(page).filter({ hasText: 'Elevator Room 1' }).first().getByRole('button', { name: 'Edit amenity' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit Amenity' });
    await expect(edit).toBeVisible();
    await expect(edit.getByPlaceholder('e.g. Rooftop Pool')).toHaveValue('Elevator Room 1');
    await expect(edit.getByRole('combobox', { name: 'Amenity Type' })).toHaveValue('Other');
    await expect(edit.getByRole('combobox', { name: 'Building' })).toHaveValue('Main Building');
    await expect(edit.getByPlaceholder('e.g. 3')).toHaveValue('1');
    await expect(edit.getByRole('combobox', { name: 'Lock Provider' })).toHaveValue('Dwelo');
    await expect(edit.getByRole('switch', { name: 'Show in Stops List' })).toHaveAttribute('aria-checked', 'true');
    await expect(edit.getByRole('textbox', { name: 'Description' })).not.toHaveValue('');
    await expect(edit.locator('.bo-upload__name')).toBeVisible();
    await edit.getByRole('button', { name: 'Save Amenity' }).click();
    await expect(edit).toHaveCount(0);

    // Name click opens the same dialog; Cancel closes.
    await cards(page).first().locator('.bo-record__titlebutton').click();
    await expect(page.getByRole('dialog', { name: 'Edit Amenity' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Delete and Remove image only confirm, and the confirmation says so.
    await cards(page).first().getByRole('button', { name: 'Delete amenity' }).click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText('Delete Amenity');
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirm).toHaveCount(0);
    await cards(page).first().locator('.bo-thumb').hover();
    await cards(page).first().getByRole('button', { name: 'Remove image' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();

    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  });

  test('shows a stored video link and a real gallery count', async ({ page }) => {
    const { writes, errors } = audit(page);
    await signIn(page);

    await page.goto('/properties/1106/inventory?tab=amenities');
    await hydrated(page);
    const thinkTank = cards(page).filter({ hasText: 'Think Tank' }).first();
    const video = thinkTank.locator('.bo-meta__item').filter({ hasText: 'Video' }).getByRole('link');
    await expect(video).toHaveText('Virtual Tour');
    await expect(video).toHaveAttribute('href', /my\.matterport\.com/);
    await expect(video).toHaveAttribute('target', '_blank');
    await expect(thinkTank.locator('.bo-inv-chip--on').filter({ hasText: 'Video' })).toHaveCount(1);
    await expect(cards(page).filter({ hasText: 'The Clubhouse' }).first().getByRole('link', { name: /video/i })).toHaveText('3D Tour');
    await pick(page, 'Setup', 'Has video');
    await expect(showing(page)).toHaveText('Showing 4 of 7');
    await clearFilter(page, 'Setup');
    await pick(page, 'Lock', 'Latch');
    await expect(showing(page)).toHaveText('Showing 5 of 7');

    await page.goto('/properties/1232/inventory?tab=amenities');
    await hydrated(page);
    const sky = cards(page).filter({ hasText: 'Sky' }).first();
    await expect(sky.locator('.bo-meta__item').filter({ hasText: 'Gallery' })).toContainText('3 images');
    await sky.locator('.bo-thumb').hover();
    await sky.getByRole('button', { name: 'View image' }).click();
    const viewer = page.getByRole('dialog');
    await expect(viewer.locator('.bo-modal__subtitle')).toHaveText('1 of 4');
    await viewer.getByRole('button', { name: 'Next image' }).click();
    await expect(viewer.locator('.bo-modal__subtitle')).toHaveText('2 of 4');
    await viewer.getByRole('button', { name: 'Close image' }).click();
    await sky.getByRole('button', { name: 'Edit amenity' }).click();
    const edit = page.getByRole('dialog', { name: 'Edit Amenity' });
    await expect(edit.locator('.bo-dlg__interior')).toHaveCount(3);
    await expect(edit.getByText('3 images · scroll for more')).toBeVisible();
    await edit.getByRole('button', { name: 'Cancel' }).click();

    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  });
});
