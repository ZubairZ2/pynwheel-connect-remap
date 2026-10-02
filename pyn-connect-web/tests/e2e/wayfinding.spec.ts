import { expect, test, type Page } from '@playwright/test';

/**
 * Map & Plotting's Wayfinding mode and the updated Plot on Map panel, on real
 * CMS data (the wayfinding design, October 1 brief). Driven against a
 * running CMS with a minted Devise session (PYN_CONNECT_PROGRESS.md §7);
 * skipped without one:
 *
 *   PYN_CONNECT_E2E_RAILS_COOKIE    the `rails_cookie` value the mint script prints
 *   PYN_CONNECT_E2E_USER            the `user` JSON it prints
 *   PYNWHEEL_CMS_URL                the CMS the app talks to (default http://127.0.0.1:3000)
 *   PYN_CONNECT_E2E_STACKED         a property with a stacked floorplate and hallways (default 1839, Oeuvre: range 1-6)
 *   PYN_CONNECT_E2E_SINGLE          a property with single-floor floorplates and hallways (default 2919, Sofia)
 *   PYN_CONNECT_E2E_DETECT          a property with floor SVGs, some floorplates with stored hallways and some without (default 3837, Sylo)
 *   PYN_CONNECT_E2E_NO_SVG          a property whose floorplates have floor images only (default 1234, Alderwood)
 *   PYN_CONNECT_E2E_BUILDINGS       a property with two floorplate buildings (default 1105, Trestle)
 *
 * Every expected count is read from the CMS's own JSON (`automate_plotting.json`,
 * `floorplates.json`, `units.json`), never written into the test. Every test
 * ends on the same assertions: no page errors, and the browser sent nothing
 * but reads.
 */
const railsCookie = process.env.PYN_CONNECT_E2E_RAILS_COOKIE;
const user = process.env.PYN_CONNECT_E2E_USER;
const CMS = (process.env.PYNWHEEL_CMS_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const STACKED = process.env.PYN_CONNECT_E2E_STACKED ?? '1839';
const SINGLE = process.env.PYN_CONNECT_E2E_SINGLE ?? '2919';
const DETECT = process.env.PYN_CONNECT_E2E_DETECT ?? '3837';
const NO_SVG = process.env.PYN_CONNECT_E2E_NO_SVG ?? '1234';
const BUILDINGS = process.env.PYN_CONNECT_E2E_BUILDINGS ?? '1105';

type Json = Record<string, unknown>;
type Hallway = { id: number; next_points: number[]; parent_type: string; parent_id: number };
type Plate = { id: number; range: string | null; floors: number[]; name: string; svg: string | null };

test.describe('Map & Plotting · Wayfinding (real data)', () => {
  test.skip(!railsCookie || !user, 'PYN_CONNECT_E2E_RAILS_COOKIE / PYN_CONNECT_E2E_USER not set');
  test.setTimeout(240_000);

  const cms = async (path: string): Promise<Json> => {
    const response = await fetch(`${CMS}${path}`, { headers: { Cookie: railsCookie!, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`${path} answered ${response.status}`);
    return (await response.json()) as Json;
  };
  const rows = <T,>(body: Json): T[] => {
    const data = body.data as unknown;
    if (Array.isArray(data)) return data as T[];
    const object = data as Record<string, unknown>;
    const list = Object.values(object).find(Array.isArray);
    return (list ?? []) as T[];
  };
  const plates = async (id: string): Promise<Plate[]> => rows<Plate>(await cms(`/communities/${id}/floorplates.json`));
  const hallways = async (id: string): Promise<Hallway[]> => ((await cms(`/automate_plotting.json?community_id=${id}`)).data as { hallways: Hallway[] }).hallways;
  /** The stored graph of one floorplate: its nodes, and its links counted once (`next_points` is stored one way, walked both ways). */
  const graphOf = (all: Hallway[], plateId: number) => {
    const nodes = all.filter((row) => row.parent_type === 'Floorplate' && row.parent_id === plateId);
    const ids = new Set(nodes.map((row) => row.id));
    const edges = new Set<string>();
    nodes.forEach((row) => row.next_points.forEach((next) => ids.has(next) && edges.add([row.id, next].sort((a, b) => a - b).join('|'))));
    return { points: nodes.length, paths: edges.size };
  };

  const signIn = async (page: Page) => {
    const origin = new URL(String(test.info().project.use.baseURL ?? 'http://127.0.0.1:3001'));
    await page.context().addCookies([
      { name: 'pyn_connect_rails_session', value: encodeURIComponent(railsCookie!), domain: origin.hostname, path: '/', httpOnly: true },
      { name: 'pyn_connect_user', value: encodeURIComponent(user!), domain: origin.hostname, path: '/', httpOnly: true }
    ]);
  };

  const hydrated = async (page: Page) => {
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('.bo-map__tool, .bo-wf__mode')).some((node) => Object.keys(node).some((key) => key.startsWith('__reactFiber'))),
      null,
      { timeout: 120_000 }
    );
  };

  const audit = (page: Page) => {
    const writes: string[] = [];
    const errors: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET' && request.method() !== 'HEAD') writes.push(`${request.method()} ${request.url()}`);
    });
    page.on('pageerror', (error) => errors.push(String(error)));
    return () => {
      expect(errors, 'page errors').toEqual([]);
      expect(writes, 'non-GET requests').toEqual([]);
    };
  };

  const openMap = async (page: Page, id: string) => {
    await signIn(page);
    await page.goto(`/properties/${id}/map`);
    await hydrated(page);
  };
  const wayfinding = (page: Page) => page.getByTestId('wayfinding-panel');
  const counts = async (page: Page) => {
    const text = (await page.getByTestId('wf-counts').innerText()).replace(/\s+/g, ' ');
    const [points, paths, linked] = text.match(/\d+(\/\d+)?/g) ?? [];
    return { points: Number(points), paths: Number(paths), linked };
  };
  const levelTab = (page: Page, name: RegExp) => page.getByRole('tablist', { name: 'Floorplates' }).getByRole('tab', { name });
  /** A spot on the plan with nothing on it, so a click reaches the tool. */
  const emptySpot = (page: Page, skip = 0) =>
    page.evaluate((skip) => {
      const plan = document.querySelector('[data-testid="plan"]')!.getBoundingClientRect();
      let found = 0;
      for (let fy = 0.12; fy < 0.88; fy += 0.04)
        for (let fx = 0.12; fx < 0.88; fx += 0.04) {
          const x = plan.left + plan.width * fx;
          const y = plan.top + plan.height * fy;
          const el = document.elementFromPoint(x, y);
          if (el?.classList.contains('bo-map__plan') && found++ >= skip) return { x, y };
        }
      return null;
    }, skip);

  test('the toggle: Plotting keeps the plotting UI, Wayfinding switches toolbar and panel on the same canvas', async ({ page }) => {
    const done = audit(page);
    await openMap(page, SINGLE);
    const modes = page.getByRole('tablist', { name: 'Map mode' });
    await expect(modes.getByRole('tab')).toHaveText(['Plotting', 'Wayfinding']);
    await expect(modes.getByRole('tab', { name: 'Plotting' })).toHaveAttribute('aria-selected', 'true');
    const toolbar = page.locator('.bo-map__toolbar');
    await expect(toolbar.getByRole('button')).toHaveText([/^Auto Plot/, /^Manual Plot/]);
    await expect(page.getByTestId('plot-panel')).toContainText('Plot on Map');
    await expect(page.getByTestId('wayfinding-panel')).toHaveCount(0);

    const surface = await page.getByTestId('plan-surface').elementHandle();
    await modes.getByRole('tab', { name: 'Wayfinding' }).click();
    await expect(wayfinding(page)).toBeVisible();
    await expect(page.getByTestId('plot-panel')).toHaveCount(0);
    for (const name of ['Move', 'Connect', 'Add Point', 'Erase', 'Undo', 'Clear Paths']) await expect(toolbar.getByRole('button', { name, exact: true })).toBeVisible();
    await expect(toolbar.getByRole('button', { name: /^Detect Hallways/ })).toBeVisible();
    // Auto-Connect is part of Detect Hallways now: no separate button.
    await expect(toolbar.getByRole('button', { name: /Auto-Connect/ })).toHaveCount(0);
    // No tool is on by default: the POC's own gestures apply, and the panel says so.
    for (const name of ['Move', 'Connect', 'Add Point', 'Erase']) await expect(toolbar.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('wf-mode')).toHaveText('Editing — no tool selected');
    await toolbar.getByRole('button', { name: 'Move', exact: true }).click();
    await expect(page.getByTestId('wf-mode')).toHaveText('Move tool on');
    await toolbar.getByRole('button', { name: 'Move', exact: true }).click();
    await expect(page.getByTestId('wf-mode')).toHaveText('Editing — no tool selected');
    await expect(toolbar.getByRole('button', { name: /^Auto Plot/ })).toHaveCount(0);
    // One canvas: the same surface element stays mounted across the switch.
    expect(await surface!.evaluate((node) => node.isConnected)).toBe(true);
    await expect(page.getByTestId('plan-surface')).toHaveCount(1);

    await modes.getByRole('tab', { name: 'Plotting' }).click();
    await expect(page.getByTestId('plot-panel')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Inventory' })).toHaveAttribute('href', new RegExp(`/properties/${SINGLE}/`));
    await expect(page.getByRole('link', { name: 'Tour Setup' })).toHaveAttribute('href', `/properties/${SINGLE}/tour-setup`);
    done();
  });

  test('single floor: the points and paths are the stored hallways; selection, a local drag and Escape', async ({ page }) => {
    const done = audit(page);
    const [floorplates, graph] = await Promise.all([plates(SINGLE), hallways(SINGLE)]);
    const target = floorplates.filter((row) => row.floors.length === 1).map((row) => ({ row, ...graphOf(graph, row.id) })).sort((a, b) => b.points - a.points)[0];
    await openMap(page, SINGLE);
    await page.getByRole('tab', { name: 'Wayfinding' }).click();
    await levelTab(page, new RegExp(`Floor ${target.row.floors[0]}\\b`)).first().click();
    await expect(wayfinding(page)).toBeVisible();
    await expect(page.getByTestId('wf-stack')).toHaveCount(0);
    expect(await counts(page)).toMatchObject({ points: target.points, paths: target.paths });
    await expect(page.getByTestId('wf-point')).toHaveCount(target.points);

    // Select a point: the card names it with its connections; Escape lets go.
    const point = page.getByTestId('wf-point').nth(Math.floor(target.points / 2));
    const before = await point.boundingBox();
    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2);
    await page.mouse.down();
    await page.mouse.move(before!.x + 30, before!.y + 20, { steps: 4 });
    await page.mouse.up();
    await expect(page.getByTestId('wf-selection')).toContainText(/connection/);
    await expect(page.getByTestId('wf-selection')).toContainText('Moved on this page');
    const after = await page.getByTestId('wf-point').nth(Math.floor(target.points / 2)).boundingBox();
    expect(Math.round(after!.x - before!.x)).not.toBe(0);
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('wf-selection')).toHaveCount(0);

    // Select a path (Move tool): the card says it is the stored one.
    await page.locator('[data-wf-path]').first().dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await expect(page.getByTestId('wf-selection')).toContainText('Path');
    // The counts never change by selecting; a reload would restore the moved point.
    expect(await counts(page)).toMatchObject({ points: target.points, paths: target.paths });
    done();
  });

  test('stacked floorplate: Range groups the floors, paths are shared, each floor links its own units', async ({ page }) => {
    const done = audit(page);
    const [floorplates, graph] = await Promise.all([plates(STACKED), hallways(STACKED)]);
    const stack = floorplates.filter((row) => row.floors.length > 1).map((row) => ({ row, ...graphOf(graph, row.id) })).sort((a, b) => b.points - a.points)[0];
    const floors = stack.row.floors;
    const label = `Floors ${floors[0]}–${floors[floors.length - 1]}`;
    await openMap(page, STACKED);

    // One card for the whole range, read from `floorplates.range`, not one per floor.
    const card = levelTab(page, new RegExp(label));
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(`${floors.length} floors · stacked`);
    // Plot on Map offers the stack's floors.
    const floorSelect = page.getByTestId('plot-panel').getByRole('combobox', { name: 'Floor' });
    await expect(floorSelect.locator('option')).toHaveCount(floors.length + 1);

    await page.getByRole('tab', { name: 'Wayfinding' }).click();
    await card.click();
    await expect(wayfinding(page)).toContainText(label);
    const stackPanel = page.getByTestId('wf-stack');
    await expect(stackPanel.getByRole('tab')).toHaveText(floors.map(String));
    await expect(stackPanel).toContainText(`Hallway paths are shared by all ${floors.length} floors.`);
    const shared = await counts(page);
    expect(shared).toMatchObject({ points: stack.points, paths: stack.paths });

    // Another floor: the same paths, that floor's units.
    const other = floors[Math.min(3, floors.length - 1)];
    await stackPanel.getByRole('tab', { name: String(other), exact: true }).click();
    await expect(stackPanel.getByRole('tab', { name: String(other), exact: true })).toHaveAttribute('aria-selected', 'true');
    expect(await counts(page)).toMatchObject({ points: stack.points, paths: stack.paths });
    await expect(stackPanel).toContainText(new RegExp(`on Floor ${other}`));
    await expect(page.getByTestId('wf-from')).toBeVisible();
    await expect(wayfinding(page)).toContainText(`Floor ${other} (shares ${label})`);
    done();
  });

  test('Test shortest path: This Floor, Floors (through a real elevator), sample, swap, invalid and picker', async ({ page }) => {
    const done = audit(page);
    await openMap(page, STACKED);
    await page.getByRole('tab', { name: 'Wayfinding' }).click();
    const panel = wayfinding(page);
    const scopes = panel.getByRole('tablist', { name: 'Route across' });
    await expect(scopes.getByRole('tab', { name: 'This Floor' })).toHaveAttribute('aria-selected', 'true');

    await panel.getByRole('button', { name: /Try a sample route/ }).click();
    await expect(page.getByTestId('wf-route')).toContainText('px along the plan');
    await expect(page.getByTestId('wf-route-line')).toHaveCount(1);
    const fromBefore = await page.getByTestId('wf-from').innerText();
    await panel.getByRole('button', { name: 'Swap start and destination' }).click();
    await expect(page.getByTestId('wf-to')).toHaveText(fromBefore);

    await scopes.getByRole('tab', { name: 'Floors' }).click();
    await panel.getByRole('button', { name: /Try a sample route/ }).click();
    const route = page.getByTestId('wf-route');
    await expect(route).toContainText('elevator ride');
    await expect(route.locator('.bo-wf__step')).toContainText([/^Walk on/, /^Take /, /^Walk on/, /^Arrive at/]);
    await panel.getByRole('button', { name: /Play Route/ }).click();
    await expect(page.getByTestId('wf-walker')).toHaveCount(1);
    await panel.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect(page.getByTestId('wf-walker')).toHaveCount(0);

    // The picker: search, kinds, keyboard; the same place twice is refused.
    await panel.getByRole('button', { name: 'From', exact: true }).click();
    const picker = page.locator('[data-wf-pick]');
    await expect(picker).toContainText('Choose start');
    await picker.getByRole('button', { name: 'Stops', exact: true }).click();
    await picker.locator('input').press('Enter');
    const start = await page.getByTestId('wf-from').innerText();
    await panel.getByRole('button', { name: 'To', exact: true }).click();
    await picker.locator('input').fill(start);
    await picker.locator('input').press('Enter');
    await panel.getByRole('button', { name: 'Find Shortest Path' }).click();
    await expect(page.getByTestId('wf-route-error')).toContainText('Pick two different places');
    done();
  });

  /** Runs Detect Hallways from the toolbar menu and waits for the run to finish. */
  const detect = async (page: Page, option: RegExp) => {
    await page.getByRole('button', { name: /^Detect Hallways/ }).click();
    await page.getByRole('menuitem', { name: option }).click();
    await expect(page.getByTestId('wf-detect')).toBeVisible();
    await expect(page.locator('.bo-wf__detect--running')).toHaveCount(0, { timeout: 180_000 });
  };
  /** The point under a spot that is really on top there (a dense floor overlaps points). */
  const topPoint = (page: Page) =>
    page.evaluate(() => {
      for (const el of Array.from(document.querySelectorAll('[data-testid="wf-point"]'))) {
        const r = el.getBoundingClientRect();
        const x = r.x + r.width / 2;
        const y = r.y + r.height / 2;
        if (document.elementFromPoint(x, y) === el) return { key: el.getAttribute('data-node')!, x, y };
      }
      return null;
    });
  /** A spot on the plan — the floor image or the floor SVG under it — with no point, path or stop on it. */
  const planSpot = (page: Page, skip = 0) =>
    page.evaluate((skip) => {
      const plan = document.querySelector('[data-testid="plan"]')!.getBoundingClientRect();
      let found = 0;
      for (let fy = 0.2; fy < 0.8; fy += 0.03)
        for (let fx = 0.2; fx < 0.8; fx += 0.03) {
          const x = plan.left + plan.width * fx;
          const y = plan.top + plan.height * fy;
          const el = document.elementFromPoint(x, y);
          if (el?.closest('[data-testid="plan"]') && !el.closest('[data-node]') && !el.closest('[data-wf-path]') && found++ >= skip) return { x, y };
        }
      return null;
    }, skip);
  /** A spot on a path, away from its points. */
  const pathSpot = (page: Page, skip = 0) =>
    page.evaluate((skip) => {
      let found = 0;
      for (const el of Array.from(document.querySelectorAll<SVGPolylineElement>('polyline[data-wf-path]'))) {
        const length = el.getTotalLength();
        if (length < 4) continue;
        const p = el.getPointAtLength(length * 0.4);
        const m = el.getScreenCTM()!;
        const x = p.x * m.a + m.e;
        const y = p.y * m.d + m.f;
        if (document.elementFromPoint(x, y) === el && found++ >= skip) return { key: el.getAttribute('data-wf-path')!, x, y };
      }
      return null;
    }, skip);

  test('Detect Hallways · All floorplates: floorplates with stored paths keep them (auto-connected only), the rest are read from their floor SVG; Undo restores', async ({ page }) => {
    const done = audit(page);
    const [floorplates, graph] = await Promise.all([plates(DETECT), hallways(DETECT)]);
    const stored = floorplates.filter((row) => graphOf(graph, row.id).points > 0);
    expect(stored.length, 'the property needs a floorplate with stored hallways').toBeGreaterThan(0);
    await openMap(page, DETECT);
    await page.getByRole('tab', { name: 'Wayfinding' }).click();
    await page.getByRole('button', { name: /^Detect Hallways/ }).click();
    await expect(page.getByRole('menuitem', { name: /All floorplates/ })).toContainText(`${floorplates.length} floorplates`);
    await page.keyboard.press('Escape');
    await page.mouse.move(5, 5);
    await detect(page, /All floorplates/);

    const rows = page.getByTestId('wf-detect-rows').locator('.bo-wf__detectrow');
    await expect(rows).toHaveCount(floorplates.length);
    for (const plate of floorplates) {
      const row = rows.filter({ hasText: plate.floors.length === 1 ? `Floor ${plate.floors[0]}` : plate.name }).first();
      const status = await row.getAttribute('data-status');
      if (graphOf(graph, plate.id).points > 0) {
        // Never overwritten: the stored hallways are reported and kept exactly as stored.
        expect(status).toBe('existing');
        await expect(row).toContainText(`${graphOf(graph, plate.id).points} stored hallway points kept`);
      } else if (!plate.svg) {
        expect(status).toBe('noSvg');
      } else {
        expect(['detected', 'noHallway', 'invalidSvg', 'failed']).toContain(status);
      }
    }
    await expect(page.getByTestId('wf-detect-title')).toContainText(/Hallways detected on \d+ floorplate/);

    // The stored floorplate still shows every one of the CMS's points and links (Auto-Connect may add page paths beside them, never fewer).
    const keep = stored[0];
    await levelTab(page, new RegExp(`Floor ${keep.floors[0]}\\b`)).first().click();
    const keptCounts = await counts(page);
    expect(keptCounts.points).toBe(graphOf(graph, keep.id).points);
    expect(keptCounts.paths).toBeGreaterThanOrEqual(graphOf(graph, keep.id).paths);
    // Every stored point is still on the plan.
    const storedKeys = graph.filter((row) => row.parent_type === 'Floorplate' && row.parent_id === keep.id).map((row) => `h:${row.id}`);
    for (const key of storedKeys) await expect(page.locator(`[data-node="${key}"]`)).toHaveCount(1);

    // One Undo takes the whole run back.
    await page.getByTestId('wf-detect').getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByTestId('wf-detect')).toHaveCount(0);
    for (const plate of floorplates.filter((row) => !graphOf(graph, row.id).points)) {
      await levelTab(page, new RegExp(`Floor ${plate.floors[0]}\\b`)).first().click();
      expect(await counts(page)).toMatchObject({ points: 0, paths: 0 });
    }
    done();
  });

  test('default editing (no tool): drag, double-click to delete, click to add, drag a path to bend it, double-click a path, Ctrl/Cmd+Z; a tool overrides them', async ({ page }) => {
    const done = audit(page);
    const [floorplates, graph] = await Promise.all([plates(DETECT), hallways(DETECT)]);
    const target = floorplates.find((row) => row.svg && !graphOf(graph, row.id).points)!;
    await openMap(page, DETECT);
    await page.getByRole('tab', { name: 'Wayfinding' }).click();
    await levelTab(page, new RegExp(`Floor ${target.floors[0]}\\b`)).first().click();
    await expect(page.getByTestId('plan-svg').locator('svg')).toHaveCount(1, { timeout: 120_000 });
    await detect(page, /This floorplate/);
    await expect(page.getByTestId('wf-detect-rows')).toContainText('Detected');
    const detected = await counts(page);
    expect(detected.points).toBeGreaterThan(2);

    // Drag a point: it moves, and the inferred point counts as reviewed.
    const point = (await topPoint(page))!;
    const node = page.locator(`[data-node="${point.key}"]`);
    const left = await node.evaluate((el) => (el as HTMLElement).style.left);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 20, point.y + 15, { steps: 5 });
    await page.mouse.up();
    expect(await node.evaluate((el) => (el as HTMLElement).style.left)).not.toBe(left);
    await expect(node).not.toHaveAttribute('data-pending', '1');
    await page.keyboard.press('Control+z');
    expect(await node.evaluate((el) => (el as HTMLElement).style.left)).toBe(left);

    // Double-click a point: deleted, its neighbours re-joined (one path fewer per point removed, the others joined).
    const doomed = (await topPoint(page))!;
    await page.mouse.dblclick(doomed.x, doomed.y);
    expect((await counts(page)).points).toBe(detected.points - 1);
    await page.keyboard.press('Control+z');
    expect(await counts(page)).toMatchObject({ points: detected.points, paths: detected.paths });

    // Click the empty plan: a point, linked to its neighbours.
    const spot = (await planSpot(page, 3))!;
    await page.mouse.click(spot.x, spot.y);
    const added = await counts(page);
    expect(added.points).toBe(detected.points + 1);
    expect(added.paths).toBeGreaterThan(detected.paths);
    await page.keyboard.press('Control+z');
    expect(await counts(page)).toMatchObject({ points: detected.points, paths: detected.paths });

    // Drag a path: a point appears where it is let go, the path splits around it.
    const bend = (await pathSpot(page))!;
    await page.mouse.move(bend.x, bend.y);
    await page.mouse.down();
    await page.mouse.move(bend.x + 15, bend.y + 15, { steps: 4 });
    await expect(page.getByTestId('wf-bend')).toHaveCount(1);
    await page.mouse.move(bend.x + 25, bend.y + 25, { steps: 2 });
    await page.mouse.up();
    const bent = await counts(page);
    expect(bent.points).toBe(detected.points + 1);
    expect(bent.paths).toBeGreaterThanOrEqual(detected.paths + 1);
    await expect(page.locator(`[data-wf-path="${bend.key}"]`)).toHaveCount(0);
    await page.keyboard.press('Control+z');

    // Double-click a path: only that connection goes.
    const cut = (await pathSpot(page, 1))!;
    await page.mouse.dblclick(cut.x, cut.y);
    expect(await counts(page)).toMatchObject({ points: detected.points, paths: detected.paths - 1 });
    await page.getByTestId('wf-undo').click();
    expect(await counts(page)).toMatchObject({ points: detected.points, paths: detected.paths });

    // With Move on, a double-click deletes nothing and a click on the plan adds nothing.
    await page.getByRole('button', { name: 'Move', exact: true }).click();
    const again = (await topPoint(page))!;
    await page.mouse.dblclick(again.x, again.y);
    await page.mouse.click(spot.x, spot.y);
    expect(await counts(page)).toMatchObject({ points: detected.points, paths: detected.paths });

    // Detect Hallways again on a floorplate that already has paths: every point stays (nothing replaced, nothing asked), only Auto-Connect runs.
    await page.getByRole('button', { name: 'Move', exact: true }).click();
    await detect(page, /This floorplate/);
    await expect(page.getByTestId('wf-detect-rows').locator('.bo-wf__detectrow').first()).toHaveAttribute('data-status', 'existing');
    await expect(page.getByTestId('wf-detect-rows')).toContainText('Existing paths kept');
    expect((await counts(page)).points).toBe(detected.points);
    expect((await counts(page)).paths).toBeGreaterThanOrEqual(detected.paths);
    done();
  });

  test('Find Shortest Path on a detected floor follows the detected corridors; a floorplate with only floor images has nothing to detect', async ({ page }) => {
    const done = audit(page);
    const [floorplates, graph] = await Promise.all([plates(DETECT), hallways(DETECT)]);
    const target = floorplates.find((row) => row.svg && !graphOf(graph, row.id).points)!;
    await openMap(page, DETECT);
    await page.getByRole('tab', { name: 'Wayfinding' }).click();
    await levelTab(page, new RegExp(`Floor ${target.floors[0]}\\b`)).first().click();
    await page.getByRole('button', { name: 'Find Shortest Path' }).click();
    await expect(page.getByTestId('wf-route-error')).toContainText('has no paths yet');
    await detect(page, /This floorplate/);
    await page.getByRole('button', { name: 'Find Shortest Path' }).click();
    const route = page.getByTestId('wf-route');
    await expect(route).toContainText('SVG units along the plan');
    await expect(page.getByTestId('wf-route-line')).toHaveCount(1);
    await expect(page.getByTestId('wf-route-warning')).toContainText(/inferred point/);
    done();

    const [imageOnly, imageGraph] = await Promise.all([plates(NO_SVG), hallways(NO_SVG)]);
    const bare = imageOnly.find((row) => !row.svg && !graphOf(imageGraph, row.id).points)!;
    const second = await page.context().newPage();
    const finish = audit(second);
    await signIn(second);
    await second.goto(`/properties/${NO_SVG}/map`);
    await hydrated(second);
    await second.getByRole('tab', { name: 'Wayfinding' }).click();
    await levelTab(second, new RegExp(`Floor ${bare.floors[0]}\\b`)).first().click();
    await detect(second, /This floorplate/);
    await expect(second.getByTestId('wf-detect-rows').locator('.bo-wf__detectrow').first()).toHaveAttribute('data-status', 'noSvg');
    await expect(second.getByTestId('wf-detect-title')).toHaveText('Nothing to detect');
    finish();
  });

  test('Plot on Map: search, select all, unplot and the counts stay in step with the map', async ({ page }) => {
    const done = audit(page);
    await openMap(page, STACKED);
    const panel = page.getByTestId('plot-panel');
    const tabs = async () => (await panel.locator('.bo-map__plottab').allInnerTexts()).map((text) => Number(text.replace(/\D+/g, ' ').trim()));
    await expect(panel.locator('.bo-map__showsummary')).toHaveText('Units');
    const [todo0, done0] = await tabs();
    const pins0 = await page.locator('.bo-map__pin').count();

    await panel.getByRole('tab', { name: /Plotted/ }).click();
    const first = await panel.locator('.bo-map__plotname').first().innerText();
    await panel.getByRole('searchbox').fill(first);
    await expect(panel.locator('.bo-map__plotrow')).toHaveCount(1);
    await panel.locator('.bo-map__plotpick--all').click();
    await expect(panel.locator('.bo-map__plotalllabel')).toHaveText('1 selected');
    await panel.getByRole('button', { name: /^Unplot 1/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Unplot' }).click();
    await panel.getByRole('searchbox').fill('');
    expect(await tabs()).toEqual([todo0 + 1, done0 - 1]);
    await expect(page.locator('.bo-map__pin')).toHaveCount(pins0 - 1);
    await panel.getByRole('tab', { name: /To Plot/ }).click();
    await expect(panel.locator('.bo-map__plotname', { hasText: first })).toHaveCount(1);

    // Show: Additional Stops lists the stored elevators and entry points of this floorplate.
    await panel.getByRole('button', { name: /^Show/ }).click();
    await panel.getByRole('menuitemcheckbox', { name: /Additional Stops/ }).click();
    await expect(panel.getByRole('button', { name: 'Add Stop' })).toBeVisible();
    done();
  });

  test('Additional Stops: the dialog, its validation, Cancel and ×, Add & Place on Map as a temporary stop', async ({ page }) => {
    const done = audit(page);
    await openMap(page, STACKED);
    const panel = page.getByTestId('plot-panel');
    await panel.getByRole('button', { name: /^Show/ }).click();
    await panel.getByRole('menuitemcheckbox', { name: /Additional Stops/ }).click();
    await page.mouse.move(5, 5);

    await panel.getByRole('button', { name: 'Add Stop' }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Add Additional Stop');
    await expect(dialog.getByRole('radio')).toHaveText([
      'Entry Point', 'Exit Point', 'Elevator', 'Stairs', 'Ramp', 'Door / Gate', 'Blocker', 'Leasing Office', 'Restroom', 'Mail & Packages', 'Parking Access', 'Waypoint'
    ]);
    await expect(dialog).toContainText('Where self-tour visitors enter the building. Routes start here.');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await panel.getByRole('button', { name: 'Add Stop' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await panel.getByRole('button', { name: 'Add Stop' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await panel.getByRole('button', { name: 'Add Stop' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'Elevator' }).click();
    await dialog.getByPlaceholder('e.g. Elevator A').fill('x'.repeat(90));
    await dialog.getByPlaceholder('e.g. Lobby–12').fill('three');
    await dialog.getByPlaceholder('e.g. Tap your tour pass on the reader to call the elevator.').fill('y'.repeat(510));
    await dialog.getByTestId('stop-save').click();
    await expect(dialog.getByRole('alert')).toHaveText([/name under 80/, /Floors served reads like/, /instruction under 500/]);
    await dialog.getByPlaceholder('e.g. Elevator A').fill('Freight Lift');
    await dialog.getByPlaceholder('e.g. Lobby–12').fill('Lobby–6');
    await dialog.getByPlaceholder('e.g. Tap your tour pass on the reader to call the elevator.').fill('Use the freight lift by the loading dock.');
    await expect(dialog.getByRole('alert')).toHaveCount(0);
    await expect(dialog.getByTestId('stop-save')).toHaveText('Add & Place on Map');
    await dialog.getByTestId('stop-save').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.bo-map__armed')).toContainText('Freight Lift');

    const spot = await emptySpot(page, 2);
    await page.mouse.click(spot!.x, spot!.y);
    await expect(page.getByTestId('wf-stop').filter({ hasText: 'Freight Lift' })).toHaveCount(1);
    await panel.getByRole('tab', { name: /Plotted/ }).click();
    await expect(panel.locator('.bo-map__plotrow', { hasText: 'Freight Lift' })).toContainText('Elevator · On plan');

    // It routes in Wayfinding, then can be removed from the page.
    await page.getByRole('tab', { name: 'Wayfinding' }).click();
    await expect(page.getByTestId('wf-stop').filter({ hasText: 'Freight Lift' })).toHaveCount(1);
    await page.getByRole('tab', { name: 'Plotting' }).click();
    await page.getByTestId('wf-stop').filter({ hasText: 'Freight Lift' }).dispatchEvent('pointerdown', { bubbles: true, pointerId: 1 });
    await page.getByTestId('stop-popover').getByRole('button', { name: 'Remove' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Remove Stop' }).click();
    await expect(page.getByTestId('wf-stop').filter({ hasText: 'Freight Lift' })).toHaveCount(0);
    done();
  });

  test('Buildings: a route between floorplates of two buildings', async ({ page }) => {
    const done = audit(page);
    await openMap(page, BUILDINGS);
    await page.getByRole('tab', { name: 'Wayfinding' }).click();
    const panel = wayfinding(page);
    await panel.getByRole('tablist', { name: 'Route across' }).getByRole('tab', { name: 'Buildings' }).click();
    await panel.getByRole('button', { name: /Try a sample route/ }).click();
    await expect(page.getByTestId('wf-route')).toContainText('2 floors');
    done();
  });
});
