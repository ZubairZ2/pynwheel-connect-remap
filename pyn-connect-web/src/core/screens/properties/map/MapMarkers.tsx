'use client';

import type { CSSProperties } from 'react';

/**
 * The marker glyphs the legacy plotting page draws (floorplates/
 * _svg_or_image_unit_plotting.html.haml, _svg_or_image_amenity_plotting,
 * maps.js `draw_initial_hallways`), as inline SVG so the CMS's Font Awesome
 * stylesheet is not needed: the location marker (`fa-map-marker-alt`) in the
 * theme's colour with its tip on the stored point, the green "plot this
 * unit's door" plus (`fa-plus-circle`), the amenity square with its camera,
 * the hallway node (`fa-dot-circle`, #008fd4, #f7296a when selected), the
 * door (`fa-sign-in`, #3153d2) and the tour's red starting point
 * (`.start-point`). Sizes are given in the plan's own pixels, so the markers
 * scale with the map exactly as the legacy panzoom container scaled them.
 */

export const HALLWAY_COLOR = '#008fd4';
export const HALLWAY_SELECTED_COLOR = '#f7296a';
export const EDGE_COLOR = '#000000';
export const ELEVATOR_COLOR = '#7B3A87';
export const ENTRY_COLOR = '#4A7212';

const MARKER_PATH =
  'M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0zM192 272c44.183 0 80-35.817 80-80s-35.817-80-80-80-80 35.817-80 80 35.817 80 80 80z';
const PLUS_CIRCLE_PATH =
  'M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm144 276c0 6.6-5.4 12-12 12h-92v92c0 6.6-5.4 12-12 12h-56c-6.6 0-12-5.4-12-12v-92h-92c-6.6 0-12-5.4-12-12v-56c0-6.6 5.4-12 12-12h92v-92c0-6.6 5.4-12 12-12h56c6.6 0 12 5.4 12 12v92h92c6.6 0 12 5.4 12 12v56z';
const DOT_CIRCLE_PATH =
  'M256 8C119.033 8 8 119.033 8 256s111.033 248 248 248 248-111.033 248-248S392.967 8 256 8zm0 448c-110.532 0-200-89.451-200-200 0-110.531 89.451-200 200-200 110.532 0 200 89.451 200 200 0 110.532-89.451 200-200 200zm0-312c-61.856 0-112 50.144-112 112s50.144 112 112 112 112-50.144 112-112-50.144-112-112-112z';
const SIGN_IN_PATH =
  'M416 448h-84c-6.6 0-12-5.4-12-12v-40c0-6.6 5.4-12 12-12h84c17.7 0 32-14.3 32-32V160c0-17.7-14.3-32-32-32h-84c-6.6 0-12-5.4-12-12V76c0-6.6 5.4-12 12-12h84c53 0 96 43 96 96v192c0 53-43 96-96 96zm-47-201L201 79c-15-15-41-4.5-41 17v96H24c-13.3 0-24 10.7-24 24v96c0 13.3 10.7 24 24 24h136v96c0 21.5 26 32 41 17l168-168c9.3-9.4 9.3-24.6 0-34z';

/** `fa-map-marker-alt` is 384 × 512: its width at a given height. */
export const markerWidth = (height: number): number => (height * 384) / 512;

/** The location marker, its tip at the element's origin. */
export const LocationGlyph = ({ size, color, style }: { size: number; color: string; style?: CSSProperties }) => (
  <svg
    className="bo-map__glyph bo-map__glyph--tip"
    viewBox="0 0 384 512"
    width={markerWidth(size)}
    height={size}
    aria-hidden="true"
    style={style}
  >
    <path d={MARKER_PATH} fill={color} />
  </svg>
);

/** The green plus the legacy page hangs at the marker's shoulder: "click to plot this unit's door". */
export const PlusGlyph = ({ size, color, style }: { size: number; color: string; style?: CSSProperties }) => (
  <svg className="bo-map__markerplus" viewBox="0 0 512 512" width={size} height={size} aria-hidden="true" style={style}>
    <circle cx="256" cy="256" r="200" fill="#fff" />
    <path d={PLUS_CIRCLE_PATH} fill={color} />
  </svg>
);

/** The amenity marker: the theme colour's square with a camera inside, centred on the stored point. */
export const AmenityGlyph = ({ size, color, style }: { size: number; color: string; style?: CSSProperties }) => (
  <span className="bo-map__amenitybox" style={{ width: size, height: size, borderColor: color, borderWidth: Math.max(1, size / 12), ...style }}>
    <svg viewBox="0 0 24 24" width={size / 2} height={size / 2} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  </span>
);

/** A pathway node (`fa-dot-circle`), centred on the stored point. */
export const NodeGlyph = ({ size, color, dashed }: { size: number; color: string; dashed?: boolean }) => (
  <svg className="bo-map__glyph bo-map__glyph--centre" viewBox="0 0 512 512" width={size} height={size} aria-hidden="true">
    <circle cx="256" cy="256" r="220" fill="#fff" />
    <path d={DOT_CIRCLE_PATH} fill={color} strokeDasharray={dashed ? '40 30' : undefined} />
  </svg>
);

/** A door (`fa-sign-in`), centred on the stored point. */
export const DoorGlyph = ({ size, color }: { size: number; color: string }) => (
  <svg className="bo-map__glyph bo-map__glyph--centre" viewBox="0 0 512 512" width={size} height={size} aria-hidden="true">
    <path d={SIGN_IN_PATH} fill={color} />
  </svg>
);

/** A plain round marker (elevators, building entry points), centred on the stored point. */
export const DotGlyph = ({ size, color, ring }: { size: number; color: string; ring?: string }) => (
  <span
    className="bo-map__glyph bo-map__glyph--centre bo-map__glyphdot"
    style={{ width: size, height: size, background: color, borderColor: ring ?? '#fff', borderWidth: Math.max(1, size / 8) }}
  />
);

/** The tour's starting point: the legacy `.start-point` red disc with its inner ring. */
export const TourStartGlyph = ({ size }: { size: number }) => (
  <span className="bo-map__glyph bo-map__glyph--centre bo-map__tourstart" style={{ width: size, height: size, boxShadow: `inset 0 0 0 ${Math.max(1, size / 8)}px whitesmoke` }} />
);

/** The refresh arrow of the zoom control's Reset view. */
export const ResetViewIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);
