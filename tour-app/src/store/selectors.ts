import type { Amenity, Place, Unit } from '~/models';
import type { PropertyBundle, StopDistance } from '~/repositories/tourRepository';
import type { AppState } from './appState';

/**
 * Derived views of the state the screens share. Pure functions of the
 * state and the loaded bundle; nothing here reads dummy data directly.
 * Labels derived from demo data carry the ` *` marker; real data never does.
 */

export type StopKindLabel = 'unit' | 'amenity';

export interface TourStopView {
  node: string;
  kind: StopKindLabel;
  name: string;
  /** "1st Floor" for an amenity, "2 Bed · 2 Bath" for a unit (as the reference's `floorLabel`). */
  floorLabel: string;
  /** The level's floor label ("Floor 1", "Tower A · Floor 2"). */
  floor: string;
  icon: Amenity['icon'] | 'bed';
  /** Minutes the tour dwells here. */
  duration: number;
  unit: Unit | null;
  amenity: Amenity | null;
  arPin: { top: string; left: string } | null;
}

const ordinal = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/** The demo marker for derived labels: ` *` on demo data, nothing on real data. */
export const markOf = (bundle: PropertyBundle | null | undefined): string => (bundle?.demo ? ' *' : '');

export const floorText = (floor: number | null, fallback: string, mark = ''): string => {
  if (floor == null) return fallback;
  if (mark && floor === 15) return `Rooftop${mark}`; // the demo property's rooftop floor
  return `${ordinal(floor)} Floor${mark}`;
};

/** "2 Bed · 2 Bath" when the floor plan says so, else the floor plan's name or "Unit". */
export const unitLabel = (unit: Unit, mark = ''): string => {
  if (unit.bedrooms != null && unit.bathrooms != null) return `${unit.bedrooms} Bed · ${unit.bathrooms} Bath${mark}`;
  return `${unit.floorplanName ?? 'Unit'}${mark}`;
};

/** Every unit and amenity the visitor may put on a tour, as stop cards. */
export const tourStopViews = (bundle: PropertyBundle): TourStopView[] => {
  const mark = markOf(bundle);
  const dwell = new Map((bundle.graph.tour?.stops ?? []).map((s) => [s.node, s.durationMinutes ?? null]));
  const views: TourStopView[] = [];
  bundle.amenities
    .filter((a) => a.showInStopsList)
    .forEach((a) =>
      views.push({
        node: a.node,
        kind: 'amenity',
        name: a.name,
        floorLabel: bundle.demo ? floorText(a.floor, bundle.floorLabels[a.node] ?? '', mark) : (bundle.floorLabels[a.node] ?? floorText(a.floor, '')),
        floor: bundle.floorLabels[a.node] ?? '',
        icon: a.icon,
        duration: dwell.get(a.node) ?? 3,
        unit: null,
        amenity: a,
        arPin: bundle.arPins[a.node] ?? null
      })
    );
  bundle.units
    .filter((u) => u.showInStopsList)
    .forEach((u) =>
      views.push({
        node: u.node,
        kind: 'unit',
        name: u.name,
        floorLabel: unitLabel(u, mark),
        floor: bundle.floorLabels[u.node] ?? '',
        icon: 'bed',
        duration: dwell.get(u.node) ?? 4,
        unit: u,
        amenity: null,
        arPin: bundle.arPins[u.node] ?? null
      })
    );
  return views;
};

export const stopViewOf = (bundle: PropertyBundle, node: string): TourStopView | null => tourStopViews(bundle).find((v) => v.node === node) ?? null;

export const currentStop = (state: AppState, bundle: PropertyBundle): TourStopView | null => {
  const node = state.tourOrder[state.stopIndex];
  return node ? stopViewOf(bundle, node) : null;
};

export const tourStopsInOrder = (state: AppState, bundle: PropertyBundle): TourStopView[] => state.tourOrder.map((n) => stopViewOf(bundle, n)).filter((v): v is TourStopView => !!v);

/** The chosen stops that exist on the current property: a selection persisted for another property (or a stop removed from the list since) never reaches a route request. */
export const selectedNodes = (state: AppState, bundle?: PropertyBundle | null): string[] => {
  const chosen = Object.entries(state.selected).filter(([, on]) => on).map(([node]) => node);
  if (!bundle) return chosen;
  const known = new Set(tourStopViews(bundle).map((v) => v.node));
  return chosen.filter((node) => known.has(node));
};

export const placeByNode = (places: Place[], node: string | null): Place | null => (node ? (places.find((p) => p.node === node) ?? null) : null);

/** Distance and time of the segment that reaches the current stop ("240 ft", 4). */
export const currentSegment = (state: AppState) => state.guided.tour?.segments[state.stopIndex] ?? null;

export const bestMatchUnit = (state: AppState, bundle: PropertyBundle): Unit | null => {
  const visited = state.tourOrder.map((n) => bundle.units.find((u) => u.node === n)).filter((u): u is Unit => !!u);
  const available = visited.find((u) => u.available) ?? visited[0];
  return available ?? bundle.units.find((u) => u.showInStopsList && u.available) ?? bundle.units[0] ?? null;
};

export const unitMeta = (unit: Unit, mark = ''): string => {
  const parts: string[] = [];
  if (unit.bedrooms != null && unit.bathrooms != null) parts.push(`${unit.bedrooms} Bed · ${unit.bathrooms} Bath`);
  else if (unit.floorplanName) parts.push(unit.floorplanName);
  if (unit.sqft != null) parts.push(`${unit.sqft.toLocaleString('en-US')} sq.ft`);
  return `${parts.join(' · ') || 'Unit'}${mark}`;
};

export const unitPrice = (unit: Unit, mark = ''): string => (unit.rent != null ? `$${unit.rent.toLocaleString('en-US')}/mo${mark}` : `Call for pricing${mark}`);

/** "45 ft" / "240 ft ↑" from a stop distance; "—" while unknown, "no path" when unreachable. */
export const distanceLabel = (distance: StopDistance | undefined, arrow = false): string => {
  if (!distance) return '—';
  if (distance.unreachable) return 'no path yet';
  const length = distance.lengthFt != null ? `${Math.round(distance.lengthFt)} ft` : `${Math.round(distance.lengthPx)} px`;
  if (!arrow) return length;
  return `${length} ${distance.direction === 'up' ? '↑' : distance.direction === 'down' ? '↓' : '→'}`;
};
