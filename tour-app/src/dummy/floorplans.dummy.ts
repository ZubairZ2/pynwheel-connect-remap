/**
 * DUMMY DATA — the demo property "Luxe Mile High *".
 *
 * Every name, coordinate and number in this file is invented for the demo
 * and is shown to the visitor with a trailing `*`. Nothing here is read from
 * the Pynwheel CMS. When the real Tour App API is connected, this file and
 * `buildGraph.ts` are replaced by `PynwheelApiTourRepository`; the screens
 * do not change.
 *
 * The property is laid out to exercise the whole map model:
 *   - Tower A: Floor 1 (one floor), Floors 2–3 (one stacked plate shared by
 *     two floors, as the CMS's `floorplate_covering_range` does), Rooftop;
 *   - Tower B: Floors 1 and 2, linked only by stairs (so a step-free route
 *     to Tower B's second floor is impossible);
 *   - one elevator serving floors 1, 2, 3 and 15, stairs serving 1–3;
 *   - entry / exit gates in both towers joined by outdoor walks drawn on the
 *     site plan (cross-building routing);
 *   - a blocker cutting one corridor on Floor 1 (routes go round it);
 *   - two places that are not joined to any path (a route to them fails
 *     with "not linked", as the backend answers).
 *
 * Coordinates are level pixels: floorplates are 1000 × 620, the site plan is
 * the image's 1402 × 870. Rooms are rectangles; the vector plan is drawn
 * from them (`buildGraph.ts`).
 */

import type { AmenityIcon, StopKind, VerticalKind } from '~/models';

export interface RoomDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HallwayDef {
  id: number;
  x: number;
  y: number;
}

/** [from hallway id, to hallway id, interior polyline points (optional)] */
export type EdgeDef = [number, number, [number, number][]?];

export interface PlaceDef {
  node: string;
  kind: 'unit' | 'amenity' | 'stop' | 'elevator' | 'entry' | 'tour_start' | 'blocker';
  name: string;
  /** Concrete floor on a stacked plate; omitted = every floor of the level. */
  floor?: number;
  room?: RoomDef;
  /** The marker / door point, in level pixels. */
  at: [number, number];
  /** The hallway the place joins the paths at; omitted = not linked. */
  attach?: number;
  stopKind?: StopKind;
  vertical?: VerticalKind;
  accessible?: boolean;
  floorsServed?: number[];
  note?: string;
  radiusPx?: number;
  unit?: { bedrooms: number; bathrooms: number; sqft: number; rent: number | null; available: boolean; model: boolean; description: string };
  amenity?: { icon: AmenityIcon; hours: string; description: string };
  showInStopsList?: boolean;
  /** Where the AR Live screen pins the place, as the reference positions its labels. */
  arPin?: { top: string; left: string };
}

export interface LevelDef {
  id: string;
  kind: 'floorplate' | 'sitemap';
  name: string;
  building: string | null;
  floors: number[];
  width: number;
  height: number;
  scaleFtPerPx: number | null;
  hallways: HallwayDef[];
  edges: EdgeDef[];
  places: PlaceDef[];
  /** Corridor rectangles drawn on the vector plan. */
  corridors: RoomDef[];
  labels: { text: string; at: [number, number] }[];
}

export const TOWER_A = 'Tower A *';
export const TOWER_B = 'Tower B *';

export const PROPERTY_NAME = 'Luxe Mile High *';
export const PROPERTY_ADDRESS = '3401 Blake St, Denver, CO *';
export const PROPERTY_CITY = 'Denver, CO *';

/** The corridor network every Tower A plate shares (a loop at the top, the main hall, a loop at the bottom right). */
const towerACorridors = (): RoomDef[] => [
  { x: 100, y: 296, w: 820, h: 28 },
  { x: 286, y: 136, w: 428, h: 28 },
  { x: 286, y: 136, w: 28, h: 188 },
  { x: 686, y: 136, w: 28, h: 188 },
  { x: 486, y: 136, w: 28, h: 388 },
  { x: 486, y: 486, w: 408, h: 28 },
  { x: 866, y: 296, w: 28, h: 218 }
];

const towerAHallways = (offset: number): HallwayDef[] => [
  { id: offset + 1, x: 120, y: 310 },
  { id: offset + 2, x: 300, y: 310 },
  { id: offset + 3, x: 500, y: 310 },
  { id: offset + 4, x: 700, y: 310 },
  { id: offset + 5, x: 880, y: 310 },
  { id: offset + 6, x: 300, y: 150 },
  { id: offset + 7, x: 500, y: 150 },
  { id: offset + 8, x: 700, y: 150 },
  { id: offset + 9, x: 500, y: 500 },
  { id: offset + 10, x: 880, y: 500 }
];

const towerAEdges = (o: number): EdgeDef[] => [
  [o + 1, o + 2],
  [o + 2, o + 3],
  [o + 3, o + 4],
  [o + 4, o + 5],
  [o + 2, o + 6],
  [o + 6, o + 7],
  [o + 7, o + 8],
  [o + 8, o + 4],
  [o + 3, o + 7],
  [o + 3, o + 9],
  [o + 9, o + 10],
  [o + 5, o + 10]
];

export const LEVELS: LevelDef[] = [
  {
    id: 'floorplate:101',
    kind: 'floorplate',
    name: 'Floor 1 *',
    building: TOWER_A,
    floors: [1],
    width: 1000,
    height: 620,
    scaleFtPerPx: 0.25,
    hallways: towerAHallways(0),
    edges: towerAEdges(0),
    corridors: towerACorridors(),
    labels: [{ text: 'Lobby *', at: [200, 236] }],
    places: [
      { node: 'bsp:1', kind: 'entry', name: 'Main Entrance *', at: [60, 310], attach: 1, stopKind: 'entry', note: 'Enter through the glass doors on Blake Street.' },
      { node: 'tour_start:1', kind: 'tour_start', name: 'Tour Start *', at: [96, 342], attach: 1 },
      {
        node: 'stop:1',
        kind: 'stop',
        stopKind: 'leasing',
        name: 'Leasing Office *',
        room: { x: 316, y: 40, w: 160, h: 92 },
        at: [396, 136],
        attach: 6,
        note: 'The leasing team can answer anything about pricing and availability.'
      },
      { node: 'stop:2', kind: 'stop', stopKind: 'mail', name: 'Mail & Packages *', room: { x: 496, y: 40, w: 120, h: 92 }, at: [556, 136], attach: 7 },
      { node: 'stop:3', kind: 'stop', stopKind: 'restroom', name: 'Restroom *', room: { x: 636, y: 40, w: 100, h: 92 }, at: [686, 136], attach: 8 },
      {
        node: 'unit:101',
        kind: 'unit',
        name: 'Unit 101 *',
        floor: 1,
        room: { x: 316, y: 170, w: 160, h: 122 },
        at: [396, 296],
        attach: 2,
        unit: { bedrooms: 1, bathrooms: 1, sqft: 720, rent: 1850, available: true, model: false, description: 'Corner one-bedroom with a south-facing balcony.' },
        showInStopsList: true,
        arPin: { top: '74%', left: '74%' }
      },
      {
        node: 'unit:102',
        kind: 'unit',
        name: 'Unit 102 *',
        floor: 1,
        room: { x: 516, y: 170, w: 160, h: 122 },
        at: [596, 296],
        attach: 3,
        unit: { bedrooms: 1, bathrooms: 1, sqft: 745, rent: 1895, available: false, model: false, description: 'One-bedroom facing the courtyard.' },
        showInStopsList: false
      },
      {
        node: 'amenity:1',
        kind: 'amenity',
        name: 'Fitness Center *',
        floor: 1,
        room: { x: 120, y: 340, w: 356, h: 140 },
        at: [300, 324],
        attach: 2,
        amenity: { icon: 'dumbbell', hours: '24/7 for residents', description: 'Peloton bikes, free weights up to 90 lb, a squat rack and a yoga studio.' },
        showInStopsList: true,
        arPin: { top: '64%', left: '16%' }
      },
      { node: 'elevator:1', kind: 'elevator', vertical: 'elevator', accessible: true, floorsServed: [1, 2, 3, 15], name: 'Elevator A *', room: { x: 516, y: 340, w: 64, h: 64 }, at: [548, 372], attach: 3 },
      { node: 'elevator:2', kind: 'elevator', vertical: 'stairs', accessible: false, floorsServed: [1, 2, 3], name: 'Stairs A *', room: { x: 600, y: 340, w: 64, h: 64 }, at: [632, 372], attach: 4 },
      {
        node: 'unit:103',
        kind: 'unit',
        name: 'Unit 103 *',
        floor: 1,
        room: { x: 700, y: 340, w: 160, h: 140 },
        at: [780, 324],
        attach: 5,
        unit: { bedrooms: 2, bathrooms: 1, sqft: 960, rent: 2150, available: true, model: true, description: 'Furnished model home with a den.' },
        showInStopsList: false
      },
      {
        node: 'unit:104',
        kind: 'unit',
        name: 'Storage Room *',
        floor: 1,
        room: { x: 120, y: 520, w: 100, h: 80 },
        at: [170, 516],
        unit: { bedrooms: 0, bathrooms: 0, sqft: 110, rent: null, available: false, model: false, description: 'Not on a path yet — routing here fails on purpose.' },
        showInStopsList: false
      },
      { node: 'stop:4', kind: 'stop', stopKind: 'parking', name: 'Parking Access *', at: [944, 310], attach: 5, note: 'The garage door opens with the code on your tour pass.' },
      { node: 'stop:5', kind: 'stop', stopKind: 'exit', name: 'Courtyard Exit *', at: [500, 584], attach: 9, note: 'Leads to the courtyard and Tower B.' },
      { node: 'stop:6', kind: 'blocker', stopKind: 'blocker', name: 'Wet Floor *', at: [650, 310], radiusPx: 30, note: 'Cleaning in progress — routes avoid this corridor.' }
    ]
  },
  {
    id: 'floorplate:102',
    kind: 'floorplate',
    name: 'Floors 2–3 *',
    building: TOWER_A,
    floors: [2, 3],
    width: 1000,
    height: 620,
    scaleFtPerPx: 0.25,
    hallways: towerAHallways(20),
    edges: towerAEdges(20),
    corridors: towerACorridors(),
    labels: [],
    places: [
      { node: 'elevator:1', kind: 'elevator', vertical: 'elevator', accessible: true, floorsServed: [1, 2, 3, 15], name: 'Elevator A *', room: { x: 516, y: 340, w: 64, h: 64 }, at: [548, 372], attach: 23 },
      { node: 'elevator:2', kind: 'elevator', vertical: 'stairs', accessible: false, floorsServed: [1, 2, 3], name: 'Stairs A *', room: { x: 600, y: 340, w: 64, h: 64 }, at: [632, 372], attach: 24 },
      { node: 'stop:8', kind: 'stop', stopKind: 'waypoint', name: 'Hallway Waypoint *', at: [700, 500], attach: 30 },
      // Floor 2
      {
        node: 'unit:203',
        kind: 'unit',
        name: 'Unit 203 *',
        floor: 2,
        room: { x: 120, y: 170, w: 160, h: 122 },
        at: [200, 296],
        attach: 21,
        unit: { bedrooms: 1, bathrooms: 1, sqft: 710, rent: 1825, available: true, model: false, description: 'Quiet one-bedroom at the end of the hall.' },
        showInStopsList: false
      },
      {
        node: 'unit:201',
        kind: 'unit',
        name: 'Unit 201 *',
        floor: 2,
        room: { x: 316, y: 170, w: 160, h: 122 },
        at: [396, 296],
        attach: 22,
        unit: { bedrooms: 1, bathrooms: 1, sqft: 730, rent: 1875, available: false, model: false, description: 'One-bedroom over the lobby.' },
        showInStopsList: false
      },
      {
        node: 'unit:202',
        kind: 'unit',
        name: 'Unit 202 *',
        floor: 2,
        room: { x: 516, y: 170, w: 160, h: 122 },
        at: [596, 296],
        attach: 23,
        unit: { bedrooms: 2, bathrooms: 2, sqft: 1080, rent: 2350, available: true, model: false, description: 'Two-bedroom with a walk-in closet.' },
        showInStopsList: false
      },
      {
        node: 'unit:204',
        kind: 'unit',
        name: 'Unit 204 *',
        floor: 2,
        room: { x: 700, y: 340, w: 160, h: 140 },
        at: [780, 324],
        attach: 25,
        unit: { bedrooms: 2, bathrooms: 2, sqft: 1100, rent: 2400, available: true, model: false, description: 'Two-bedroom corner home with mountain views.' },
        showInStopsList: true,
        arPin: { top: '46%', left: '30%' }
      },
      {
        node: 'amenity:2',
        kind: 'amenity',
        name: 'Business Center *',
        floor: 2,
        room: { x: 120, y: 340, w: 356, h: 140 },
        at: [300, 324],
        attach: 22,
        amenity: { icon: 'briefcase', hours: '6:00 AM – 10:00 PM', description: 'Private offices, a conference room and printing.' },
        showInStopsList: true
      },
      // Floor 3
      {
        node: 'unit:303',
        kind: 'unit',
        name: 'Unit 0303 *',
        floor: 3,
        room: { x: 120, y: 170, w: 160, h: 122 },
        at: [200, 296],
        attach: 21,
        unit: { bedrooms: 1, bathrooms: 1, sqft: 710, rent: 1850, available: true, model: false, description: 'One-bedroom with a reading nook.' },
        showInStopsList: false
      },
      {
        node: 'unit:301',
        kind: 'unit',
        name: 'Unit 0301 *',
        floor: 3,
        room: { x: 316, y: 170, w: 160, h: 122 },
        at: [396, 296],
        attach: 22,
        unit: { bedrooms: 1, bathrooms: 1, sqft: 730, rent: 1900, available: false, model: false, description: 'One-bedroom, leased.' },
        showInStopsList: false
      },
      {
        node: 'unit:302',
        kind: 'unit',
        name: 'Unit 0302 *',
        floor: 3,
        room: { x: 516, y: 170, w: 160, h: 122 },
        at: [596, 296],
        attach: 23,
        unit: { bedrooms: 2, bathrooms: 2, sqft: 1080, rent: 2375, available: true, model: false, description: 'Two-bedroom with an upgraded kitchen.' },
        showInStopsList: false
      },
      {
        node: 'unit:304',
        kind: 'unit',
        name: 'Unit 0304 *',
        floor: 3,
        room: { x: 700, y: 340, w: 160, h: 140 },
        at: [780, 324],
        attach: 25,
        unit: { bedrooms: 2, bathrooms: 2, sqft: 1100, rent: 2450, available: true, model: false, description: 'Two-bedroom corner home, top of the mid-rise.' },
        showInStopsList: true
      },
      { node: 'stop:7', kind: 'stop', stopKind: 'restroom', name: 'Restroom *', floor: 3, room: { x: 636, y: 40, w: 100, h: 92 }, at: [686, 136], attach: 28 }
    ]
  },
  {
    id: 'floorplate:115',
    kind: 'floorplate',
    name: 'Rooftop *',
    building: TOWER_A,
    floors: [15],
    width: 1000,
    height: 620,
    scaleFtPerPx: 0.25,
    hallways: [
      { id: 41, x: 300, y: 310 },
      { id: 42, x: 500, y: 310 },
      { id: 43, x: 700, y: 310 },
      { id: 44, x: 500, y: 150 },
      { id: 45, x: 500, y: 480 }
    ],
    edges: [
      [41, 42],
      [42, 43],
      [42, 44],
      [42, 45]
    ],
    corridors: [
      { x: 286, y: 296, w: 428, h: 28 },
      { x: 486, y: 136, w: 28, h: 360 }
    ],
    labels: [{ text: 'Sky Deck *', at: [500, 100] }],
    places: [
      { node: 'elevator:1', kind: 'elevator', vertical: 'elevator', accessible: true, floorsServed: [1, 2, 3, 15], name: 'Elevator A *', room: { x: 516, y: 340, w: 64, h: 64 }, at: [548, 372], attach: 42 },
      {
        node: 'amenity:3',
        kind: 'amenity',
        name: 'Swimming Pool *',
        floor: 15,
        room: { x: 120, y: 60, w: 340, h: 230 },
        at: [300, 296],
        attach: 41,
        amenity: { icon: 'wave', hours: '5:00 AM – 10:00 PM', description: 'Heated year-round, with cabanas, a hot tub and a grilling lounge.' },
        showInStopsList: true,
        arPin: { top: '20%', left: '64%' }
      },
      {
        node: 'amenity:4',
        kind: 'amenity',
        name: 'Sky Lounge *',
        floor: 15,
        room: { x: 540, y: 60, w: 340, h: 230 },
        at: [700, 296],
        attach: 43,
        amenity: { icon: 'star', hours: '7:00 AM – 11:00 PM', description: 'Fireplace lounge with a demonstration kitchen and skyline views.' },
        showInStopsList: true,
        arPin: { top: '12%', left: '86%' }
      },
      {
        node: 'amenity:5',
        kind: 'amenity',
        name: 'Rooftop Garden *',
        floor: 15,
        room: { x: 120, y: 340, w: 340, h: 220 },
        at: [300, 336],
        amenity: { icon: 'leaf', hours: 'Dawn to dusk', description: 'Not on a path yet — routing here fails on purpose.' },
        showInStopsList: false
      },
      { node: 'stop:9', kind: 'stop', stopKind: 'restroom', name: 'Restroom *', room: { x: 700, y: 340, w: 100, h: 80 }, at: [750, 336], attach: 43 }
    ]
  },
  {
    id: 'floorplate:201',
    kind: 'floorplate',
    name: 'Floor 1 *',
    building: TOWER_B,
    floors: [1],
    width: 1000,
    height: 620,
    scaleFtPerPx: 0.25,
    hallways: [
      { id: 51, x: 150, y: 310 },
      { id: 52, x: 400, y: 310 },
      { id: 53, x: 650, y: 310 },
      { id: 54, x: 850, y: 310 }
    ],
    edges: [
      [51, 52],
      [52, 53],
      [53, 54]
    ],
    corridors: [{ x: 130, y: 296, w: 740, h: 28 }],
    labels: [{ text: 'Tower B Lobby *', at: [240, 236] }],
    places: [
      { node: 'bsp:2', kind: 'entry', name: 'Tower B Entrance *', at: [80, 310], attach: 51, stopKind: 'entry', note: 'Use the courtyard doors.' },
      {
        node: 'amenity:6',
        kind: 'amenity',
        name: 'Dog Park *',
        floor: 1,
        room: { x: 120, y: 340, w: 280, h: 220 },
        at: [260, 324],
        attach: 52,
        amenity: { icon: 'dog', hours: 'Dawn to dusk', description: 'Fenced turf run with a wash station.' },
        showInStopsList: true
      },
      {
        node: 'unit:311',
        kind: 'unit',
        name: 'Unit B-101 *',
        floor: 1,
        room: { x: 420, y: 170, w: 180, h: 122 },
        at: [510, 296],
        attach: 52,
        unit: { bedrooms: 2, bathrooms: 2, sqft: 1040, rent: 2275, available: true, model: false, description: 'Garden-level two-bedroom with a patio.' },
        showInStopsList: true
      },
      {
        node: 'unit:312',
        kind: 'unit',
        name: 'Unit B-102 *',
        floor: 1,
        room: { x: 640, y: 170, w: 180, h: 122 },
        at: [730, 296],
        attach: 53,
        unit: { bedrooms: 1, bathrooms: 1, sqft: 690, rent: 1795, available: false, model: false, description: 'Studio-style one-bedroom.' },
        showInStopsList: false
      },
      { node: 'stop:10', kind: 'stop', stopKind: 'mail', name: 'Package Room *', room: { x: 860, y: 170, w: 100, h: 122 }, at: [900, 296], attach: 54 },
      { node: 'elevator:3', kind: 'elevator', vertical: 'stairs', accessible: false, floorsServed: [1, 2], name: 'Stairs B *', room: { x: 620, y: 340, w: 64, h: 64 }, at: [652, 372], attach: 53 }
    ]
  },
  {
    id: 'floorplate:202',
    kind: 'floorplate',
    name: 'Floor 2 *',
    building: TOWER_B,
    floors: [2],
    width: 1000,
    height: 620,
    scaleFtPerPx: 0.25,
    hallways: [
      { id: 61, x: 150, y: 310 },
      { id: 62, x: 400, y: 310 },
      { id: 63, x: 650, y: 310 },
      { id: 64, x: 850, y: 310 }
    ],
    edges: [
      [61, 62],
      [62, 63],
      [63, 64]
    ],
    corridors: [{ x: 130, y: 296, w: 740, h: 28 }],
    labels: [],
    places: [
      {
        node: 'amenity:7',
        kind: 'amenity',
        name: 'Yoga Studio *',
        floor: 2,
        room: { x: 120, y: 340, w: 280, h: 220 },
        at: [260, 324],
        attach: 62,
        amenity: { icon: 'yoga', hours: '5:00 AM – 11:00 PM', description: 'Mirrored studio with on-demand classes.' },
        showInStopsList: true
      },
      {
        node: 'unit:321',
        kind: 'unit',
        name: 'Unit B-201 *',
        floor: 2,
        room: { x: 420, y: 170, w: 180, h: 122 },
        at: [510, 296],
        attach: 62,
        unit: { bedrooms: 2, bathrooms: 2, sqft: 1040, rent: 2325, available: true, model: false, description: 'Two-bedroom over the dog park.' },
        showInStopsList: false
      },
      {
        node: 'unit:322',
        kind: 'unit',
        name: 'Unit B-202 *',
        floor: 2,
        room: { x: 640, y: 170, w: 180, h: 122 },
        at: [730, 296],
        attach: 63,
        unit: { bedrooms: 1, bathrooms: 1, sqft: 690, rent: 1825, available: true, model: false, description: 'One-bedroom with a balcony.' },
        showInStopsList: false
      },
      { node: 'elevator:3', kind: 'elevator', vertical: 'stairs', accessible: false, floorsServed: [1, 2], name: 'Stairs B *', room: { x: 620, y: 340, w: 64, h: 64 }, at: [652, 372], attach: 63 }
    ]
  },
  {
    id: 'sitemap:1',
    kind: 'sitemap',
    name: 'Property map *',
    building: null,
    floors: [],
    width: 1402,
    height: 870,
    scaleFtPerPx: 0.6,
    hallways: [],
    edges: [],
    corridors: [],
    labels: [
      { text: 'Tower A *', at: [378, 262] },
      { text: 'Tower B *', at: [1044, 292] },
      { text: 'Visitor Parking *', at: [760, 640] },
      { text: 'Clubhouse *', at: [1080, 262] }
    ],
    places: []
  }
];

/**
 * Outdoor walks between the gates of different buildings, drawn on the site
 * plan. The backend joins gates of different buildings with one outdoor edge
 * and no geometry; the polyline is the frontend's addition for drawing.
 */
export const OUTDOOR_LINKS: { from: string; to: string; polyline: [number, number][] }[] = [
  {
    from: 'bsp:1',
    to: 'bsp:2',
    polyline: [
      [378, 300],
      [603, 340],
      [820, 335],
      [1044, 330]
    ]
  },
  {
    from: 'stop:5',
    to: 'bsp:2',
    polyline: [
      [470, 520],
      [700, 470],
      [900, 400],
      [1044, 330]
    ]
  }
];

/** Where each gate stands on the site plan (for the markers of the outdoor stage). */
export const SITEMAP_GATES: Record<string, [number, number]> = {
  'bsp:1': [378, 300],
  'stop:5': [470, 520],
  'bsp:2': [1044, 330]
};

/** The main tour as Tour Setup would publish it: start → the visible stops in order → start. */
export const TOUR_STOPS: { node: string; durationMinutes: number }[] = [
  { node: 'amenity:1', durationMinutes: 3 },
  { node: 'amenity:3', durationMinutes: 4 },
  { node: 'amenity:4', durationMinutes: 3 },
  { node: 'unit:204', durationMinutes: 4 },
  { node: 'unit:101', durationMinutes: 4 },
  { node: 'amenity:2', durationMinutes: 3 },
  { node: 'unit:304', durationMinutes: 4 },
  { node: 'amenity:6', durationMinutes: 3 },
  { node: 'unit:311', durationMinutes: 4 },
  { node: 'amenity:7', durationMinutes: 3 }
];
