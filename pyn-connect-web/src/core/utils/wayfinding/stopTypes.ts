import { CORE_STRINGS } from '~/config/app/strings';

/**
 * The self-tour stop types of the wayfinding design's "Add Additional Stop"
 * dialog, with their marker colour and glyph. Four of them are records the
 * CMS already keeps — Entry / Exit (`building_starting_points`, one per
 * building, the tour's own start in `tours`), Elevator (`elevators`) and
 * Door / Gate (`doors` attached to a floorplate: the access points) — and
 * are drawn from the stored data; every other type exists only as a
 * temporary stop added on the page.
 */

export type StopTypeId =
  | 'entry'
  | 'exit'
  | 'elevator'
  | 'stairs'
  | 'ramp'
  | 'door'
  | 'blocker'
  | 'leasing'
  | 'restroom'
  | 'mail'
  | 'parking'
  | 'waypoint';

export interface StopType {
  id: StopTypeId;
  /** i18n keys. */
  label: string;
  hint: string;
  example: string;
  color: string;
  /** One SVG path (24×24 viewBox), stroked. */
  d: string;
  /** Joins floorplates (routes ride it between floors). */
  vertical?: boolean;
  /** A doorway a smart lock may open. */
  gate?: boolean;
  /** An area routes avoid. */
  block?: boolean;
}

const K = CORE_STRINGS.mapPlotting.stops.types;

export const STOP_TYPES: StopType[] = [
  { id: 'entry', label: K.entry.label, hint: K.entry.hint, example: K.entry.example, color: '#4A7212', d: 'M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4' },
  { id: 'exit', label: K.exit.label, hint: K.exit.hint, example: K.exit.example, color: '#4A7212', d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9' },
  { id: 'elevator', label: K.elevator.label, hint: K.elevator.hint, example: K.elevator.example, color: '#0077AE', vertical: true, d: 'M5 3h14v18H5zM9 10l3-3 3 3M9 14l3 3 3-3' },
  { id: 'stairs', label: K.stairs.label, hint: K.stairs.hint, example: K.stairs.example, color: '#0077AE', vertical: true, d: 'M3 20h5v-5h5v-5h5V5h3' },
  { id: 'ramp', label: K.ramp.label, hint: K.ramp.hint, example: K.ramp.example, color: '#0077AE', d: 'M3 19h18V8z' },
  { id: 'door', label: K.door.label, hint: K.door.hint, example: K.door.example, color: '#7B3A87', gate: true, d: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M14 12h.01' },
  { id: 'blocker', label: K.blocker.label, hint: K.blocker.hint, example: K.blocker.example, color: '#C62534', block: true, d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM5.6 5.6l12.8 12.8' },
  { id: 'leasing', label: K.leasing.label, hint: K.leasing.hint, example: K.leasing.example, color: '#8A6A00', d: 'M4 21V9l8-6 8 6v12M9 21v-6h6v6' },
  {
    id: 'restroom',
    label: K.restroom.label,
    hint: K.restroom.hint,
    example: K.restroom.example,
    color: '#5B6270',
    d: 'M12 3v18M7 4.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM17 4.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM5 11h4v10M15 11h4v10'
  },
  { id: 'mail', label: K.mail.label, hint: K.mail.hint, example: K.mail.example, color: '#5B6270', d: 'M3 6h18v13H3zM3 6l9 7 9-7' },
  { id: 'parking', label: K.parking.label, hint: K.parking.hint, example: K.parking.example, color: '#5B6270', d: 'M5 3h14v18H5zM10 17V7h3a3 3 0 0 1 0 6h-3' },
  {
    id: 'waypoint',
    label: K.waypoint.label,
    hint: K.waypoint.hint,
    example: K.waypoint.example,
    color: '#5B6270',
    d: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 8a2 2 0 1 1 0 4a2 2 0 1 1 0-4z'
  }
];

export const stopTypeOf = (id: StopTypeId | string | null | undefined): StopType =>
  STOP_TYPES.find((type) => type.id === id) ?? STOP_TYPES[STOP_TYPES.length - 1];

export const isStopType = (value: string): value is StopTypeId => STOP_TYPES.some((type) => type.id === value);

/** Glyphs of the things that are not stops, for the route steps and the From / To picker. */
export const UNIT_GLYPH = 'M3 21V8l9-5 9 5v13M9 21v-6h6v6';
export const AMENITY_GLYPH = 'M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.6L6 22l1.5-7.2L2 10l7.1-1.1z';
export const WALK_GLYPH = 'M13 4a1.5 1.5 0 1 0 0 .01M9 20l3-7 3 3v4M9 12l2-4 4 2 2 3';
export const OUTDOOR_GLYPH = 'M3 21h18M6 21V10l6-5 6 5v11';
export const END_GLYPH = 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z';
