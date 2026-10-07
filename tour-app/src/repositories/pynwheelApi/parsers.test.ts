import { describe, expect, it } from 'vitest';
import type { ApiGraph, ApiPropertyDetail, ApiRoute, ApiStopsResponse, ApiTourRouteResponse } from './apiTypes';
import { amenityIcon, floorLabelOf, parseBundle, parseDistances, parseRoute, parseTourRoute } from './parsers';

const graph: ApiGraph = {
  success: true,
  version: 'wf-1-abc',
  community_id: 1,
  is_sitemap: false,
  auto_wayfinding: true,
  scale: { unit: 'px', ft_per_px: null },
  levels: [
    { id: 'floorplate:10', kind: 'floorplate', name: 'Floors 1-3', building: 'A', floors: [1, 2, 3], image: 'https://img/a.png', svg: null, width: 760, height: 470, space: 'raster', scale_ft_per_px: null, version: 2 },
    { id: 'floorplate:11', kind: 'floorplate', name: 'Floor 5', building: 'A', floors: [5], image: null, svg: 'https://img/b.svg', width: 760, height: 470, space: 'raster', scale_ft_per_px: null, version: 0 }
  ],
  buildings: ['A'],
  nodes: [
    { id: 'hallway:1', kind: 'hallway', level: 'floorplate:10', floor: null, building: 'A', name: null, x: 100, y: 100, anchor: 'icon_top_left', review: 'confirmed' },
    { id: 'unit:101', kind: 'unit', level: 'floorplate:10', floor: 1, building: 'A', name: '101', x: 320, y: 60, anchor: 'point', attach: 'hallway:1', link: 'nearest', note: 'Turn left' },
    { id: 'amenity:11', kind: 'amenity', level: 'floorplate:10', floor: 1, building: 'A', name: 'Gym', x: 120, y: 140, anchor: 'point', attach: 'hallway:1', link: 'nearest' },
    { id: 'elevator:50', kind: 'elevator', level: 'floorplate:10', floor: null, building: 'A', name: 'Elevator 1', x: 290, y: 90, anchor: 'icon_top_left', attach: 'hallway:1', link: 'nearest', vertical: 'elevator', accessible: true, floors_served: [1, 2, 3, 5] },
    { id: 'tour_start:7', kind: 'tour_start', level: 'floorplate:10', floor: 1, building: 'A', name: 'Main Tour', x: 90, y: 92, anchor: 'icon_top_left', attach: 'hallway:1', link: 'nearest' },
    { id: 'stop:3', kind: 'leasing', level: 'floorplate:10', floor: 1, building: 'A', name: 'Leasing', x: 50, y: 50, anchor: 'point', attach: 'hallway:1', link: 'detached' }
  ],
  edges: [{ from: 'hallway:1', to: 'hallway:2', kind: 'walk', path_kind: 'manual', level: 'floorplate:10', length_px: 200, polyline: [[108, 108], [308, 108]] }],
  vertical_connections: [{ id: 'elevator:50', kind: 'elevator', floors: [1, 2, 3, 5], accessible: true, levels: ['floorplate:10', 'floorplate:11'] }],
  gates: [{ id: 'tour_start:7', building: 'A', kind: 'tour_start' }],
  tour: { id: 7, start: 'tour_start:7', starting_floor: 1, building: 'A', building_order: ['A'], version: 2, stops: [{ tour_stop_id: 1, node: 'unit:101', stop_type: 'unit', name: '101', sort: 1, visible: true, duration_minutes: 4, on_map: true }] }
};

const stops: ApiStopsResponse = {
  success: true,
  property_id: 1,
  graph_version: 'wf-1-abc',
  tour_id: 7,
  start_node: 'tour_start:7',
  groups: [
    { key: 'amenities', label: 'Amenities', stops: [{ id: 'amenity:11', type: 'amenity', record_id: 11, tour_stop_id: 3, name: 'Gym', description: 'Open 6-10', instruction: 'Past the mailroom', building: 'A', floor: 1, level_id: 'floorplate:10', floorplate_id: 10, location: { x: 120, y: 140 }, map_node_id: 'amenity:11', routable: true, sort: 1, duration_minutes: 3, unit: null, amenity: { amenity_type: 'Fitness', video_url: null, video_button_label: null } }] },
    { key: 'floorplans', label: 'Floorplans', stops: [{ id: 'unit:101', type: 'unit', record_id: 101, tour_stop_id: 1, name: '101', description: null, instruction: 'Turn left', building: 'A', floor: 1, level_id: 'floorplate:10', floorplate_id: 10, location: { x: 320, y: 60 }, map_node_id: 'unit:101', routable: true, sort: 1, duration_minutes: 4, unit: { bedrooms: 2, bathrooms: 2, square_feet: 850, rent: 2400, available: true, model: false, floorplan_name: 'A1' }, amenity: null }] }
  ],
  total: 2
};

const detail: ApiPropertyDetail = { id: 1, name: 'Tour Property', address: '1 Main St', city: 'Denver', state: 'CO', zip: '80202', company: 'Acme', tour_enabled: true, is_sitemap: false, auto_wayfinding: true, floorplates_count: 2, units_count: 5, amenities_count: 2, buildings: ['A'], tour: { id: 7, start_node: 'tour_start:7', starting_floor: 1, building: 'A', building_order: ['A'], stops_total: 2 }, graph_version: 'wf-1-abc' };

const route: ApiRoute = {
  start: { id: 'tour_start:7', type: 'tour_start', name: 'Main Tour' },
  destination: { id: 'unit:101', type: 'unit', name: '101' },
  step_free: false,
  avoid_blockers: true,
  total_distance: 1032.4,
  unit: 'px',
  total_distance_ft: null,
  duration_s: null,
  floors: [{ level_id: 'floorplate:10', number: 1, name: 'Floor 1' }],
  buildings: ['A'],
  stages: [{ level_id: 'floorplate:10', floor: 1, building: 'A', leg: 0 }],
  legs: [{ index: 0, kind: 'walk', level: 'floorplate:10', floor: 1, building: 'A', from: 'tour_start:7', to: 'unit:101', length_px: 1032.4, points: [[98, 100], [108, 108], [320, 60]], nodes: ['tour_start:7', 'hallway:1', 'unit:101'] }],
  steps: [
    { sequence: 1, type: 'walk', title: 'Walk on Floor 1', description: 'From Main Tour to 101 · 1,032 px', instruction: null, distance: 1032.4, unit: 'px', distance_ft: null, floor: { level_id: 'floorplate:10', number: 1, name: 'Floor 1' }, from: { id: 'tour_start:7', type: 'tour_start', name: 'Main Tour' }, to: { id: 'unit:101', type: 'unit', name: '101' }, leg: 0, geometry: [[98, 100], [108, 108], [320, 60]], transition: null },
    { sequence: 2, type: 'arrive', title: 'Arrive at 101', description: 'Floor 1', instruction: 'Turn left', distance: 0, unit: 'px', distance_ft: null, floor: { level_id: 'floorplate:10', number: 1, name: 'Floor 1' }, from: null, to: { id: 'unit:101', type: 'unit', name: '101' }, leg: 0, geometry: [], transition: null, dwell_s: 240 }
  ],
  warnings: []
};

describe('API parsers', () => {
  it('builds the property bundle from the detail, graph and stops', () => {
    const bundle = parseBundle(detail, graph, stops, 'fallback.jpg');
    expect(bundle.demo).toBe(false);
    expect(bundle.property).toMatchObject({ id: 1, name: 'Tour Property', address: '1 Main St, Denver, CO', tourEnabled: true, floorsCount: 4, heroImage: 'https://img/a.png' });
    expect(bundle.levels.map((l) => l.id)).toEqual(['floorplate:10', 'floorplate:11']);
    expect(bundle.levels[1].svgUrl).toBe('https://img/b.svg');
    expect(bundle.units[0]).toMatchObject({ node: 'unit:101', name: '101', bedrooms: 2, bathrooms: 2, sqft: 850, rent: 2400, description: 'Turn left', routable: true, showInStopsList: true });
    expect(bundle.amenities[0]).toMatchObject({ node: 'amenity:11', name: 'Gym', icon: 'dumbbell', description: 'Open 6-10', instruction: 'Past the mailroom' });
    expect(bundle.floorLabels['unit:101']).toBe('A · Floor 1');
    expect(bundle.stops.map((s) => [s.node, s.kind, s.destination])).toEqual([
      ['elevator:50', 'elevator', false],
      ['tour_start:7', 'entry', true],
      ['stop:3', 'leasing', true]
    ]);
    expect(bundle.graph.nodes.find((n) => n.id === 'stop:3')?.link).toBe(false);
    expect(bundle.graph.tour?.stops[0]).toMatchObject({ node: 'unit:101', durationMinutes: 4, visible: true });
    expect(bundle.buildings).toEqual([{ name: 'A', levels: ['floorplate:10', 'floorplate:11'] }]);
  });

  it('parses a route into legs, steps and stages', () => {
    const parsed = parseRoute(route);
    expect(parsed.from).toBe('tour_start:7');
    expect(parsed.lengthPx).toBe(1032.4);
    expect(parsed.legs[0]).toMatchObject({ kind: 'walk', level: 'floorplate:10', floor: 1, lengthPx: 1032.4 });
    expect(parsed.steps).toEqual([
      { kind: 'walk', leg: 0, title: 'Walk on Floor 1', sub: 'From Main Tour to 101 · 1,032 px', dwellS: undefined },
      { kind: 'arrive', leg: 0, title: 'Arrive at 101', sub: 'Floor 1 · Turn left', dwellS: 240 }
    ]);
    expect(parsed.stages).toEqual([{ level: 'floorplate:10', floor: 1, building: 'A', leg: 0 }]);
  });

  it('parses a tour route with segments and distances', () => {
    const body: ApiTourRouteResponse = { success: true, graph_version: 'wf-1-abc', route, segments: [{ stop_id: 'unit:101', tour_stop_id: 1, from_stop_id: 'tour_start:7', route }], skipped: [] };
    const tour = parseTourRoute(body);
    expect(tour.segments).toHaveLength(1);
    expect(tour.segments[0]).toMatchObject({ node: 'unit:101', from: 'tour_start:7' });
    const distances = parseDistances({ success: true, graph_version: 'wf-1-abc', from_stop_id: 'tour_start:7', distances: { 'unit:101': { reachable: true, distance: 1032.4, unit: 'px', distance_ft: null, duration_s: null, direction: 'level', error: null }, 'unit:999': { reachable: false, distance: 0, unit: 'px', distance_ft: null, duration_s: null, direction: 'level', error: { code: 'not_linked', message: 'Island is not connected to a path on Floor 1.' } } } });
    expect(distances['unit:101']).toEqual({ lengthPx: 1032.4, lengthFt: null, durationS: null, direction: 'level', unreachable: null });
    expect(distances['unit:999'].unreachable).toContain('Island');
  });

  it('never crashes on missing fields', () => {
    const sparse = { ...graph, nodes: undefined, edges: null, tour: null } as unknown as ApiGraph;
    const bundle = parseBundle(detail, sparse, { ...stops, groups: undefined } as unknown as ApiStopsResponse, 'x.jpg');
    expect(bundle.units).toEqual([]);
    expect(bundle.graph.nodes).toEqual([]);
    expect(bundle.graph.tour).toBeNull();
    expect(floorLabelOf([], 'floorplate:99', 3)).toBe('Floor 3');
    expect(amenityIcon('Resident Lounge', null)).toBe('coffee');
    expect(amenityIcon('Something', 'Other')).toBe('star');
  });
});
