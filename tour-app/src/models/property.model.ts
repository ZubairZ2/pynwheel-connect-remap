/**
 * The property the visitor tours, and the maps (levels) it is drawn on.
 *
 * These interfaces are the Tour App's view of what the Pynwheel backend will
 * answer from `GET /api/self_tour/v1/communities/:id/wayfinding.json`
 * (`Wayfinding::GraphSerializer`): domain concepts only — levels, nodes,
 * edges, vertical connections, gates, the tour — never Rails table names.
 * Today a `DummyTourRepository` fills them from local dummy data; later a
 * `PynwheelApiTourRepository` fills the same shapes from the API, and no
 * screen changes.
 */

/** x' = a·x + c·y + e, y' = b·x + d·y + f (the CMS's `svg_to_image_transform`). */
export interface AffineTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

/** A level is one map: a floorplate (one floor, or a stacked range of floors sharing one plan) or the property's sitemap. */
export type LevelKind = 'floorplate' | 'sitemap';

/** The frame the level's coordinates are in: floor-image pixels (`raster`) or the floor SVG's viewBox (`svg`). */
export type CoordinateSpace = 'raster' | 'svg';

/** One axis-aligned room, wall or outline of a floor's vector plan. */
export interface FloorShape {
  id: string;
  kind: 'outline' | 'room' | 'corridor' | 'core' | 'outdoor' | 'water' | 'label';
  /** Polygon in level pixels, closed implicitly. */
  points: [number, number][];
  /** For `label`: the text and its anchor. */
  text?: string;
  at?: [number, number];
  /** Which plotted record the shape is the footprint of (`unit:12`, `amenity:3`). */
  ref?: string | null;
}

/** The vector geometry of a level (what the backend serves as `svg`). */
export interface FloorGeometry {
  viewBox: [number, number, number, number];
  shapes: FloorShape[];
}

export interface MapLevel {
  /** `floorplate:101`, `sitemap:1` — stable typed ids as the API emits them. */
  id: string;
  kind: LevelKind;
  name: string;
  building: string | null;
  /** The floors this plan stands for; several for a stacked floorplate, empty for the sitemap. */
  floors: number[];
  /** Background image URL (floor image or site plan), null when the level is vector only. */
  image: string | null;
  /** Vector geometry drawn above the background (null when only an image exists). */
  svg: FloorGeometry | null;
  /** The floor SVG file's S3 URL, when the backend has one (informational: the app loads it through `svgPath`). */
  svgUrl?: string | null;
  /** API path that serves the floor SVG with the session token (S3 has no CORS for the app). */
  svgPath?: string | null;
  /** Calibrated SVG viewBox → level pixels map when the CMS stores one; null = the SVG fills the frame. */
  svgTransform?: AffineTransform | null;
  /** The SVG's intrinsic size recorded at upload, when known. */
  svgSize?: { width: number; height: number } | null;
  width: number;
  height: number;
  space: CoordinateSpace;
  /** Real-world scale; null means distances are reported in pixels, exactly as the backend does. */
  scaleFtPerPx: number | null;
  version: number;
}

export interface Building {
  name: string;
  /** Level ids in floor order. */
  levels: string[];
}

export interface Property {
  id: number;
  name: string;
  address: string;
  city: string;
  heroImage: string;
  isSitemap: boolean;
  autoWayfinding: boolean;
  floorsCount: number;
  unitsCount: number;
  amenitiesCount: number;
  /** The Self-Guided Tour is on for this property (server-side fact). */
  tourEnabled: boolean;
}
