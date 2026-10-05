import type { GraphNode, StopKind } from '~/models';
import type { IconName } from '~/components/Icon';

/**
 * The map's visual semantics, as the Map & Plotting design draws them: a
 * colour and a glyph per stop type, and the unit / amenity treatment. Not
 * arbitrary dots — a route starts at a green entry, rides a blue elevator,
 * avoids a red blocker and ends at a coral destination flag.
 */

export interface Symbol {
  color: string;
  /** Light fill behind the glyph when drawn as a chip. */
  soft: string;
  icon: IconName;
  label: string;
}

export const STOP_SYMBOLS: Record<StopKind, Symbol> = {
  entry: { color: '#4A7212', soft: '#E3F1D6', icon: 'entry', label: 'Entry Point' },
  exit: { color: '#4A7212', soft: '#E3F1D6', icon: 'exit', label: 'Exit Point' },
  elevator: { color: '#0077AE', soft: '#E6F2F9', icon: 'elevator', label: 'Elevator' },
  stairs: { color: '#0077AE', soft: '#E6F2F9', icon: 'stairs', label: 'Stairs' },
  ramp: { color: '#0077AE', soft: '#E6F2F9', icon: 'ramp', label: 'Ramp' },
  door: { color: '#7B3A87', soft: '#F1E4F3', icon: 'door', label: 'Door / Gate' },
  blocker: { color: '#C62534', soft: '#FBE1E4', icon: 'blocker', label: 'Blocker' },
  leasing: { color: '#8A6A00', soft: '#FDEBC8', icon: 'leasing', label: 'Leasing Office' },
  restroom: { color: '#5B6270', soft: '#EEF0F4', icon: 'restroom', label: 'Restroom' },
  mail: { color: '#5B6270', soft: '#EEF0F4', icon: 'mail', label: 'Mail & Packages' },
  parking: { color: '#5B6270', soft: '#EEF0F4', icon: 'parking', label: 'Parking Access' },
  waypoint: { color: '#5B6270', soft: '#EEF0F4', icon: 'waypoint', label: 'Waypoint' }
};

export const UNIT_SYMBOL: Symbol = { color: '#0077AE', soft: '#E6F2F9', icon: 'unit', label: 'Unit' };
export const AMENITY_SYMBOL: Symbol = { color: '#8A5A00', soft: '#FDEBC8', icon: 'amenity', label: 'Amenity' };
export const START_SYMBOL: Symbol = { color: '#4A7212', soft: '#E3F1D6', icon: 'pin', label: 'Tour Start' };
export const HALLWAY_SYMBOL: Symbol = { color: '#919191', soft: '#EEEEEE', icon: 'waypoint', label: 'Hallway point' };

export const ROUTE_COLOR = '#4A7212';
export const ROUTE_CASING = '#FFFFFF';
export const NETWORK_COLOR = '#B9C4CE';
export const FROM_COLOR = '#4A7212';
export const TO_COLOR = '#C62534';

export const symbolOf = (node: GraphNode): Symbol => {
  switch (node.kind) {
    case 'unit':
      return UNIT_SYMBOL;
    case 'amenity':
      return AMENITY_SYMBOL;
    case 'tour_start':
      return START_SYMBOL;
    case 'entry':
      return STOP_SYMBOLS.entry;
    case 'elevator':
      return STOP_SYMBOLS[node.vertical ?? 'elevator'];
    case 'door':
      return STOP_SYMBOLS.door;
    case 'blocker':
      return STOP_SYMBOLS.blocker;
    case 'stop':
      return STOP_SYMBOLS[node.stopKind ?? 'waypoint'];
    default:
      return HALLWAY_SYMBOL;
  }
};

export const symbolOfStopKind = (kind: StopKind | undefined, placeKind: 'unit' | 'amenity' | 'stop'): Symbol =>
  placeKind === 'unit' ? UNIT_SYMBOL : placeKind === 'amenity' ? AMENITY_SYMBOL : STOP_SYMBOLS[kind ?? 'waypoint'];
