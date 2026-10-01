import type { WfAnchor } from './wayfindingGraph';

/**
 * Detect Paths, in the browser, from the floor's own geometry. The CMS has
 * no hallway detection (its hallways are drawn by hand on the Auto
 * Wayfinding page) and the floor image carries no corridor data, so the
 * proposal is built from what every floor does have in the image's frame:
 * where its doors, units, amenities and stops are plotted.
 *
 * As the design's detection does for its plan, one corridor spine runs
 * along the floor's long axis with a point opposite every stop, and each
 * stop then joins the spine at its own point (the CMS's nearest-point
 * rule). The spine sits in the widest gap between the stops across that
 * axis — the corridor of a double-loaded floor, where doors face each other
 * — or, when the stops make one row, on the row itself (doors sit on the
 * corridor). The result is only a proposal on this page, to review and
 * edit; nothing is saved.
 */

export interface DetectedPaths {
  points: { x: number; y: number }[];
  /** Index pairs into `points`. */
  paths: [number, number][];
}

/** The positions a detection works from: every anchor with a place on the floor image, once. */
export const detectionSites = (anchors: WfAnchor[]): { x: number; y: number }[] => {
  const seen = new Set<string>();
  const out: { x: number; y: number }[] = [];
  anchors.forEach((anchor) => {
    if (anchor.x == null || anchor.y == null) return;
    const key = `${Math.round(anchor.x)},${Math.round(anchor.y)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ x: anchor.x, y: anchor.y });
  });
  return out;
};

/** The corridor's position across the spine: the middle of the widest gap between rows of stops, else the row's median. */
const corridorAt = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const spread = sorted[sorted.length - 1] - sorted[0];
  let gap = 0;
  let at = sorted[Math.floor(sorted.length / 2)];
  for (let i = 1; i < sorted.length; i += 1) {
    const width = sorted[i] - sorted[i - 1];
    if (width > gap) {
      gap = width;
      at = (sorted[i] + sorted[i - 1]) / 2;
    }
  }
  return spread > 0 && gap >= spread * 0.25 ? at : sorted[Math.floor(sorted.length / 2)];
};

/**
 * The detected spine for one floor. Null when fewer than two stops are
 * plotted on the floor image (nothing to join). `dims` bounds the spine to
 * the image and sets how close two spine points may be (1% of its size).
 */
export const detectPaths = (sites: { x: number; y: number }[], dims: { w: number; h: number }): DetectedPaths | null => {
  if (sites.length < 2) return null;
  const xs = sites.map((site) => site.x);
  const ys = sites.map((site) => site.y);
  const spreadX = Math.max(...xs) - Math.min(...xs);
  const spreadY = Math.max(...ys) - Math.min(...ys);
  const horizontal = spreadX >= spreadY;
  const along = horizontal ? xs : ys;
  const across = corridorAt(horizontal ? ys : xs);
  const limit = horizontal ? dims.w : dims.h;
  const step = Math.max(4, Math.max(dims.w, dims.h) * 0.01);
  const pad = Math.max(step, (Math.max(...along) - Math.min(...along)) * 0.03);

  const positions = [Math.max(0, Math.min(...along) - pad), ...along, Math.min(limit, Math.max(...along) + pad)].sort((a, b) => a - b);
  const spine: number[] = [];
  positions.forEach((value) => {
    if (!spine.length || value - spine[spine.length - 1] >= step) spine.push(value);
  });
  const clampAcross = Math.max(0, Math.min(horizontal ? dims.h : dims.w, across));
  const points = spine.map((value) => (horizontal ? { x: Math.round(value), y: Math.round(clampAcross) } : { x: Math.round(clampAcross), y: Math.round(value) }));
  const paths: [number, number][] = points.slice(1).map((_point, index) => [index, index + 1]);
  return { points, paths };
};
