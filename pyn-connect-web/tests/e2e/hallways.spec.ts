import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import type { MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import { initialLocalMapState, type LocalMapState } from '~/core/utils/generator/map/mapState';
import { graphPatch, plateGraph, snapshotOf } from '~/core/utils/wayfinding/hallwayEdits';
import { autoConnectNodes, computeAutoConnectDistance, connectNodeToNearest } from '~/core/utils/wayfinding/hallways/autoConnect';
import { bridgeComponentGaps, computeGapBridgeDistance } from '~/core/utils/wayfinding/hallways/bridgeGaps';
import { buildWayfindingGraph, computeSnapTolerance } from '~/core/utils/wayfinding/hallways/buildGraph';
import { addNode, confirmNodesAboveConfidence, deleteEdge, deleteNode, moveNode, rerouteEdge, type GraphState, type HallwayNode } from '~/core/utils/wayfinding/hallways/editing';
import { detectHallways, dropShortComponents } from '~/core/utils/wayfinding/hallways/extract';
import { polylineLength } from '~/core/utils/wayfinding/hallways/geometry';
import { buildObstacleIndex } from '~/core/utils/wayfinding/hallways/obstacles';
import { detectSvgStructure, normalizeId } from '~/core/utils/wayfinding/hallways/svg/detectLayers';
import { elementCentres } from '~/core/utils/wayfinding/hallways/svg/elementCentre';
import { normalizePath, parsePathToSubpaths } from '~/core/utils/wayfinding/hallways/svg/pathData';
import { flattenShapes } from '~/core/utils/wayfinding/hallways/svg/shapes';
import type { WayfindingEdge } from '~/core/utils/wayfinding/hallways/types';
import type { WfAnchor, WfPath, WfPlate, WfPoint } from '~/core/utils/wayfinding/wayfindingGraph';
import { computeWayfindingRoute, routeGroups, type WfRouteInput } from '~/core/utils/wayfinding/wayfindingRoute';
import { readSvgTree } from './helpers/svgTree';

/**
 * The hallway engine behind Detect Hallways, Auto-Connect Paths, the POC's
 * editing gestures and Find Shortest Path — the POC (`sample_pyn_wheel_map`)
 * ported, plus corridor inference for floor SVGs with no walkway layer. Pure
 * functions in Node, no server: small SVGs in the shape of the CMS's real
 * floor exports (Illustrator ids, every floor in one file with the others
 * hidden, building outlines inside the Units layer) are written here, and
 * the POC's own real exports are read from its folder when it is on this
 * machine (`PYN_CONNECT_POC_FIXTURES`), to hold the port to the POC's
 * numbers. The screen itself is tested on real CMS data in `wayfinding.spec.ts`.
 */

const POC = process.env.PYN_CONNECT_POC_FIXTURES ?? '/Users/zubairzulifqar/sample_pyn_wheel_map/fixtures';

const svg = (body: string, viewBox = '0 0 400 200') => readSvgTree(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`);

/** A floor the way the CMS's floor files draw one: a footprint, two rows of units with a corridor between, another floor hidden, the building outline inside Units. */
const CMS_FLOOR = `
  <g id="BG"><g id="Footprints"><polygon points="20,40 380,40 380,160 20,160"/></g></g>
  <g id="Units_00000108289148132906082740000002495668690600411069_">
    <g id="A-3" display="none"><rect id="A301" x="20" y="40" width="360" height="120"/></g>
    <g id="A-4">
      <g id="Outlines"><polygon points="20,40 380,40 380,160 20,160"/></g>
      <g id="Layer_1"><rect id="A401" x="20" y="40" width="90" height="45"/><text>A401</text></g>
      <g id="Layer_2"><rect id="A402" x="110" y="40" width="90" height="45"/><text>A402</text></g>
      <g id="Layer_3"><rect id="A403" x="200" y="40" width="90" height="45"/><text>A403</text></g>
      <g id="Layer_4"><rect id="A404" x="290" y="40" width="90" height="45"/><text>A404</text></g>
      <g id="Layer_5"><rect id="A405" x="20" y="115" width="180" height="45"/><text>A405</text></g>
      <g id="Layer_6"><rect id="A406" x="200" y="115" width="180" height="45"/><text>A406</text></g>
    </g>
  </g>
  <g id="AMENITIES__x28_other_x29_"><g id="A-4_00000041987244240049791300000003604144569412050106_"><rect x="290" y="95" width="10" height="10"/></g></g>`;

const unitStops = [
  ['unit:401', 65, 62],
  ['unit:402', 155, 62],
  ['unit:403', 245, 62],
  ['unit:404', 335, 62],
  ['unit:405', 110, 137],
  ['unit:406', 290, 137]
].map(([groupId, x, y]) => ({ groupId: String(groupId), label: String(groupId), anchor: { x: Number(x), y: Number(y) } }));

const node = (id: string, x: number, y: number, extra: Partial<HallwayNode> = {}): HallwayNode => ({ id, x, y, source: 'manual', review: 'confirmed', confidence: null, ...extra });
const edge = (a: HallwayNode, b: HallwayNode, mid: { x: number; y: number }[] = [], kind: WayfindingEdge['kind'] = 'traced'): WayfindingEdge => {
  const pathPoints = [{ x: a.x, y: a.y }, ...mid, { x: b.x, y: b.y }];
  return { id: `${a.id}|${b.id}`, fromNodeId: a.id, toNodeId: b.id, pathPoints, length: polylineLength(pathPoints), kind };
};

test.describe('Hallway engine', () => {
  test.describe('SVG adapter (the POC’s Phase 1–2)', () => {
    test('path data: every command is reduced to absolute M / L / C / Z, arcs end exactly, compact flags read one character', () => {
      // `0110 0` is large-arc 0, sweep 1, then x 10, y 0.
      const commands = normalizePath('m10 10 h20 v20 l-5 5 z M 0 0 C 0 10 10 10 10 0 S 20 -10 20 0 Q 25 5 30 0 T 40 0 a5 5 0 0110 0');
      expect(commands.map((c) => c.type).join('')).toBe('MLLLZMCCCC' + 'C'.repeat(commands.length - 10));
      const last = commands[commands.length - 1];
      expect(last.type === 'C' && Math.abs(last.x - 50) < 1e-9 && Math.abs(last.y) < 1e-9).toBe(true);
      // S reflects the previous control point: (10,10) about (10,0) → (10,-10).
      const s = commands[7];
      expect(s.type === 'C' && s.x1 === 10 && s.y1 === -10).toBe(true);
      // A malformed tail keeps what parsed.
      expect(normalizePath('M0 0 L10 0 L bogus').map((c) => c.type)).toEqual(['M', 'L']);
    });

    test('curves are sampled by arc length and transforms apply to control points', () => {
      const { subpaths } = parsePathToSubpaths('M0 0 C 0 55 100 55 100 0', { flattenStep: 8, matrix: { a: 2, b: 0, c: 0, d: 2, e: 10, f: 0 } });
      const line = subpaths[0];
      expect(line[0]).toEqual({ x: 10, y: 0 });
      expect(line[line.length - 1]).toEqual({ x: 210, y: 0 });
      const gaps = line.slice(1).map((p, i) => Math.hypot(p.x - line[i].x, p.y - line[i].y));
      expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.6);
    });

    test('layer ids: Illustrator escapes and uniqueness suffixes are read as the layer they name; hidden floors are ignored', () => {
      expect(normalizeId('AMENITIES__x28_other_x29_')).toBe('amenities (other)');
      expect(normalizeId('Units_00000108289148132906082740000002495668690600411069_')).toBe('units');
      const structure = detectSvgStructure(svg(CMS_FLOOR));
      expect(structure.found).toBe(false);
      expect(structure.footprintShapes).toHaveLength(1);
      // The hidden floor's room and the Outlines envelope are not rooms.
      expect(structure.roomShapes.map((shape) => shape.elementId)).toEqual(['A401', 'A402', 'A403', 'A404', 'A405', 'A406', '']);
    });

    test('a polygon’s centre comes from the element the pointer names, not its stored x / y', () => {
      const centre = elementCentres(svg(`<g transform="translate(100,0)">${CMS_FLOOR}</g>`));
      expect(centre('A401', null)).toEqual({ x: 165, y: 62.5 });
      expect(centre(null, 'g[id="Layer_2"] > rect')).toEqual({ x: 255, y: 62.5 });
      expect(centre('nope', null)).toBeNull();
    });

    test('unreadable files are refused: malformed, empty, not an SVG', () => {
      expect(() => readSvgTree('<svg xmlns="http://www.w3.org/2000/svg"><g></svg>')).toThrow();
      expect(() => readSvgTree('')).toThrow();
      expect(() => readSvgTree('<html></html>')).toThrow();
    });
  });

  test.describe('Detect Hallways', () => {
    test('a walkway layer is traced: crossings become junctions, stops split the path they sit beside, obstacles stop Auto-Connect', () => {
      const root = svg(`
        <path id="Walkways" d="M 20 100 L 380 100 M 200 20 L 200 180"/>
        <g id="Building_Outline"><polygon points="60,20 120,20 120,80 60,80"/></g>`);
      const result = detectHallways(root, [{ groupId: 'unit:1', label: 'Unit 1', anchor: { x: 90, y: 112 } }]);
      expect(result.ok).toBe(true);
      expect(result.source).toBe('vector');
      // Two strokes that cross with no shared vertex meet at a true junction.
      const centre = result.nodes.find((n) => Math.abs(n.x - 200) < 1e-6 && Math.abs(n.y - 100) < 1e-6);
      expect(centre).toBeTruthy();
      expect(result.edges.filter((e) => e.fromNodeId === centre!.id || e.toNodeId === centre!.id)).toHaveLength(4);
      // The stop joined the path at its projection (a split), not at a far node.
      expect(result.connections[0].connectionMethod).toBe('edge_split');
      const joined = result.nodes.find((n) => n.id === result.connections[0].connectedNodeId)!;
      expect(joined).toMatchObject({ x: 90, y: 100 });
      expect(result.nodes.every((n) => n.review === 'confirmed' && n.source === 'vector')).toBe(true);
      expect(result.obstacles.length).toBeGreaterThan(0);
    });

    test('a gap left in the drawn art is bridged from the loose end, shortest first', () => {
      const subpaths = [
        [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        [{ x: 115, y: 0 }, { x: 215, y: 0 }]
      ];
      const built = buildWayfindingGraph(subpaths, { snapTolerance: 1 });
      const bridged = bridgeComponentGaps(built.graph, { maxGapDistance: computeGapBridgeDistance(215), snapTolerance: 1 });
      expect(bridged.bridgeCount).toBe(1);
      expect(bridged.graph.edges.filter((e) => e.kind === 'bridge')).toHaveLength(1);
      expect(bridged.graph.edges.find((e) => e.kind === 'bridge')!.length).toBeCloseTo(15, 6);
    });

    test('no walkway layer: the corridor between the rooms inside the footprint is inferred, joined to every unit, pending review', () => {
      const result = detectHallways(svg(CMS_FLOOR), unitStops);
      expect(result.ok).toBe(true);
      expect(result.source).toBe('inferred');
      expect(result.layers).toEqual(['Footprints', 'Units']);
      // The corridor runs along y ≈ 100 for most of the floor.
      const corridor = result.edges.filter((e) => e.kind === 'inferred');
      const xs = corridor.flatMap((e) => e.pathPoints.map((p) => p.x));
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(250);
      expect(corridor.flatMap((e) => e.pathPoints).every((p) => Math.abs(p.y - 100) < 12)).toBe(true);
      // Every unit joined the corridor; none had to be forced.
      expect(result.connections.map((c) => c.connectionMethod)).not.toContain('unconnected');
      // Inferred points are proposals with a confidence.
      expect(result.nodes.some((n) => n.review === 'pending' && n.confidence != null && n.confidence > 0 && n.confidence <= 1)).toBe(true);
      // The rooms and the footprint are obstacles for Auto-Connect.
      expect(buildObstacleIndex(result.obstacles).blocks({ x: 60, y: 100 }, { x: 60, y: 20 })).toBe(true);
    });

    test('nothing to read: no walkway and no footprint layer, or a footprint the rooms fill, report why', () => {
      const none = detectHallways(svg('<g id="Units"><rect x="0" y="0" width="10" height="10"/></g>'), []);
      expect(none).toMatchObject({ ok: false, failure: 'no-hallway-layer', nodes: [], edges: [] });
      const full = detectHallways(svg('<g id="Footprints"><rect x="0" y="0" width="200" height="100"/></g><g id="Units"><rect x="0" y="0" width="200" height="100"/></g>'), []);
      expect(full).toMatchObject({ ok: false, failure: 'no-corridor' });
      const blank = detectHallways(svg(''), []);
      expect(blank.failure).toBe('no-hallway-layer');
    });

    test('short islands (a recess between rooms and the outer wall) are dropped; a corridor is kept', () => {
      const a = node('a', 0, 0);
      const b = node('b', 300, 0);
      const c = node('c', 500, 500);
      const d = node('d', 505, 500);
      const kept = dropShortComponents({ nodes: [a, b, c, d], edges: [edge(a, b), edge(c, d)] }, 30);
      expect(kept.nodes.map((n) => n.id)).toEqual(['a', 'b']);
      expect(kept.edges).toHaveLength(1);
    });

    test.describe('the POC’s real exports, held to the POC’s own numbers', () => {
      test.skip(!existsSync(POC), `POC fixtures not found at ${POC}`);
      // Measured with the POC's own functions (svg-pathdata, rbush) on the same files: [built nodes, edges] → [bridged nodes, edges, bridges] → Auto-Connect [drawn, blocked, redundant, isolated].
      const EXPECTED: [string, number, [number, number], [number, number, number], [number, number, number, number]][] = [
        ['77 N Camino Seco, Tucson, AZ_bg.svg', 1002.9, [227, 229], [227, 233, 4], [16, 210, 92, 0]],
        ['10700 N La Reserve Dr, Tucson, AZ_bg.svg', 946.47, [354, 360], [357, 370, 7], [12, 150, 335, 0]],
        ['Floor_3_withBG.svg', 1564.17, [500, 424], [516, 518, 78], [154, 250, 322, 0]]
      ];
      for (const [file, diagonal, built, bridged, auto] of EXPECTED) {
        test(file, () => {
          const root = readSvgTree(readFileSync(`${POC}/${file}`, 'utf8'));
          const structure = detectSvgStructure(root);
          expect(structure.found).toBe(true);
          const tolerance = computeSnapTolerance(diagonal);
          const graph = buildWayfindingGraph(flattenShapes(structure.walkwayShapes), { snapTolerance: tolerance });
          expect([graph.graph.nodes.length, graph.graph.edges.length]).toEqual(built);
          const joined = bridgeComponentGaps(graph.graph, { maxGapDistance: computeGapBridgeDistance(diagonal), snapTolerance: tolerance });
          expect([joined.graph.nodes.length, joined.graph.edges.length, joined.bridgeCount]).toEqual(bridged);
          const connected = autoConnectNodes(joined.graph, { maxDistance: computeAutoConnectDistance(diagonal), obstacles: buildObstacleIndex(flattenShapes(structure.obstacleShapes)) });
          expect([connected.addedEdgeCount, connected.rejectedByObstacle, connected.rejectedAsRedundant, connected.isolatedNodeIds.length]).toEqual(auto);
          // Idempotent: a second run adds nothing.
          const again = autoConnectNodes(connected.graph, { maxDistance: computeAutoConnectDistance(diagonal), obstacles: buildObstacleIndex(flattenShapes(structure.obstacleShapes)) });
          expect(again.addedEdgeCount).toBe(0);
        });
      }
    });
  });

  test.describe('graph editing (the POC’s operations)', () => {
    const a = node('a', 0, 0);
    const x = node('x', 100, 0, { source: 'inferred', review: 'pending', confidence: 0.6 });
    const b = node('b', 200, 0);
    const c = node('c', 100, 100);
    const star: GraphState = { nodes: [a, x, b, c], edges: [edge(a, x, [{ x: 50, y: 10 }]), edge(x, b), edge(x, c)] };

    test('drag a point: its paths follow, and touching it confirms it', () => {
      const moved = moveNode(star, 'x', { x: 110, y: 20 });
      expect(moved.nodes.find((n) => n.id === 'x')).toMatchObject({ x: 110, y: 20, review: 'confirmed' });
      expect(moved.edges.every((e) => (e.fromNodeId === 'x' ? e.pathPoints[0] : e.pathPoints[e.pathPoints.length - 1]).x === 110 || !(e.fromNodeId === 'x' || e.toNodeId === 'x'))).toBe(true);
      expect(moved.edges[0].pathPoints[1]).toEqual({ x: 50, y: 10 });
    });

    test('delete a point: its neighbours are re-joined as a chain along the old lines, one edge each', () => {
      const result = deleteNode(star, 'x');
      expect(result.nodes.map((n) => n.id)).toEqual(['a', 'b', 'c']);
      const pairs = result.edges.map((e) => `${e.fromNodeId}-${e.toNodeId}`);
      expect(pairs).toEqual(['a-b', 'b-c']);
      // The a–b rejoin follows a → (50,10) → x → b.
      expect(result.edges[0].pathPoints).toEqual([{ x: 0, y: 0 }, { x: 50, y: 10 }, { x: 100, y: 0 }, { x: 200, y: 0 }]);
    });

    test('add a point: it joins its nearest point, then Auto-Connect offers it its nearest neighbours (never through an obstacle)', () => {
      const { state, nodeId } = addNode(star, { x: 100, y: 60 });
      expect(state.edges.filter((e) => e.fromNodeId === nodeId)).toHaveLength(1);
      expect(state.edges.find((e) => e.fromNodeId === nodeId)!.toNodeId).toBe('c');
      const wall = buildObstacleIndex([[{ x: 60, y: 30 }, { x: 140, y: 30 }]]);
      const linked = connectNodeToNearest(state, nodeId, { obstacles: wall, maxDistance: 500 });
      expect(linked.graph.edges.filter((e) => e.kind === 'knn').every((e) => !wall.blocks(e.pathPoints[0], e.pathPoints[1]))).toBe(true);
      expect(linked.rejectedByObstacle).toBeGreaterThan(0);
    });

    test('drag a path: it splits where grabbed, a point appears where released, the rest of each half keeps its shape', () => {
      const bent = rerouteEdge(star, 'a|x', { x: 25, y: 5 }, { x: 30, y: 40 })!;
      expect(bent.nodes.find((n) => n.id === bent.nodeId)).toMatchObject({ x: 30, y: 40 });
      const halves = bent.edges.filter((e) => e.fromNodeId === bent.nodeId || e.toNodeId === bent.nodeId);
      expect(halves.map((e) => e.kind)).toEqual(['traced', 'traced']);
      expect(halves[0].pathPoints).toEqual([{ x: 0, y: 0 }, { x: 30, y: 40 }]);
      expect(halves[1].pathPoints).toEqual([{ x: 30, y: 40 }, { x: 50, y: 10 }, { x: 100, y: 0 }]);
      expect(bent.edges.some((e) => e.id === 'a|x')).toBe(false);
    });

    test('delete a path: only that connection goes', () => {
      const result = deleteEdge(star, 'x|b');
      expect(result.edges.map((e) => e.id)).toEqual(['a|x', 'x|c']);
      expect(result.nodes).toHaveLength(4);
    });

    test('confirm proposals above a confidence only — never all of them', () => {
      const graph: GraphState = { nodes: [node('p', 0, 0, { review: 'pending', confidence: 0.95 }), node('q', 1, 0, { review: 'pending', confidence: 0.5 }), node('r', 2, 0, { review: 'pending', confidence: null })], edges: [] };
      expect(confirmNodesAboveConfidence(graph, 0.9).nodes.map((n) => n.review)).toEqual(['confirmed', 'pending', 'pending']);
    });

    test('Auto-Connect: k nearest within range, redundant links skipped, an isolated point rescued, a second run adds nothing', () => {
      const p = [node('p0', 0, 0), node('p1', 100, 0), node('p2', 200, 0), node('lone', 100, 400)];
      const graph = { nodes: p, edges: [edge(p[0], p[1]), edge(p[1], p[2])] };
      const once = autoConnectNodes(graph, { maxDistance: 250 });
      // p0–p2 is already reachable along the line (200 ≤ 3 × 200); the lone point is rescued beyond the range.
      expect(once.rejectedAsRedundant).toBeGreaterThan(0);
      expect(once.added.some((e) => e.fromNodeId === 'lone' || e.toNodeId === 'lone')).toBe(true);
      expect(once.isolatedNodeIds).toEqual([]);
      expect(autoConnectNodes(once.graph, { maxDistance: 250 }).addedEdgeCount).toBe(0);
    });
  });

  test.describe('page state: edits stay local overrides and Ctrl/Cmd+Z restores them', () => {
    const level = { id: 'floorplate:1', kind: 'floorplate', recordId: 1, building: null, label: 'Floor 1', sub: 'Tower', floors: [1] } as unknown as MapLevel;
    const point = (key: string, x: number, y: number): WfPoint => ({ key, x, y, xPct: x / 10, yPct: y / 10, degree: 1, temporary: key.startsWith('j:'), moved: false, source: 'stored', review: 'confirmed', confidence: null });
    const path = (pa: WfPoint, pb: WfPoint, mid: { x: number; y: number }[] = []): WfPath => {
      const points = [{ x: pa.x, y: pa.y }, ...mid, { x: pb.x, y: pb.y }];
      return { key: [pa.key, pb.key].sort().join('|'), a: pa.key, b: pb.key, x1: 0, y1: 0, x2: 0, y2: 0, temporary: false, points, length: polylineLength(points), kind: 'stored' };
    };
    const h1 = point('h:1', 0, 0);
    const h2 = point('h:2', 100, 0);
    const h3 = point('h:3', 200, 0);
    const plate = { level, space: 'raster', points: [h1, h2, h3], paths: [path(h1, h2), path(h2, h3)] } as unknown as WfPlate;
    const base: LocalMapState = initialLocalMapState(level.id, null, 'raster');

    test('a stored point deleted by the POC is hidden on the page; the rejoin is a page path; nothing about the stored map changes', () => {
      const before = plateGraph(plate);
      const after = deleteNode(before, 'h:2');
      const { patch } = graphPatch(base, level, 'raster', before, after, (n) => `Point ${n}`);
      expect(patch.hiddenNodes).toEqual(['h:2']);
      expect(patch.hiddenEdges).toEqual(['h:1|h:2', 'h:2|h:3']);
      expect(patch.tempEdges).toEqual([{ a: 'h:1', b: 'h:3', points: [{ x: 100, y: 0 }], kind: 'stored' }]);
    });

    test('a bend adds a page point on the level’s layer with its two halves; the snapshot taken before it restores the graph', () => {
      const before = plateGraph(plate);
      const bent = rerouteEdge(before, 'h:1|h:2', { x: 50, y: 0 }, { x: 50, y: 40 })!;
      const snapshot = snapshotOf(base);
      const { patch, keyOf } = graphPatch(base, level, 'svg', before, bent, (n) => `Point ${n}`);
      const key = keyOf.get(bent.nodeId)!;
      expect(key).toBe('j:1');
      expect(patch.tempNodes).toEqual([{ key: 'j:1', levelId: level.id, x: 50, y: 40, label: 'Point 1', space: 'svg', source: 'manual', review: 'confirmed', confidence: null }]);
      expect(patch.hiddenEdges).toEqual(['h:1|h:2']);
      expect((patch.tempEdges ?? []).map((row) => `${row.a}>${row.b}`).sort()).toEqual(['h:1>j:1', 'j:1>h:2'].sort());
      expect(patch.nextJunction).toBe(2);
      // Undo puts every graph field back.
      const edited = { ...base, ...patch, wfUndo: [snapshot] };
      const undone = { ...edited, ...edited.wfUndo[0] };
      expect(snapshotOf(undone)).toEqual(snapshot);
    });
  });

  test.describe('Find Shortest Path (the POC’s router on the floor’s graph)', () => {
    const level = { id: 'floorplate:9', kind: 'floorplate', recordId: 9, building: 'A', label: 'Floor 1', sub: 'A', rangeLabel: 'Floor 1', floors: [1] } as unknown as MapLevel;
    const point = (key: string, x: number, y: number, review: 'pending' | 'confirmed' = 'confirmed'): WfPoint => ({ key, x, y, xPct: x / 10, yPct: y / 10, degree: 1, temporary: true, moved: false, source: 'inferred', review, confidence: 0.7 });
    const path = (pa: WfPoint, pb: WfPoint, mid: { x: number; y: number }[] = []): WfPath => {
      const points = [{ x: pa.x, y: pa.y }, ...mid, { x: pb.x, y: pb.y }];
      return { key: [pa.key, pb.key].sort().join('|'), a: pa.key, b: pb.key, x1: 0, y1: 0, x2: 0, y2: 0, temporary: true, points, length: polylineLength(points), kind: 'inferred' };
    };
    const anchor = (key: string, x: number, y: number, attached: string): WfAnchor => ({ key, kind: 'unit', type: null, label: key, meta: 'Unit', floors: null, x, y, offLayer: false, attached, linked: true, explicit: true, door: null, polygon: null });
    const plateOf = (points: WfPoint[], paths: WfPath[], anchors: WfAnchor[]) =>
      ({ level, dims: { w: 1000, h: 500 }, space: 'svg', hasPlan: true, points, paths, stops: [], anchors, blockers: [] }) as unknown as WfPlate;
    const route = (plate: WfPlate) => {
      const input: WfRouteInput = { levels: [level], plates: { [level.id]: plate }, current: level, floor: null, scope: 'plate', stepFree: false };
      const groups = routeGroups(input);
      return computeWayfindingRoute(input, groups, `${level.id}@|from`, `${level.id}@|to`);
    };

    test('the route follows the drawn polylines and weighs them by their length, not the straight line', () => {
      const s = point('j:1', 0, 0);
      const t = point('j:2', 400, 0);
      // A drawn detour (long) and a two-hop straight path (short) between the same ends.
      const m = point('j:3', 200, 10);
      const plate = plateOf([s, t, m], [path(s, t, [{ x: 200, y: 300 }]), path(s, m), path(m, t)], [anchor('from', 0, 20, 'j:1'), anchor('to', 400, 20, 'j:2')]);
      const result = route(plate);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.legs[0].pointKeys).toEqual(['j:1', 'j:3', 'j:2']);
      expect(result.unit).toBe('SVG units');
      // Now only the curved path: its interior vertex is walked and the length is the polyline's.
      const curved = route(plateOf([s, t], [path(s, t, [{ x: 200, y: 300 }])], [anchor('from', 0, 20, 'j:1'), anchor('to', 400, 20, 'j:2')]));
      expect(curved.ok && curved.legs[0].points.some((p) => p.x === 200 && p.y === 300)).toBe(true);
      expect(curved.ok && curved.px).toBe(Math.round(20 + 2 * Math.hypot(200, 300) + 20));
    });

    test('two pieces a small gap apart route with a warning naming the gap; a wide gap does not route', () => {
      const p = [point('j:1', 0, 0), point('j:2', 100, 0), point('j:3', 120, 0), point('j:4', 220, 0)];
      const near = route(plateOf(p, [path(p[0], p[1]), path(p[2], p[3])], [anchor('from', 0, 10, 'j:1'), anchor('to', 220, 10, 'j:4')]));
      expect(near.ok).toBe(true);
      if (near.ok) expect(near.warnings.join(' ')).toContain('20-unit gap');
      const far = [point('j:1', 0, 0), point('j:2', 100, 0), point('j:3', 400, 0), point('j:4', 500, 0)];
      const apart = route(plateOf(far, [path(far[0], far[1]), path(far[2], far[3])], [anchor('from', 0, 10, 'j:1'), anchor('to', 500, 10, 'j:4')]));
      expect(apart.ok).toBe(false);
      if (!apart.ok) expect(apart.error).toBe('No path connects these places. Add or connect points to close the gap.');
    });

    test('a route over inferred points not reviewed yet says so', () => {
      const p = [point('j:1', 0, 0, 'pending'), point('j:2', 100, 0, 'pending')];
      const result = route(plateOf(p, [path(p[0], p[1])], [anchor('from', 0, 10, 'j:1'), anchor('to', 100, 10, 'j:2')]));
      expect(result.ok && result.warnings).toEqual(['This route uses 2 inferred point(s) not reviewed yet.']);
    });

    test('invalid ends: the same place twice, or one not on the plan', () => {
      const p = [point('j:1', 0, 0), point('j:2', 100, 0)];
      const plate = plateOf(p, [path(p[0], p[1])], [anchor('from', 0, 10, 'j:1'), { ...anchor('to', 0, 0, 'j:2'), x: null, y: null, offLayer: true, linked: false }]);
      const input: WfRouteInput = { levels: [level], plates: { [level.id]: plate }, current: level, floor: null, scope: 'plate', stepFree: false };
      const groups = routeGroups(input);
      const same = computeWayfindingRoute(input, groups, `${level.id}@|from`, `${level.id}@|from`);
      expect(!same.ok && same.error).toBe('Pick two different places for the start and destination.');
      const off = computeWayfindingRoute(input, groups, `${level.id}@|from`, `${level.id}@|to`);
      expect(!off.ok && off.error).toContain('plotted on the floor image only');
    });
  });
});
