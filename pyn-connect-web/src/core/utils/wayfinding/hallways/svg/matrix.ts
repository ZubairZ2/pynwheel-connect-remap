import type { Matrix2D, Point } from '../types';
import type { SvgEl } from './svgTree';

/**
 * The POC's `svg/matrix.ts`: SVG transforms composed by hand rather than
 * through `getCTM()`, which only works on a mounted, rendered document.
 * `matrix`, `translate`, `scale`, `rotate(a)`, `rotate(a cx cy)`, `skewX`,
 * `skewY`; unknown functions are ignored rather than guessed.
 */

export const IDENTITY: Matrix2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** `m1 * m2`: applying it is applying m2, then m1. */
export const multiply = (m1: Matrix2D, m2: Matrix2D): Matrix2D => ({
  a: m1.a * m2.a + m1.c * m2.b,
  b: m1.b * m2.a + m1.d * m2.b,
  c: m1.a * m2.c + m1.c * m2.d,
  d: m1.b * m2.c + m1.d * m2.d,
  e: m1.a * m2.e + m1.c * m2.f + m1.e,
  f: m1.b * m2.e + m1.d * m2.f + m1.f
});

export const applyToPoint = (m: Matrix2D, p: Point): Point => ({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });

const TRANSFORM_FN = /([a-zA-Z]+)\s*\(([^)]*)\)/g;

const numbers = (raw: string): number[] =>
  raw
    .trim()
    .split(/[\s,]+/)
    .filter((s) => s.length > 0)
    .map(Number)
    .filter((n) => Number.isFinite(n));

const rotation = (deg: number): Matrix2D => {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
};

/** One `transform` attribute as a matrix; functions apply left to right (the leftmost is outermost). */
export const parseTransform = (value: string | null | undefined): Matrix2D => {
  if (!value) return IDENTITY;
  let result = IDENTITY;
  TRANSFORM_FN.lastIndex = 0;
  for (let match = TRANSFORM_FN.exec(value); match !== null; match = TRANSFORM_FN.exec(value)) {
    const name = match[1].toLowerCase();
    const args = numbers(match[2]);
    let next: Matrix2D | null = null;
    switch (name) {
      case 'matrix':
        if (args.length >= 6) next = { a: args[0], b: args[1], c: args[2], d: args[3], e: args[4], f: args[5] };
        break;
      case 'translate':
        if (args.length >= 1) next = { ...IDENTITY, e: args[0], f: args[1] ?? 0 };
        break;
      case 'scale':
        if (args.length >= 1) next = { ...IDENTITY, a: args[0], d: args[1] ?? args[0] };
        break;
      case 'rotate':
        if (args.length >= 3) {
          const [angle, cx, cy] = args;
          next = multiply(multiply({ ...IDENTITY, e: cx, f: cy }, rotation(angle)), { ...IDENTITY, e: -cx, f: -cy });
        } else if (args.length >= 1) next = rotation(args[0]);
        break;
      case 'skewx':
        if (args.length >= 1) next = { ...IDENTITY, c: Math.tan((args[0] * Math.PI) / 180) };
        break;
      case 'skewy':
        if (args.length >= 1) next = { ...IDENTITY, b: Math.tan((args[0] * Math.PI) / 180) };
        break;
      default:
        break;
    }
    if (next) result = multiply(result, next);
  }
  return result;
};

/** Local → root for an element: every ancestor's transform, outermost first, the element's own last. */
export const accumulatedMatrix = (el: SvgEl, root: SvgEl): Matrix2D => {
  const chain: SvgEl[] = [];
  let current: SvgEl | null = el;
  while (current) {
    chain.push(current);
    if (current === root) break;
    current = current.parent;
  }
  let matrix = IDENTITY;
  for (let i = chain.length - 1; i >= 0; i -= 1) matrix = multiply(matrix, parseTransform(chain[i].attrs.transform));
  return matrix;
};
