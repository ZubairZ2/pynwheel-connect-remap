import type { AffineTransform, MapLevel } from '~/models';

/**
 * How a level's plan is placed under the graph.
 *
 * Every graph coordinate is in the level's **frame**: the floor image's
 * natural pixels when the level has one (`width`/`height`), else the floor
 * SVG's own viewBox (an SVG-only plate is plotted in viewBox units: the CMS
 * measures such a level by its SVG). The floor SVG is drawn into that frame
 * the way the CMS's Map & Plotting canvas draws it — stretched to fill it
 * (`preserveAspectRatio="none"`) — unless a calibrated
 * `svg_to_image_transform` is stored, in which case that affine map is the
 * canonical mapping (`Wayfinding::PlateTransform`). No property-specific
 * offsets anywhere.
 */

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Frame {
  width: number;
  height: number;
  /** Where the frame came from, for the error states and tests. */
  source: 'image' | 'viewBox' | 'natural-image' | 'none';
}

export interface SvgPlacement {
  /** Attributes of the `<image>` that draws the SVG document in frame units. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** `matrix(a b c d e f)` when a calibrated transform is stored; the image is then drawn in viewBox units and mapped by it. */
  transform: string | null;
  /** `none` stretches the document to the frame (the CMS's rule); `xMinYMin meet` keeps the viewBox when the frame *is* the viewBox. */
  preserveAspectRatio: 'none' | 'xMinYMin meet';
}

/** The root `<svg>` viewBox of an SVG document, else the box its width/height imply, else null. */
export const parseSvgViewBox = (text: string): ViewBox | null => {
  const open = /<svg\b[^>]*>/i.exec(text);
  if (!open) return null;
  const tag = open[0];
  const vb = /\sviewBox\s*=\s*["']([^"']+)["']/i.exec(tag);
  if (vb) {
    const parts = vb[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n)) && parts[2] > 0 && parts[3] > 0) return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
  }
  const w = parseFloat(/\swidth\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? '');
  const h = parseFloat(/\sheight\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] ?? '');
  return Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 ? { x: 0, y: 0, w, h } : null;
};

/** Whether a document is an SVG at all (the first element is `<svg>`); a stored PNG or an HTML error page is not. */
export const looksLikeSvg = (text: string): boolean => {
  const head = text.slice(0, 4096);
  const firstTag = /<(?!\?|!)([a-zA-Z][\w:-]*)/.exec(head);
  return !!firstTag && firstTag[1].toLowerCase().replace(/^.*:/, '') === 'svg';
};

/** The level's frame: image pixels, else the SVG viewBox, else the image's measured natural size. */
export const frameOf = (level: Pick<MapLevel, 'width' | 'height'>, viewBox: ViewBox | null, natural: { width: number; height: number } | null): Frame => {
  if (level.width > 0 && level.height > 0) return { width: level.width, height: level.height, source: 'image' };
  if (viewBox) return { width: viewBox.w, height: viewBox.h, source: 'viewBox' };
  if (natural && natural.width > 0 && natural.height > 0) return { width: natural.width, height: natural.height, source: 'natural-image' };
  return { width: 0, height: 0, source: 'none' };
};

export const isAffine = (t: AffineTransform | null | undefined): t is AffineTransform => {
  if (!t) return false;
  const record = t as unknown as Record<string, unknown>;
  return ['a', 'b', 'c', 'd', 'e', 'f'].every((k) => typeof record[k] === 'number' && Number.isFinite(record[k] as number));
};

/** Where the SVG document is drawn so that its content lands in the frame. */
export const svgPlacement = (frame: Frame, viewBox: ViewBox, transform: AffineTransform | null | undefined): SvgPlacement => {
  if (isAffine(transform)) {
    // Draw the document in its own viewBox units; the calibrated matrix maps those to frame pixels.
    return { x: viewBox.x, y: viewBox.y, width: viewBox.w, height: viewBox.h, transform: `matrix(${transform.a} ${transform.b} ${transform.c} ${transform.d} ${transform.e} ${transform.f})`, preserveAspectRatio: 'none' };
  }
  if (frame.source === 'viewBox') {
    // The frame *is* the viewBox: the document fills it 1:1 (the browser maps viewBox → 0,0,w,h).
    return { x: 0, y: 0, width: frame.width, height: frame.height, transform: null, preserveAspectRatio: 'none' };
  }
  // The CMS canvas rule: the plan fills the level's rectangle whatever the aspect ratios.
  return { x: 0, y: 0, width: frame.width, height: frame.height, transform: null, preserveAspectRatio: 'none' };
};

/** The non-accelerated twin of an S3 Transfer Acceleration URL, for a second try when the accelerated host is unreachable. */
export const plainS3Url = (url: string): string | null => {
  const m = /^(https?:\/\/)([^/]+)\.s3-accelerate\.amazonaws\.com(\/.*)$/.exec(url);
  return m ? `${m[1]}${m[2]}.s3.amazonaws.com${m[3]}` : null;
};
