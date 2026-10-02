import type { Matrix2D, Point } from '../types';
import { IDENTITY, applyToPoint } from './matrix';

/**
 * Phase 2 of the POC (`svg/parsePathData.ts`): one `d` string → flattened
 * subpaths in root units. The POC normalises the command set with
 * `svg-pathdata` (`toAbs().normalizeHVZ().normalizeST().qtToC().aToC()`)
 * and samples curves by arc length with `svg-path-properties`; this module
 * does the same two jobs itself:
 *
 *   - every command (M L H V C S Q T A Z, absolute or relative, implicit
 *     repeats, compact arc flags) is reduced to absolute M / L / C / Z;
 *   - the transform goes onto the control points *before* flattening (an
 *     affine map of a cubic's control points is exactly the mapped cubic),
 *     so the step means root units however a group was scaled;
 *   - a cubic is sampled every `flattenStep` units of arc length, ending
 *     exactly on its end point; Z appends the subpath's start.
 *
 * Consecutive duplicates are removed, subpaths under two points dropped, and
 * a malformed `d` yields what parsed before the error rather than throwing.
 */

export type Subpath = Point[];

export const DEFAULT_FLATTEN_STEP = 8;

export type PathCommand = { type: 'M'; x: number; y: number } | { type: 'L'; x: number; y: number } | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number } | { type: 'Z' };

const COMMAND = /[MmLlHhVvCcSsQqTtAaZz]/;

class Scanner {
  private i = 0;
  constructor(private readonly s: string) {}

  private skip(): void {
    while (this.i < this.s.length && /[\s,]/.test(this.s[this.i])) this.i += 1;
  }

  done(): boolean {
    this.skip();
    return this.i >= this.s.length;
  }

  peekCommand(): string | null {
    this.skip();
    const c = this.s[this.i];
    return c && COMMAND.test(c) ? c : null;
  }

  command(): string | null {
    const c = this.peekCommand();
    if (c) this.i += 1;
    return c;
  }

  hasNumber(): boolean {
    this.skip();
    return this.i < this.s.length && /[-+.\d]/.test(this.s[this.i]);
  }

  number(): number {
    this.skip();
    const match = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(this.s.slice(this.i, this.i + 64));
    if (!match) throw new Error('bad number');
    this.i += match[0].length;
    return Number(match[0]);
  }

  /** An arc flag is one character, so `a1 1 0 001 1 1` reads as flags 0, 0 and 1. */
  flag(): number {
    this.skip();
    const c = this.s[this.i];
    if (c !== '0' && c !== '1') throw new Error('bad flag');
    this.i += 1;
    return c === '1' ? 1 : 0;
  }
}

/** Absolute M / L / C / Z for a `d` string. */
export const normalizePath = (d: string): PathCommand[] => {
  const out: PathCommand[] = [];
  const scan = new Scanner(d);
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  // The previous segment's second cubic control (S) or quadratic control (T), for reflection.
  let lastCubic: Point | null = null;
  let lastQuad: Point | null = null;
  let command: string | null = null;

  const cubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    out.push({ type: 'C', x1, y1, x2, y2, x, y });
    cx = x;
    cy = y;
  };
  const quad = (qx: number, qy: number, x: number, y: number) => {
    cubic(cx + (2 / 3) * (qx - cx), cy + (2 / 3) * (qy - cy), x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), x, y);
  };

  try {
    while (!scan.done()) {
      const next = scan.command();
      if (next) command = next;
      else if (!command || command === 'Z' || command === 'z') throw new Error('data before command');
      else if (command === 'M') command = 'L';
      else if (command === 'm') command = 'l';
      const rel = command === command.toLowerCase();
      const upper = command.toUpperCase();
      const ox = rel ? cx : 0;
      const oy = rel ? cy : 0;
      let cubicCtrl: Point | null = null;
      let quadCtrl: Point | null = null;
      switch (upper) {
        case 'M': {
          const x = ox + scan.number();
          const y = oy + scan.number();
          out.push({ type: 'M', x, y });
          cx = sx = x;
          cy = sy = y;
          break;
        }
        case 'L': {
          const x = ox + scan.number();
          const y = oy + scan.number();
          out.push({ type: 'L', x, y });
          cx = x;
          cy = y;
          break;
        }
        case 'H': {
          const x = ox + scan.number();
          out.push({ type: 'L', x, y: cy });
          cx = x;
          break;
        }
        case 'V': {
          const y = oy + scan.number();
          out.push({ type: 'L', x: cx, y });
          cy = y;
          break;
        }
        case 'C': {
          const x1 = ox + scan.number();
          const y1 = oy + scan.number();
          const x2 = ox + scan.number();
          const y2 = oy + scan.number();
          const x = ox + scan.number();
          const y = oy + scan.number();
          cubic(x1, y1, x2, y2, x, y);
          cubicCtrl = { x: x2, y: y2 };
          break;
        }
        case 'S': {
          const x2 = ox + scan.number();
          const y2 = oy + scan.number();
          const x = ox + scan.number();
          const y = oy + scan.number();
          const x1: number = lastCubic ? 2 * cx - lastCubic.x : cx;
          const y1: number = lastCubic ? 2 * cy - lastCubic.y : cy;
          cubic(x1, y1, x2, y2, x, y);
          cubicCtrl = { x: x2, y: y2 };
          break;
        }
        case 'Q': {
          const qx = ox + scan.number();
          const qy = oy + scan.number();
          const x = ox + scan.number();
          const y = oy + scan.number();
          quad(qx, qy, x, y);
          quadCtrl = { x: qx, y: qy };
          break;
        }
        case 'T': {
          const x = ox + scan.number();
          const y = oy + scan.number();
          const qx: number = lastQuad ? 2 * cx - lastQuad.x : cx;
          const qy: number = lastQuad ? 2 * cy - lastQuad.y : cy;
          quad(qx, qy, x, y);
          quadCtrl = { x: qx, y: qy };
          break;
        }
        case 'A': {
          const rx = Math.abs(scan.number());
          const ry = Math.abs(scan.number());
          const rotation = scan.number();
          const large = scan.flag();
          const sweep = scan.flag();
          const x = ox + scan.number();
          const y = oy + scan.number();
          arcToCubics(cx, cy, rx, ry, rotation, large, sweep, x, y).forEach((c) => out.push(c));
          cx = x;
          cy = y;
          break;
        }
        case 'Z':
          out.push({ type: 'Z' });
          cx = sx;
          cy = sy;
          break;
        default:
          throw new Error('unknown command');
      }
      lastCubic = cubicCtrl;
      lastQuad = quadCtrl;
      // A command letter followed by no numbers (other than Z) is malformed.
      if (upper !== 'Z' && !scan.hasNumber() && !scan.peekCommand() && !scan.done()) throw new Error('trailing junk');
    }
  } catch {
    // Keep what parsed: a malformed tail must not cost the whole layer.
  }
  return out;
};

/** SVG's endpoint → centre arc conversion (SVG 1.1 F.6.5), split into ≤ 90° cubics. */
const arcToCubics = (x1: number, y1: number, rxIn: number, ryIn: number, angle: number, large: number, sweep: number, x2: number, y2: number): PathCommand[] => {
  if (x1 === x2 && y1 === y2) return [];
  if (!rxIn || !ryIn) return [{ type: 'L', x: x2, y: y2 }];
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy;
  const y1p = -sin * dx + cos * dy;
  let rx = rxIn;
  let ry = ryIn;
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let coef = den ? Math.sqrt(Math.max(0, num / den)) : 0;
  if (large === sweep) coef = -coef;
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const ccx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const ccy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const angleOf = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const theta1 = angleOf(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let delta = angleOf((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;
  const segments = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9));
  const step = delta / segments;
  const k = (4 / 3) * Math.tan(step / 4);
  const point = (t: number) => ({ x: Math.cos(t), y: Math.sin(t) });
  const map = (ux: number, uy: number) => ({ x: ccx + rx * ux * cos - ry * uy * sin, y: ccy + rx * ux * sin + ry * uy * cos });
  const out: PathCommand[] = [];
  let t = theta1;
  for (let i = 0; i < segments; i += 1) {
    const a = point(t);
    const b = point(t + step);
    const c1 = map(a.x - k * a.y, a.y + k * a.x);
    const c2 = map(b.x + k * b.y, b.y - k * b.x);
    const end = i === segments - 1 ? { x: x2, y: y2 } : map(b.x, b.y);
    out.push({ type: 'C', x1: c1.x, y1: c1.y, x2: c2.x, y2: c2.y, x: end.x, y: end.y });
    t += step;
  }
  return out;
};

const cubicAt = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
};

/** The points after `start` along a cubic, every `step` of arc length, ending exactly on `end`. */
export const flattenCubic = (start: Point, c1: Point, c2: Point, end: Point, step: number): Point[] => {
  const hull = Math.hypot(c1.x - start.x, c1.y - start.y) + Math.hypot(c2.x - c1.x, c2.y - c1.y) + Math.hypot(end.x - c2.x, end.y - c2.y);
  if (!Number.isFinite(hull) || hull <= 0) return [end];
  const samples = Math.max(16, Math.min(4096, Math.ceil((hull / Math.max(step, 1e-6)) * 8)));
  const lengths = new Float64Array(samples + 1);
  let previous = start;
  for (let i = 1; i <= samples; i += 1) {
    const p = cubicAt(start, c1, c2, end, i / samples);
    lengths[i] = lengths[i - 1] + Math.hypot(p.x - previous.x, p.y - previous.y);
    previous = p;
  }
  const total = lengths[samples];
  if (!Number.isFinite(total) || total <= 0) return [end];
  const steps = Math.max(1, Math.ceil(total / step));
  const out: Point[] = [];
  let index = 1;
  for (let i = 1; i < steps; i += 1) {
    const target = (total * i) / steps;
    while (index < samples && lengths[index] < target) index += 1;
    const span = lengths[index] - lengths[index - 1];
    const f = span > 0 ? (target - lengths[index - 1]) / span : 0;
    out.push(cubicAt(start, c1, c2, end, (index - 1 + f) / samples));
  }
  out.push(end);
  return out;
};

const COINCIDENT_EPS = 1e-9;

const dedupe = (points: Subpath): Subpath => {
  const out: Subpath = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.hypot(p.x - last.x, p.y - last.y) <= COINCIDENT_EPS) continue;
    out.push(p);
  }
  return out;
};

export interface ParsePathOptions {
  flattenStep?: number;
  matrix?: Matrix2D;
}

/** A `d` string as flattened root-space subpaths; `closed[i]` says whether subpath i ended in Z. */
export const parsePathToSubpaths = (d: string, options: ParsePathOptions = {}): { subpaths: Subpath[]; closed: boolean[] } => {
  const step = options.flattenStep ?? DEFAULT_FLATTEN_STEP;
  const matrix = options.matrix ?? IDENTITY;
  const subpaths: Subpath[] = [];
  const closed: boolean[] = [];
  let current = -1;
  let cursor: Point | null = null;
  let start: Point | null = null;
  const begin = (p: Point) => {
    subpaths.push([p]);
    closed.push(false);
    current = subpaths.length - 1;
    cursor = p;
    start = p;
  };
  for (const cmd of normalizePath(d)) {
    if (cmd.type === 'M') {
      begin(applyToPoint(matrix, cmd));
    } else if (cmd.type === 'L') {
      const p = applyToPoint(matrix, cmd);
      if (current < 0) begin(p);
      else {
        subpaths[current].push(p);
        cursor = p;
      }
    } else if (cmd.type === 'C') {
      const end = applyToPoint(matrix, cmd);
      if (current < 0 || !cursor) {
        begin(end);
        continue;
      }
      const c1 = applyToPoint(matrix, { x: cmd.x1, y: cmd.y1 });
      const c2 = applyToPoint(matrix, { x: cmd.x2, y: cmd.y2 });
      for (const p of flattenCubic(cursor, c1, c2, end, step)) subpaths[current].push(p);
      cursor = end;
    } else if (current >= 0 && start) {
      subpaths[current].push(start);
      closed[current] = true;
      cursor = start;
    }
  }
  const keep = subpaths.map((sp) => dedupe(sp));
  const outPaths: Subpath[] = [];
  const outClosed: boolean[] = [];
  keep.forEach((sp, i) => {
    if (sp.length < 2) return;
    outPaths.push(sp);
    outClosed.push(closed[i]);
  });
  return { subpaths: outPaths, closed: outClosed };
};
