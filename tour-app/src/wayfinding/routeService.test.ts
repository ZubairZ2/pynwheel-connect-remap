import { describe, expect, it } from 'vitest';
import { buildDummyProperty } from '~/dummy';
import { RouteService, describeLength, summarizeRoute } from './routeService';

const { graph } = buildDummyProperty();

const find = (from: string, to: string, options: ConstructorParameters<typeof RouteService>[1] = {}) => new RouteService(graph, options).find(from, to);

describe('RouteService on the dummy graph', () => {
  it('routes on one floor along hallway points', () => {
    const result = find('bsp:1', 'amenity:1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { route } = result;
    expect(route.legs).toHaveLength(1);
    expect(route.legs[0].kind).toBe('walk');
    expect(route.stages).toEqual([{ level: 'floorplate:101', floor: 1, building: 'Tower A *', leg: 0 }]);
    expect(route.lengthFt).toBeGreaterThan(0);
    expect(route.steps.map((s) => s.kind)).toEqual(['walk', 'arrive']);
    expect(route.steps[0].title).toBe('Walk to Fitness Center *');
    expect(route.steps[1].title).toBe('Arrive at Fitness Center *');
  });

  it('rides the elevator between floors and says so', () => {
    const result = find('bsp:1', 'unit:304');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const kinds = result.route.legs.map((l) => l.kind);
    expect(kinds).toEqual(['walk', 'elevator', 'walk']);
    const ride = result.route.legs[1];
    expect(ride.kind === 'elevator' && ride.floorFrom).toBe(1);
    expect(ride.kind === 'elevator' && ride.floorTo).toBe(3);
    expect(result.route.steps.map((s) => s.title)).toEqual(['Walk to Elevator A *', 'Take Elevator A * to Floor 3', 'Walk to Unit 0304 *', 'Arrive at Unit 0304 *']);
    expect(result.route.steps[1].sub).toBe('Up 2 floors');
    expect(summarizeRoute(result.route)).toBe('2 floors · 1 elevator ride');
    expect(describeLength(result.route)).toMatch(/ft · about \d+ (sec|min)/);
  });

  it('prefers the stairs for one floor when they are shorter, and the elevator when step-free', () => {
    const stairs = find('unit:103', 'unit:204');
    expect(stairs.ok && stairs.route.legs.some((l) => l.kind === 'stairs')).toBe(true);
    if (stairs.ok) expect(stairs.route.steps[1].title).toBe('Take the stairs to Floor 2');
    const stepFree = find('unit:103', 'unit:204', { stepFree: true });
    expect(stepFree.ok && stepFree.route.legs.map((l) => l.kind)).toEqual(['walk', 'elevator', 'walk']);
  });

  it('routes between buildings through the gates and an outdoor walk on the site plan', () => {
    const result = find('unit:101', 'amenity:7');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const kinds = result.route.legs.map((l) => l.kind);
    expect(kinds).toContain('outdoor');
    expect(kinds).toContain('stairs');
    const outdoor = result.route.legs.find((l) => l.kind === 'outdoor');
    expect(outdoor && outdoor.kind === 'outdoor' && outdoor.level).toBe('sitemap:1');
    expect(outdoor && outdoor.kind === 'outdoor' && outdoor.points?.length).toBeGreaterThan(1);
    expect(result.route.stages.some((s) => s.level === 'sitemap:1')).toBe(true);
    expect(result.route.steps.some((s) => s.kind === 'outdoor' && s.title.startsWith('Walk outside to'))).toBe(true);
  });

  it('fails step-free into Tower B floor 2 because only stairs serve it', () => {
    const result = find('bsp:1', 'amenity:7', { stepFree: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('no_step_free');
  });

  it('answers the backend error taxonomy', () => {
    expect(find('unit:101', 'unit:101')).toMatchObject({ ok: false, error: { code: 'same_endpoint' } });
    expect(find('unit:101', 'unit:999')).toMatchObject({ ok: false, error: { code: 'unknown_endpoint' } });
    const unlinked = find('bsp:1', 'unit:104');
    expect(unlinked).toMatchObject({ ok: false, error: { code: 'not_linked' } });
    if (!unlinked.ok) expect(unlinked.error.message).toBe('Storage Room * is not connected to a path on Floor 1 (Floor 1 *).');
    expect(find('bsp:1', 'amenity:5')).toMatchObject({ ok: false, error: { code: 'not_linked' } });
    expect(find('bsp:1', 'elevator:1')).toMatchObject({ ok: false, error: { code: 'ambiguous_floor' } });
    const toElevator = new RouteService(graph).find('bsp:1', 'elevator:1', { toFloor: 15 });
    expect(toElevator.ok).toBe(true);
  });

  it('walks round the blocker, and reports it when nothing else is possible', () => {
    const around = find('unit:102', 'unit:103');
    expect(around.ok).toBe(true);
    if (!around.ok) return;
    const nodes = around.route.legs.flatMap((l) => (l.kind === 'walk' ? l.nodes : []));
    // The direct corridor hallway:3 → hallway:4 passes the Wet Floor blocker; the route takes the top loop instead.
    expect(nodes).toContain('hallway:7');
    const through = find('unit:102', 'unit:103', { avoidBlockers: false });
    expect(through.ok && through.route.lengthPx < around.route.lengthPx).toBe(true);
  });

  it('chains the whole tour in building, floor and sort order and keeps each stop segment', () => {
    const result = new RouteService(graph).tour(['amenity:1', 'unit:204', 'amenity:3', 'amenity:6']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { tour } = result;
    expect(tour.segments.map((s) => s.node)).toEqual(['amenity:1', 'unit:204', 'amenity:3', 'amenity:6']);
    expect(tour.route.from).toBe('tour_start:1');
    expect(tour.route.to).toBe('tour_start:1');
    expect(tour.route.steps.filter((s) => s.kind === 'arrive' && s.dwellS)).toHaveLength(4);
    expect(tour.route.durationS).toBeGreaterThan(14 * 60);
    expect(tour.route.warnings).toEqual([]);
  });

  it('skips a tour stop that cannot be reached with a warning', () => {
    const custom = { ...graph, tour: { ...graph.tour!, stops: [...graph.tour!.stops, { tourStopId: 999, node: 'amenity:5', stopType: 'amenity', name: 'Rooftop Garden *', sort: 99, visible: true, durationMinutes: 2, onMap: true }] } };
    const result = new RouteService(custom).tour(['amenity:1', 'amenity:5']);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tour.segments.map((s) => s.node)).toEqual(['amenity:1']);
    expect(result.tour.route.warnings.length).toBeGreaterThan(0);
  });
});
