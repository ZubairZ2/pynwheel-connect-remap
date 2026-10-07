import type { Place } from '~/models';
import type { PropertyBundle } from './tourRepository';

const STOP_META: Record<string, string> = { entry: 'Entry Point', exit: 'Exit Point', mail: 'Mail & Packages', leasing: 'Leasing Office' };

/** Every place a route can start or end at, built from the bundle's inventory and graph (shared by both providers). */
export const placesFromBundle = (bundle: PropertyBundle): Place[] => {
  const { graph, units, amenities, stops } = bundle;
  const linkedOf = (node: string) => graph.nodes.some((n) => n.id === node && n.link !== false && !!n.attach);
  const places: Place[] = [];
  units.forEach((u) =>
    places.push({
      node: u.node,
      kind: 'unit',
      name: u.name,
      meta: u.bedrooms != null && u.bathrooms != null ? `${u.bedrooms} Bed · ${u.bathrooms} Bath` : 'Unit',
      building: u.building,
      floor: u.floor,
      floors: u.floor != null ? [u.floor] : [],
      level: u.level,
      linked: linkedOf(u.node),
      routable: true
    })
  );
  amenities.forEach((a) =>
    places.push({ node: a.node, kind: 'amenity', name: a.name, meta: 'Amenity', building: a.building, floor: a.floor, floors: a.floor != null ? [a.floor] : [], level: a.level, linked: linkedOf(a.node), routable: true })
  );
  stops.forEach((s) => {
    const vertical = graph.verticalConnections.find((v) => v.id === s.node);
    const label = s.kind.charAt(0).toUpperCase() + s.kind.slice(1);
    places.push({
      node: s.node,
      kind: 'stop',
      stopKind: s.kind,
      name: s.name,
      meta: STOP_META[s.kind] ?? label,
      building: s.building,
      floor: vertical ? null : s.floor,
      floors: vertical ? vertical.floors : s.floor != null ? [s.floor] : [],
      level: s.level,
      linked: linkedOf(s.node),
      routable: s.kind !== 'blocker'
    });
  });
  return places;
};
