import { expect, test } from '@playwright/test';

import type { InventoryFloorplate, InventoryUnit, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import type { MapElevator, MapHallway, MapStartingPoint, PropertyMap, WayfindingGraph } from '~/core/models/data/propertyMap.data';
import { generateMapLevels, isStacked, stackFloor } from '~/core/utils/generator/map/mapLevels.generator';
import { generateRasterGraphs } from '~/core/utils/generator/map/mapNodes.generator';
import { generatePlotPanel } from '~/core/utils/generator/map/mapPanels.generator';
import { initialLocalMapState, type LocalMapState, type TempStop } from '~/core/utils/generator/map/mapState';
import { generateDetectView, generateWayfindingPanel, newStopForm, stopFormErrors, wayfindingEnabled } from '~/core/utils/generator/map/wayfinding.generator';
import { snapshotOf } from '~/core/utils/wayfinding/hallwayEdits';
import { anchorsOnFloor, parseServedFloors, plateProgress, wayfindingPlate, type WfPlate } from '~/core/utils/wayfinding/wayfindingGraph';
import { computeWayfindingRoute, defaultPair, routeGroups, sampleRoute, type WfRouteInput } from '~/core/utils/wayfinding/wayfindingRoute';

/**
 * The Wayfinding mode's logic, on a small property shaped like the CMS's
 * data: a one-floor lobby (range "1"), a stacked floorplate (range "5-14",
 * one layout for ten floors, units on their own floors), a second building,
 * hallways stored as `next_points`, an elevator serving 1–14 and one entry
 * point per building. These are unit fixtures for the pure functions; the
 * screen itself is tested on real CMS data in `wayfinding.spec.ts`.
 */

const upload = (name: string) => ({ url: `https://example.invalid/${name}`, fileName: name });

const plate = (over: Partial<InventoryFloorplate>): InventoryFloorplate =>
  ({
    name: 'Plate',
    number: null,
    building: 'Tower A',
    range: '1',
    floors: [1],
    floorName: null,
    image: upload('floor.png'),
    svg: null,
    width: 1000,
    height: 600,
    svgWidth: null,
    svgHeight: null,
    ...over
  }) as unknown as InventoryFloorplate;

const unit = (id: number, name: string, floorplateId: number, floor: number, x: number, y: number, building = 'Tower A'): InventoryUnit =>
  ({ id, marketingName: name, displayName: null, providerUnitId: null, floor, building, floorplateId, xPlot: x, yPlot: y, svgPointer: null, doorId: null, floorplanId: null }) as unknown as InventoryUnit;

/** A straight corridor of hallway nodes at y = 300 (stored as an icon's top-left: the centre is +8). */
const corridor = (firstId: number, parentId: number, xs: number[]): MapHallway[] =>
  xs.map((x, index) => ({
    id: firstId + index,
    xPlot: x - 8,
    yPlot: 292,
    nextPoints: index < xs.length - 1 ? [firstId + index + 1] : [],
    selected: false,
    parentType: 'Floorplate',
    parentId,
    source: 'manual',
    reviewStatus: 'confirmed',
    confidence: null,
    space: 'raster',
    detectionRunId: null
  }));

const elevator = (over: Partial<MapElevator>): MapElevator => ({
  id: 1,
  name: 'Elevator A',
  description: null,
  xPlot: 492,
  yPlot: 292,
  floorplateId: null,
  sitemapId: null,
  coveringRange: '1-14',
  floors: Array.from({ length: 14 }, (_v, i) => i + 1),
  building: 'Tower A',
  directionalText: null,
  duplicateOf: null,
  lockProvider: null,
  kind: 'elevator',
  accessible: true,
  floorPositions: {},
  image: null,
  gallery: [],
  banks: [],
  tourStop: null,
  ...over
});

const entry = (id: number, building: string, x: number): MapStartingPoint => ({
  id,
  name: `Building ${building} Entry / Exit`,
  building,
  floor: 1,
  xPlot: x - 8,
  yPlot: 292,
  status: null,
  directionalText: null,
  lockProvider: null,
  tourStop: null
});

const buildMap = (overrides: { elevators?: MapElevator[]; selfTour?: boolean } = {}): PropertyMap => {
  const inventory = {
    property: { id: 1, name: 'Fixture Place', companyId: null, companyName: null },
    floorplates: [
      plate({ id: 10, name: 'Lobby', range: '1', floors: [1] }),
      plate({ id: 20, name: 'Tower', range: '5-14', floors: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14] }),
      plate({ id: 30, name: 'Annex', building: 'Annex B', range: '1', floors: [1] })
    ],
    floorplans: [],
    units: [
      unit(101, 'Unit 0101', 10, 1, 200, 250),
      unit(501, 'Unit 0501', 20, 5, 800, 250),
      unit(601, 'Unit 0601', 20, 6, 800, 250),
      unit(901, 'Unit 0901', 20, 9, 300, 350),
      unit(7001, 'Unit B101', 30, 1, 700, 350, 'Annex B')
    ],
    unitsLoaded: true,
    unitCount: 5,
    amenities: [],
    mapType: 'floorplates',
    svgMode: false,
    tourStopCount: 0,
    beansSvg: false,
    sharedBackground: null,
    markers: { unitColor: '#C62534', amenityColor: '#0077AE' },
    sitemap: null,
    selfTour: true
  } as unknown as PropertyInventory;
  const graph = {
    settings: { autoWayfinding: true, selfTour: overrides.selfTour ?? true, isSitemap: false, enableSvgMode: false, defaultMapFloor: null, markerSize: null, availableUnitsColor: null, modelUnitsColor: null, amenitiesColor: null },
    buildings: ['Tower A', 'Annex B'],
    floorToFloorplate: {},
    hallways: [...corridor(1, 10, [100, 300, 500, 700]), ...corridor(100, 20, [100, 300, 500, 800]), ...corridor(200, 30, [200, 500, 700])],
    elevators: overrides.elevators ?? [elevator({})],
    buildingStartingPoints: [entry(1, 'Tower A', 100), entry(2, 'Annex B', 200)],
    tour: null,
    tourStops: [],
    doors: [],
    bedroomMarkerColors: [],
    ocr: {},
    hallwayEdges: [],
    hallwayAttachments: [],
    wayfindingStops: [],
    levelsMeta: [],
    suppressions: {}
  } as unknown as WayfindingGraph;
  return { inventory, graph, write: { versions: {}, csrfToken: null, writesEnabled: true, canEditMap: true } };
};

const setup = (map: PropertyMap, patch: Partial<LocalMapState> = {}) => {
  const levels = generateMapLevels(map);
  const state: LocalMapState = { ...initialLocalMapState(levels[0].id, null, 'svg'), mode: 'wayfind', ...patch };
  const raster = generateRasterGraphs(map, levels, state);
  const plates: Record<string, WfPlate> = Object.fromEntries(levels.map((level) => [level.id, wayfindingPlate(map, levels, level, raster[level.id], state)]));
  const level = (name: string) => levels.find((row) => row.label === name || row.rangeLabel === name)!;
  return { levels, state, plates, level };
};

test.describe('Wayfinding logic', () => {
  test('a floorplate whose Range covers several floors is one stacked level (5-14 → Floors 5–14)', () => {
    const { levels } = setup(buildMap());
    expect(levels).toHaveLength(3);
    const tower = levels.find((level) => level.recordId === 20)!;
    expect(isStacked(tower)).toBe(true);
    expect(tower.label).toBe('Floors 5–14');
    expect(tower.rangeLabel).toBe('Floors 5–14');
    expect(tower.stackLabel).toBe('10 floors · stacked');
    const lobby = levels.find((level) => level.recordId === 10)!;
    expect(isStacked(lobby)).toBe(false);
    expect(lobby.stackLabel).toBe('1 floor');
    expect(stackFloor(tower, null)).toBe(5);
    expect(stackFloor(tower, 9)).toBe(9);
    expect(stackFloor(tower, 3)).toBe(5);
  });

  test('a stack shares its hallways while each floor keeps its own units; shared stops apply to every floor', () => {
    const { plates, level } = setup(buildMap());
    const tower = plates[level('Floors 5–14').id];
    expect(tower.points).toHaveLength(4);
    expect(tower.paths).toHaveLength(3);
    const on = (floor: number) => anchorsOnFloor(tower, floor).map((anchor) => anchor.label).sort();
    expect(on(5)).toEqual(['Elevator A', 'Unit 0501']);
    expect(on(6)).toEqual(['Elevator A', 'Unit 0601']);
    expect(on(12)).toEqual(['Elevator A']);
    // Every anchor joins its nearest point, as ShortestPath#get_unit_data does; that point has paths, so it is linked.
    expect(anchorsOnFloor(tower, 5).every((anchor) => anchor.linked)).toBe(true);
    expect(plateProgress(tower, 5)).toMatchObject({ state: 'done', linked: 2, total: 2 });
  });

  test('a bridge removed on the page detaches only that unit: it is listed as not linked with the reason, a route to it fails, and Connect links it again', () => {
    const map = buildMap();
    const detached = setup(map, { wfLinks: { 'floorplate:20|unit:501': null } });
    const tower = detached.plates[detached.level('Floors 5–14').id];
    const unit = anchorsOnFloor(tower, 5).find((anchor) => anchor.label === 'Unit 0501')!;
    expect(unit).toMatchObject({ attached: null, linked: false, explicit: true, detached: true });
    // Only that bridge went: the elevator still joins its nearest point, and the hallways are intact.
    expect(anchorsOnFloor(tower, 5).find((anchor) => anchor.label === 'Elevator A')).toMatchObject({ linked: true, detached: false });
    expect(tower.points).toHaveLength(4);
    expect(tower.paths).toHaveLength(3);
    expect(plateProgress(tower, 5)).toMatchObject({ state: 'partial', linked: 1, total: 2 });
    const level = detached.level('Floors 5–14');
    const input: WfRouteInput = { levels: detached.levels, plates: detached.plates, current: level, floor: 5, scope: 'plate', stepFree: false };
    const groups = routeGroups(input);
    const panel = generateWayfindingPanel(map, detached.levels, level, tower, { ...detached.state, levelId: level.id, wfFloor: 5 }, groups, defaultPair(input, groups, '', ''), true);
    expect(panel.counts.linked).toBe('1/2');
    expect(panel.unlinked?.rows.map((row) => row.name)).toEqual(['Unit 0501']);
    expect(panel.unlinked?.rows[0].meta).toContain('bridge removed on this page');
    const route = computeWayfindingRoute(input, groups, `${level.id}@5|e:1`, `${level.id}@5|unit:501`);
    expect(route.ok).toBe(false);
    if (!route.ok) expect(route.error).toContain('isn’t connected');
    // Connect again: linked by hand to a stored point.
    const relinked = setup(map, { wfLinks: { 'floorplate:20|unit:501': 'h:101' } });
    const again = anchorsOnFloor(relinked.plates[level.id], 5).find((anchor) => anchor.label === 'Unit 0501')!;
    expect(again).toMatchObject({ attached: 'h:101', linked: true, explicit: true, detached: false });
  });

  test('a unit plotted only on the floor SVG has no place on the image floor; placed at a point by hand it links and routes there', () => {
    const map = buildMap();
    const svgOnly = { ...unit(102, 'Unit 0102', 10, 1, 0, 0), xPlot: null, yPlot: null, svgPointer: { xPlot: 10, yPlot: 10, tag: 'rect', elementId: 'A1', selector: '#A1' } } as unknown as InventoryUnit;
    map.inventory.units.push(svgOnly);
    const before = setup(map);
    const lobby = before.level('Floor 1');
    const anchor = anchorsOnFloor(before.plates[lobby.id], null).find((row) => row.label === 'Unit 0102')!;
    expect(anchor).toMatchObject({ offLayer: true, linked: false, placedHere: false, x: null });
    const inputBefore: WfRouteInput = { levels: before.levels, plates: before.plates, current: lobby, floor: null, scope: 'plate', stepFree: false };
    const groupsBefore = routeGroups(inputBefore);
    const panelBefore = generateWayfindingPanel(map, before.levels, lobby, before.plates[lobby.id], { ...before.state, levelId: lobby.id, wfTool: 'connect', wfFrom: 'h:1' }, groupsBefore, defaultPair(inputBefore, groupsBefore, '', ''), true);
    const row = panelBefore.unlinked?.rows.find((item) => item.name === 'Unit 0102');
    expect(row?.meta).toContain('Plotted on the floor SVG only');
    expect(row?.link).toBe('Place at the selected point and link');
    // Placed at the second hallway point and linked to it.
    const after = setup(map, { wfPlaces: { [`${lobby.id}|unit:102`]: { x: 308, y: 300, space: 'raster' } }, wfLinks: { [`${lobby.id}|unit:102`]: 'h:2' } });
    const placed = anchorsOnFloor(after.plates[lobby.id], null).find((item) => item.label === 'Unit 0102')!;
    expect(placed).toMatchObject({ offLayer: false, placedHere: true, attached: 'h:2', linked: true, x: 308, y: 300 });
    const input: WfRouteInput = { levels: after.levels, plates: after.plates, current: lobby, floor: null, scope: 'plate', stepFree: false };
    const groups = routeGroups(input);
    const route = computeWayfindingRoute(input, groups, `${lobby.id}@|unit:101`, `${lobby.id}@|unit:102`);
    expect(route.ok).toBe(true);
  });

  test('the Detect card on a kept floorplate names the stops that still join no path and says why', () => {
    const map = buildMap();
    const detached = setup(map, { wfLinks: { 'floorplate:20|unit:501': null } });
    const level = detached.level('Floors 5–14');
    const run = {
      scope: 'plate' as const,
      rows: [{ levelId: level.id, name: 'Tower A · Floors 5–14', status: 'existing' as const, points: 4, paths: 0, source: null, note: '4 stored hallway points kept — not overwritten' }],
      running: false,
      stopped: false,
      snapshot: snapshotOf(detached.state),
      undoDepth: 0
    };
    const view = generateDetectView({ ...detached.state, wfDetect: run }, detached.plates)!;
    expect(view.title).toBe('Existing paths kept · 1 not linked');
    expect(view.rows[0].detail).toBe('4 stored hallway points kept — not overwritten · 1 not linked — Unit 0501 (bridge removed on this page)');
    expect(view.empty).toContain('still join no path');
    expect(view.canUndo).toBe(false);
    // Linked again: the same run reads as nothing to do.
    const relinked = setup(map, { wfLinks: { 'floorplate:20|unit:501': 'h:101' } });
    const again = generateDetectView({ ...relinked.state, wfDetect: run }, relinked.plates)!;
    expect(again.title).toBe('Nothing to detect');
    expect(again.rows[0].detail).toBe('4 stored hallway points kept — not overwritten');
  });

  test('the stacked panel: range, every floor, completion per floor, the floor-specific unit example', () => {
    const map = buildMap();
    const { levels, plates, level, state } = setup(map);
    const tower = level('Floors 5–14');
    const view = { ...state, levelId: tower.id, wfFloor: 5 };
    const input: WfRouteInput = { levels, plates, current: tower, floor: 5, scope: 'plate', stepFree: false };
    const groups = routeGroups(input);
    const panel = generateWayfindingPanel(map, levels, tower, plates[tower.id], view, groups, defaultPair(input, groups, '', ''), true);
    expect(panel.scopeLabel).toBe('Tower A · Floors 5–14');
    expect(panel.stacked?.count).toBe(10);
    expect(panel.stacked?.floors.map((row) => row.label)).toEqual(['5', '6', '7', '8', '9', '10', '11', '12', '13', '14']);
    expect(panel.stacked?.unitExample).toBe('Unit 0501 on Floor 5');
    expect(panel.counts).toEqual({ points: '4', paths: '3', linked: '2/2' });
    expect(panel.status.label).toBe('Complete');
    expect(groups[0].label).toBe('Floor 5 (shares Floors 5–14)');
  });

  test('a single floor has no stack section and routes within the floor', () => {
    const map = buildMap();
    const { levels, plates, level, state } = setup(map);
    const lobby = level('Floor 1');
    const input: WfRouteInput = { levels, plates, current: lobby, floor: null, scope: 'plate', stepFree: false };
    const groups = routeGroups(input);
    const [a, b] = defaultPair(input, groups, '', '');
    expect(groups.flatMap((group) => group.items).find((item) => item.id === a)?.anchor.type).toBe('entry');
    const panel = generateWayfindingPanel(map, levels, lobby, plates[lobby.id], { ...state, levelId: lobby.id }, groups, [a, b], true);
    expect(panel.stacked).toBeNull();
    const route = computeWayfindingRoute(input, groups, a, b);
    expect(route.ok).toBe(true);
    if (route.ok) {
      expect(route.multi).toBe(false);
      expect(route.steps.map((step) => step.kind)).toEqual(['walk', 'end']);
      expect(route.px).toBeGreaterThan(0);
    }
  });

  test('Floors: two floors of one stack join through the elevator that serves them', () => {
    const { levels, plates, level } = setup(buildMap());
    const tower = level('Floors 5–14');
    const input: WfRouteInput = { levels, plates, current: tower, floor: 5, scope: 'floors', stepFree: false };
    const groups = routeGroups(input);
    const from = groups.flatMap((group) => group.items).find((item) => item.label === 'Unit 0501')!;
    const to = groups.flatMap((group) => group.items).find((item) => item.label === 'Unit 0901')!;
    const route = computeWayfindingRoute(input, groups, from.id, to.id);
    expect(route.ok).toBe(true);
    if (route.ok) {
      expect(route.multi).toBe(true);
      expect(route.steps.map((step) => step.kind)).toEqual(['walk', 'elevator', 'walk', 'end']);
      expect(route.steps[1].title).toBe('Take Elevator A to Floor 9');
      expect(route.steps[1].sub).toBe('Up 4 floors');
    }
  });

  test('no vertical link: a route between floors without an elevator fails with the real reason and a fix', () => {
    const { levels, plates, level } = setup(buildMap({ elevators: [] }));
    const tower = level('Floors 5–14');
    const input: WfRouteInput = { levels, plates, current: tower, floor: 5, scope: 'floors', stepFree: false };
    const groups = routeGroups(input);
    const from = groups.flatMap((group) => group.items).find((item) => item.label === 'Unit 0501')!;
    const to = groups.flatMap((group) => group.items).find((item) => item.label === 'Unit 0901')!;
    const route = computeWayfindingRoute(input, groups, from.id, to.id);
    expect(route.ok).toBe(false);
    if (!route.ok) {
      expect(route.error).toContain('No elevator or stairs links these floors');
      expect(route.fix?.kind).toBe('stop');
    }
  });

  test('stairs added on the page join floors, and Step-free leaves them out', () => {
    const map = buildMap({ elevators: [] });
    const base = setup(map);
    const tower = base.level('Floors 5–14');
    const stairs: TempStop = { key: 'n:1', type: 'stairs', name: 'North Stairs', building: 'Tower A', levelId: tower.id, floorOnly: null, floors: '', accessible: false, lock: false, note: '', x: 300, y: 300 };
    const { levels, plates } = setup(map, { tempStops: [stairs] });
    const groupsOf = (stepFree: boolean) => {
      const input: WfRouteInput = { levels, plates, current: tower, floor: 5, scope: 'floors', stepFree };
      const groups = routeGroups(input);
      const from = groups.flatMap((group) => group.items).find((item) => item.label === 'Unit 0501')!;
      const to = groups.flatMap((group) => group.items).find((item) => item.label === 'Unit 0901')!;
      return computeWayfindingRoute(input, groups, from.id, to.id);
    };
    const walk = groupsOf(false);
    expect(walk.ok && walk.steps.some((step) => step.kind === 'stairs')).toBe(true);
    const stepFree = groupsOf(true);
    expect(stepFree.ok).toBe(false);
    if (!stepFree.ok) expect(stepFree.error).toContain('No step-free route');
  });

  test('a blocker added on the page cuts the hallway it sits on', () => {
    const map = buildMap();
    const base = setup(map);
    const lobby = base.level('Floor 1');
    const blocker: TempStop = { key: 'n:1', type: 'blocker', name: 'Closed Hallway', building: 'Tower A', levelId: lobby.id, floorOnly: null, floors: '', accessible: false, lock: false, note: '', x: 400, y: 300 };
    const { levels, plates } = setup(map, { tempStops: [blocker] });
    const input: WfRouteInput = { levels, plates, current: lobby, floor: null, scope: 'plate', stepFree: false };
    const groups = routeGroups(input);
    const from = groups.flatMap((group) => group.items).find((item) => item.anchor.type === 'entry')!;
    const to = groups.flatMap((group) => group.items).find((item) => item.label === 'Elevator A')!;
    const route = computeWayfindingRoute(input, groups, from.id, to.id);
    expect(route.ok).toBe(false);
    if (!route.ok) expect(route.error).toContain('cut off by a blocker');
  });

  test('Buildings: entry / exit points join two buildings; the same place twice is an invalid route', () => {
    const { levels, plates, level } = setup(buildMap());
    const lobby = level('Floor 1');
    const input: WfRouteInput = { levels, plates, current: lobby, floor: null, scope: 'buildings', stepFree: false };
    const groups = routeGroups(input);
    const items = groups.flatMap((group) => group.items);
    const from = items.find((item) => item.label === 'Unit 0101')!;
    const to = items.find((item) => item.label === 'Unit B101')!;
    const route = computeWayfindingRoute(input, groups, from.id, to.id);
    expect(route.ok && route.steps.some((step) => step.kind === 'outdoor')).toBe(true);
    const same = computeWayfindingRoute(input, groups, from.id, from.id);
    expect(same.ok).toBe(false);
    if (!same.ok) expect(same.error).toBe('Pick two different places for the start and destination.');
    const sample = sampleRoute(input, groups);
    expect(sample?.route.ok).toBe(true);
  });

  test('a floorplate with no paths cannot be routed to, and says how to fix it', () => {
    const map = buildMap();
    map.graph.hallways = map.graph.hallways.filter((hallway) => hallway.parentId !== 30);
    const { levels, plates, level } = setup(map);
    const lobby = level('Floor 1');
    const input: WfRouteInput = { levels, plates, current: lobby, floor: null, scope: 'buildings', stepFree: false };
    const groups = routeGroups(input);
    const items = groups.flatMap((group) => group.items);
    const route = computeWayfindingRoute(input, groups, items.find((item) => item.label === 'Unit 0101')!.id, items.find((item) => item.label === 'Unit B101')!.id);
    expect(route.ok).toBe(false);
    if (!route.ok) {
      expect(route.error).toContain('has no paths yet');
      expect(route.fix?.kind).toBe('detect');
    }
    expect(plateProgress(plates[levels.find((row) => row.recordId === 30)!.id], null).state).toBe('none');
  });

  test('Plot on Map: Show, the stacked floor, search and the counts', () => {
    const map = buildMap();
    const { levels, plates, level, state } = setup(map);
    const tower = level('Floors 5–14');
    const plotState = { ...state, mode: 'plot' as const, levelId: tower.id };
    const panel = (patch: Partial<LocalMapState>) => {
      const next = { ...plotState, ...patch };
      return generatePlotPanel(map, levels, tower, [], {}, next, plates[tower.id].stops);
    };
    expect(panel({}).floorOptions?.[0].label).toBe('All 10 floors · shared stops only');
    expect(panel({ plotShow: { unit: false, amenity: false, stop: true } }).done.map((row) => row.label)).toEqual(['Elevator A']);
    expect(panel({}).showSummary).toBe('Units');
  });

  test('Add Additional Stop: the form checks type, building, floorplate, name, served floors and instruction', () => {
    const map = buildMap();
    const { levels, level } = setup(map);
    const form = newStopForm(level('Floor 1'), levels);
    expect(stopFormErrors(form, levels)).toEqual({});
    expect(Object.keys(stopFormErrors({ ...form, levelId: '' }, levels))).toContain('levelId');
    expect(Object.keys(stopFormErrors({ ...form, building: 'Nowhere' }, levels))).toEqual(expect.arrayContaining(['building', 'levelId']));
    expect(Object.keys(stopFormErrors({ ...form, name: 'x'.repeat(81) }, levels))).toEqual(['name']);
    expect(Object.keys(stopFormErrors({ ...form, type: 'elevator', floors: '3-x' }, levels))).toEqual(['floors']);
    expect(Object.keys(stopFormErrors({ ...form, note: 'x'.repeat(501) }, levels))).toEqual(['note']);
    expect(Object.keys(stopFormErrors({ ...form, levelId: level('Floors 5–14').id, floorOnly: '3' }, levels))).toEqual(['floorOnly']);
    expect(parseServedFloors('Lobby–3')).toEqual([1, 2, 3]);
    expect(parseServedFloors('1, 4-5')).toEqual([1, 4, 5]);
    expect(parseServedFloors('two')).toBeNull();
  });

  test('the toggle is offered only to self-tour wayfinding properties', () => {
    expect(wayfindingEnabled(buildMap())).toBe(true);
    expect(wayfindingEnabled(buildMap({ selfTour: false }))).toBe(false);
  });
});
