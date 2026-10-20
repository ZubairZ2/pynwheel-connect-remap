import { expect, test, type Page } from '@playwright/test';

/**
 * Tour Setup › Settings on real data (October 20, 2026 design): the grouped
 * rail with its pills and `?section=` deep links, the availability header's
 * scheduler-off confirmation (cancelled, so nothing is written), the CRM &
 * sync demo page (no CMS request leaves it), and — only with
 * PYN_CONNECT_E2E_WRITES=1 against an isolated database — the save → reload
 * round trips of the rules, closures, form and button sections, each
 * restored afterwards. Needs the minted session env of tourModules.spec.ts.
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const propertyId = process.env.PYN_CONNECT_E2E_MODULES_PROPERTY ?? '1618';
const writesAllowed = process.env.PYN_CONNECT_E2E_WRITES === '1';

test.describe('Tour Setup › Settings (real data)', () => {
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
    const reads: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (!request.url().includes('/api/properties/')) return;
      if (request.method() !== 'GET') writes.push(`${request.method()} ${request.url()}`);
      else reads.push(request.url());
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    return { writes, reads, errors };
  };

  const openSettings = async (page: Page, section?: string) => {
    await signIn(page);
    await page.goto(`/properties/${propertyId}/tour-setup?tab=settings${section ? `&section=${section}` : ''}`);
    await hydrated(page);
    await expect(page.getByTestId('tour-settings')).toBeVisible();
  };

  test('the rail is grouped, the pills switch sections and the URL follows', async ({ page }) => {
    const { writes, errors } = watch(page);
    await openSettings(page);
    await expect(page.getByTestId('settings-group-scheduling')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('booking-rules')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('availability-header')).toBeVisible();
    await expect(page.getByTestId('gate-scheduler_on')).toBeVisible();
    for (const card of ['rules-types', 'rules-slots', 'rules-capacity', 'rules-behaviour']) await expect(page.getByTestId(card)).toBeVisible();
    await page.getByTestId('settings-hours').click();
    await expect(page).toHaveURL(/section=hours/);
    await expect(page.getByTestId('booking-hours')).toBeVisible();
    await expect(page.getByTestId('hours-card')).toBeVisible();
    await expect(page.getByTestId('closures-card')).toBeVisible();
    await page.getByTestId('settings-group-booking').click();
    await expect(page).toHaveURL(/section=form/);
    await expect(page.getByTestId('booking-form')).toBeVisible();
    await expect(page.getByTestId('form-app')).toBeVisible();
    await expect(page.getByTestId('prospect-preview')).toBeVisible();
    await page.getByTestId('settings-link').click();
    await expect(page.getByTestId('button-card')).toBeVisible();
    await expect(page.getByTestId('booking-url')).toBeVisible();
    await page.getByTestId('settings-crm').click();
    await expect(page.getByTestId('booking-crm')).toBeVisible();
    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('a section deep link opens that section', async ({ page }) => {
    const { writes, errors } = watch(page);
    await openSettings(page, 'link');
    await expect(page.getByTestId('settings-group-booking')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('settings-link')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('booking-link')).toBeVisible({ timeout: 30_000 });
    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('turning the scheduler off asks first; cancelling writes nothing', async ({ page }) => {
    const { writes, errors } = watch(page);
    await openSettings(page);
    await expect(page.getByTestId('booking-rules')).toBeVisible({ timeout: 30_000 });
    const header = page.getByTestId('availability-header');
    const scheduler = header.getByRole('switch', { name: 'Scheduler' });
    await expect(scheduler).toBeVisible();
    if ((await scheduler.getAttribute('aria-checked')) === 'true') {
      await scheduler.click();
      await expect(page.getByRole('dialog')).toContainText('Turn off the scheduler?');
      await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(scheduler).toHaveAttribute('aria-checked', 'true');
    }
    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test('CRM & sync is a demo: its interactions send no request to the CMS', async ({ page }) => {
    const { writes, reads, errors } = watch(page);
    await openSettings(page, 'crm');
    await expect(page.getByTestId('booking-crm')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('crm-demo-banner')).toBeVisible();
    await expect(page.getByTestId('crm-from-cms')).toBeVisible();
    const before = reads.length;
    await page.getByTestId('crm-option-ingest').click();
    await page.getByTestId('crm-option-redirect').click();
    await page.getByTestId('crm-option-sync').click();
    await page.getByTestId('crm-select').selectOption('Knock');
    await page.getByLabel('API key').fill('demo-key');
    await page.getByLabel('Community ID').fill('demo-community');
    await page.getByTestId('crm-connect').click();
    await expect(page.getByRole('button', { name: 'Test connection' })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Test connection' }).click();
    await page.getByRole('button', { name: 'Disconnect' }).click();
    await expect(page.getByRole('button', { name: 'Update credentials' })).toBeVisible();
    expect(reads.length, 'no extra CMS reads from the demo page').toBe(before);
    expect(errors, 'page errors').toEqual([]);
    expect(writes, 'non-GET requests').toEqual([]);
  });

  test.describe('writes (PYN_CONNECT_E2E_WRITES=1, isolated database only)', () => {
    test.skip(!writesAllowed, 'PYN_CONNECT_E2E_WRITES is not 1');
    test.setTimeout(180_000);

    /** A save is done once the section's "Unsaved changes" label is gone and no button says "Saving…". */
    const settled = async (page: Page) => {
      await expect(page.getByText('Saving…')).toHaveCount(0, { timeout: 30_000 });
      await expect(page.getByText('Unsaved changes')).toHaveCount(0, { timeout: 30_000 });
    };

    test('rules: notice and horizon save, reload and restore', async ({ page }) => {
      const { errors } = watch(page);
      await openSettings(page);
      await expect(page.getByTestId('booking-rules')).toBeVisible({ timeout: 30_000 });
      const notice = page.getByTestId('rules-notice');
      const horizon = page.getByTestId('rules-horizon');
      const noticeBefore = await notice.inputValue();
      const horizonBefore = await horizon.inputValue();
      await notice.selectOption('120');
      await horizon.selectOption('14');
      await page.getByTestId('booking-save').click();
      await settled(page);
      await page.reload();
      await hydrated(page);
      await expect(page.getByTestId('rules-notice')).toHaveValue('120', { timeout: 30_000 });
      await expect(page.getByTestId('rules-horizon')).toHaveValue('14');
      await page.getByTestId('rules-notice').selectOption(noticeBefore);
      await page.getByTestId('rules-horizon').selectOption(horizonBefore);
      await page.getByTestId('booking-save').click();
      await settled(page);
      expect(errors, 'page errors').toEqual([]);
    });

    test('closures: add, save, reload, remove', async ({ page }) => {
      const { errors } = watch(page);
      await openSettings(page, 'hours');
      await expect(page.getByTestId('closures-card')).toBeVisible({ timeout: 30_000 });
      const rowsBefore = await page.getByTestId('closure-row').count();
      await page.getByTestId('closure-add').click();
      await page.getByTestId('closure-date').fill('2027-12-24');
      await page.getByTestId('closure-label').fill('E2E closure');
      await page.getByTestId('closure-confirm').click();
      await page.getByTestId('closures-save').click();
      await settled(page);
      await page.reload();
      await hydrated(page);
      await expect(page.getByTestId('closure-row')).toHaveCount(rowsBefore + 1, { timeout: 30_000 });
      await expect(page.getByTestId('closures-card')).toContainText('E2E closure');
      const row = page.getByTestId('closure-row').filter({ hasText: 'E2E closure' });
      await row.getByRole('button', { name: 'Remove' }).click();
      await page.getByTestId('closures-save').click();
      await settled(page);
      await page.reload();
      await hydrated(page);
      await expect(page.getByTestId('closure-row')).toHaveCount(rowsBefore, { timeout: 30_000 });
      expect(errors, 'page errors').toEqual([]);
    });

    test('form and button: a field toggle and the button text round-trip', async ({ page }) => {
      const { errors } = watch(page);
      await openSettings(page, 'form');
      await expect(page.getByTestId('form-fields')).toBeVisible({ timeout: 30_000 });
      const beds = page.getByRole('switch', { name: 'Ask for desired bedrooms' });
      const was = (await beds.getAttribute('aria-checked')) === 'true';
      await beds.click();
      await page.getByTestId('form-save').click();
      await settled(page);
      await page.reload();
      await hydrated(page);
      await expect(page.getByRole('switch', { name: 'Ask for desired bedrooms' })).toHaveAttribute('aria-checked', String(!was), { timeout: 30_000 });
      await page.getByRole('switch', { name: 'Ask for desired bedrooms' }).click();
      await page.getByTestId('form-save').click();
      await settled(page);

      await page.getByTestId('settings-link').click();
      const text = page.getByTestId('button-text');
      const original = await text.inputValue();
      await text.fill(`${original} QA`);
      await page.getByTestId('button-save').click();
      await settled(page);
      await page.reload();
      await hydrated(page);
      await expect(page.getByTestId('button-text')).toHaveValue(`${original} QA`, { timeout: 30_000 });
      await expect(page.getByTestId('embed-code')).toContainText(`${original} QA`);
      await page.getByTestId('button-text').fill(original);
      await page.getByTestId('button-save').click();
      await settled(page);
      expect(errors, 'page errors').toEqual([]);
    });
  });
});
