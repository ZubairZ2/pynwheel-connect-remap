import { edgeKey, nodeKey, type LocalMapState, type PlanSpace, type TempEdge, type TempNode, type WfSnapshot } from '~/core/utils/generator/map/mapState';
import type { MapLevel } from '~/core/utils/generator/map/mapLevels.generator';
import type { GraphState, HallwayNode } from './hallways/editing';
import type { DetectedHallways } from './hallways/extract';
import type { WayfindingEdge } from './hallways/types';
import type { WfPlate } from './wayfindingGraph';

/**
 * Between the hallway engine and the page. The engine edits a whole graph
 * (`{ nodes, edges }`, POC style); the page keeps the stored map untouched
 * and records its changes as overrides — stored points / paths hidden or
 * moved, page points (`j:`) and page paths added. These two functions turn
 * a floorplate into the engine's graph and an edited graph back into those
 * overrides, so every POC operation runs unchanged and nothing is sent.
 */

/** The floorplate's points and paths as the engine's graph. */
export const plateGraph = (plate: WfPlate): GraphState => ({
  nodes: plate.points.map((point) => ({ id: point.key, x: point.x, y: point.y, source: point.source, review: point.review, confidence: point.confidence })),
  edges: plate.paths.map((path) => ({ id: path.key, fromNodeId: path.a, toNodeId: path.b, pathPoints: path.points, length: path.length, kind: path.kind }))
});

export const snapshotOf = (state: LocalMapState): WfSnapshot => ({
  nodeOverrides: state.nodeOverrides,
  tempNodes: state.tempNodes,
  tempEdges: state.tempEdges,
  hiddenNodes: state.hiddenNodes,
  hiddenEdges: state.hiddenEdges,
  wfLinks: state.wfLinks,
  wfEdited: state.wfEdited,
  wfSvg: state.wfSvg,
  nextJunction: state.nextJunction
});

const isStored = (key: string) => key.startsWith('h:');
const isPage = (key: string) => key.startsWith('j:');

/** The interior of a polyline from `from`'s end to the other (a page path stores its ends as its points). */
const interior = (edge: WayfindingEdge, from: string): { x: number; y: number }[] => {
  const inner = edge.pathPoints.slice(1, -1).map((p) => ({ x: p.x, y: p.y }));
  return edge.fromNodeId === from ? inner : inner.reverse();
};

const samePoints = (a: { x: number; y: number }[] = [], b: { x: number; y: number }[] = []) =>
  a.length === b.length && a.every((p, i) => Math.abs(p.x - b[i].x) < 1e-6 && Math.abs(p.y - b[i].y) < 1e-6);

export interface GraphPatch {
  patch: Partial<LocalMapState>;
  /** The engine's ids of new nodes → their keys on the page. */
  keyOf: Map<string, string>;
}

/**
 * The overrides that turn `before` (the floorplate as it is) into `after`
 * on `level`, from the current state. New nodes become page points on the
 * level's Wayfinding layer.
 */
export const graphPatch = (
  current: LocalMapState,
  level: MapLevel,
  space: PlanSpace,
  before: GraphState,
  after: GraphState,
  labelFor: (n: number) => string
): GraphPatch => {
  const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
  const afterNodes = new Map(after.nodes.map((node) => [node.id, node]));
  const keyOf = new Map<string, string>();
  let next = current.nextJunction;
  let tempNodes: TempNode[] = current.tempNodes;
  let hiddenNodes = current.hiddenNodes;
  let nodeOverrides = current.nodeOverrides;

  // Removed points.
  const removed = before.nodes.filter((node) => !afterNodes.has(node.id)).map((node) => node.id);
  if (removed.length) {
    const gone = new Set(removed);
    tempNodes = tempNodes.filter((node) => !gone.has(node.key));
    const stored = removed.filter(isStored).filter((key) => !hiddenNodes.includes(key));
    if (stored.length) hiddenNodes = [...hiddenNodes, ...stored];
  }

  // Moved or reviewed points.
  after.nodes.forEach((node) => {
    const was = beforeNodes.get(node.id);
    if (!was) return;
    const moved = Math.abs(was.x - node.x) > 1e-9 || Math.abs(was.y - node.y) > 1e-9;
    if (isStored(node.id) && moved) nodeOverrides = { ...nodeOverrides, [node.id]: { x: node.x, y: node.y } };
    if (isPage(node.id) && (moved || was.review !== node.review)) {
      tempNodes = tempNodes.map((row) => (row.key === node.id ? { ...row, x: node.x, y: node.y, review: node.review } : row));
    }
  });

  // New points.
  const added: TempNode[] = [];
  after.nodes.forEach((node: HallwayNode) => {
    if (beforeNodes.has(node.id)) return;
    const key = nodeKey('junction', next);
    keyOf.set(node.id, key);
    added.push({ key, levelId: level.id, x: node.x, y: node.y, label: labelFor(next), space, source: node.source, review: node.review, confidence: node.confidence });
    next += 1;
  });
  if (added.length) tempNodes = [...tempNodes, ...added];
  const key = (id: string) => keyOf.get(id) ?? id;

  // Paths.
  const beforeEdges = new Map(before.edges.map((edge) => [edgeKey(edge.fromNodeId, edge.toNodeId), edge]));
  const afterEdges = new Map(after.edges.map((edge) => [edgeKey(key(edge.fromNodeId), key(edge.toNodeId)), edge]));
  let tempEdges: TempEdge[] = current.tempEdges;
  let hiddenEdges = current.hiddenEdges;
  const pageEdge = (k: string) => tempEdges.some((edge) => edgeKey(edge.a, edge.b) === k);
  beforeEdges.forEach((_edge, k) => {
    if (afterEdges.has(k)) return;
    if (pageEdge(k)) tempEdges = tempEdges.filter((edge) => edgeKey(edge.a, edge.b) !== k);
    else if (!hiddenEdges.includes(k)) hiddenEdges = [...hiddenEdges, k];
  });
  afterEdges.forEach((edge, k) => {
    const a = key(edge.fromNodeId);
    const b = key(edge.toNodeId);
    const points = interior(edge, edge.fromNodeId);
    const was = beforeEdges.get(k);
    if (was) {
      // Same pair: a page path takes the new geometry (a stored one is straight and stays as stored).
      if (pageEdge(k)) {
        tempEdges = tempEdges.map((row) => {
          if (edgeKey(row.a, row.b) !== k) return row;
          const oriented = row.a === a ? points : points.slice().reverse();
          return samePoints(row.points, oriented) ? row : { ...row, points: oriented };
        });
      }
      return;
    }
    if (hiddenEdges.includes(k) && !points.length && edge.kind === 'stored') {
      hiddenEdges = hiddenEdges.filter((row) => row !== k);
      return;
    }
    tempEdges = [...tempEdges.filter((row) => edgeKey(row.a, row.b) !== k), { a, b, points, kind: edge.kind ?? 'manual' }];
  });

  return { patch: { tempNodes, tempEdges, hiddenNodes, hiddenEdges, nodeOverrides, nextJunction: next }, keyOf };
};

/**
 * Detect Hallways' result for one floorplate as overrides: whatever the
 * floorplate showed is hidden (stored) or dropped (page), the detected
 * graph is added as page points and paths on the floor SVG, each stop the
 * engine joined is linked to its point, and the level's Wayfinding moves to
 * the SVG.
 */
export const detectionPatch = (current: LocalMapState, level: MapLevel, plate: WfPlate, result: DetectedHallways, labelFor: (n: number) => string): Partial<LocalMapState> => {
  const old = plateGraph(plate);
  const cleared = graphPatch(current, level, 'svg', old, { nodes: [], edges: [] }, labelFor);
  const base = { ...current, ...cleared.patch };
  const built = graphPatch(base, level, 'svg', { nodes: [], edges: [] }, { nodes: result.nodes, edges: result.edges }, labelFor);
  const links = Object.fromEntries(Object.entries(current.wfLinks).filter(([k]) => !k.startsWith(`${level.id}|`)));
  result.connections.forEach((connection) => {
    if (!connection.connectedNodeId) return;
    const point = built.keyOf.get(connection.connectedNodeId);
    if (point) links[`${level.id}|${connection.groupId}`] = point;
  });
  return {
    ...built.patch,
    wfLinks: links,
    wfSvg: { ...current.wfSvg, [level.id]: true },
    wfEdited: { ...current.wfEdited, [level.id]: 'detected' }
  };
};
