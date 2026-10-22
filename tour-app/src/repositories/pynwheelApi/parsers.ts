import type { Amenity, AmenityIcon, Building, GraphNode, LeaseTerm, LockBluetoothKey, LockPin, MapLevel, Property, PropertyListing, Route, RouteLeg, RouteStage, RouteStep, StopLock, StopMedia, TourRoute, TourStopPlace, Unit, WayfindingGraph } from '~/models';
import { emptyMedia } from '~/models';
import type { StopKind } from '~/models';
import type { SessionVisitor } from '~/services/session';
import type { AvailabilityDay, AvailabilityWindow, BookingResult, BookingSettings, PropertyBundle, StopDistance, VisitEventsResult, VisitRecord, VisitorBooking } from '../tourRepository';
import { ApiError } from './apiClient';
import type { ApiAvailabilityDay, ApiAvailabilityResponse, ApiBookingCreateResponse, ApiBookingSettings, ApiDistancesResponse, ApiGraph, ApiLeg, ApiLevel, ApiLockBluetoothKeyResponse, ApiLockPinResponse, ApiMapResponse, ApiNode, ApiPropertyDetail, ApiPropertySummary, ApiRoute, ApiRouteStep, ApiStop, ApiStopLock, ApiStopsResponse, ApiTourRouteResponse, ApiVisit, ApiVisitEventsResponse, ApiVisitor, ApiVisitorBooking } from './apiTypes';

/**
 * snake_case API JSON → the camelCase models the screens consume. The only
 * place that knows the API's field names. Every optional field is read
 * defensively: a missing value becomes null or an empty list, never a crash.
 */

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const numOrNull = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const strOrNull = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
/** Text fields of the CMS may hold HTML (`directional_text`); the app shows text only. */
export const stripHtml = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const text = v
    .replace(/<\s*(br|\/p|\/div|\/li|\/tr)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
};

/** The stop's smart lock as the stops list reports it; null when the stop has none or the field is malformed. */
export const parseLock = (l: ApiStopLock | null | undefined): StopLock | null => {
  if (!l || typeof l !== 'object' || typeof l.provider !== 'string' || !l.provider) return null;
  return {
    provider: l.provider,
    mode: l.mode === 'v1' || l.mode === 'igloohome' || l.mode === 'iglooworks' ? l.mode : null,
    method: l.method === 'pin' || l.method === 'bluetooth' ? l.method : null,
    deviceId: strOrNull(l.device_id),
    supported: l.supported === true
  };
};

/** The stop's CMS media; every URL must be a string, every photo a URL, else it is left out. */
export const parseMedia = (m: ApiStop['media'] | null | undefined): StopMedia => {
  if (!m || typeof m !== 'object') return emptyMedia();
  return {
    image: strOrNull(m.image),
    floorplanImage: strOrNull(m.floorplan_image),
    photos: list<{ id: unknown; name: unknown; url: unknown }>(m.photos)
      .filter((p) => p && typeof p === 'object' && typeof p.url === 'string' && p.url)
      .map((p, i) => ({ id: typeof p.id === 'number' ? p.id : i, name: strOrNull(p.name), url: p.url as string })),
    virtualTourUrl: strOrNull(m.virtual_tour_url)
  };
};

/** Lease terms as the stops list serves them: positive months and rents only, sorted by term. */
export const parseLeaseTerms = (v: unknown): LeaseTerm[] =>
  list<{ months: unknown; rent: unknown }>(v)
    .filter((t) => t && typeof t === 'object' && typeof t.months === 'number' && t.months > 0 && typeof t.rent === 'number' && t.rent > 0)
    .map((t) => ({ months: t.months as number, rent: t.rent as number }))
    .sort((a, b) => a.months - b.months);

/** A "video" link that is really a 360° / virtual tour (Matterport and the like): shown as the 360° view, not as a video player. */
export const isVirtualTourLink = (url: string | null): boolean => !!url && /matterport\.com|kuula\.co|360|panorama|virtualtour|my\.matterport/i.test(url);

export const parseLockBluetoothKey = (body: ApiLockBluetoothKeyResponse, now = Date.now()): LockBluetoothKey => {
  const lockName = str(body.lock_name) || str(body.device_id);
  if (!lockName) throw new ApiError('malformed_response', 'The lock service answered without the lock to open. Please try again.', 200);
  return {
    lockName,
    key: str(body.bluetooth_key),
    keyId: strOrNull(body.key_id),
    guestPin: strOrNull(body.guest_pin),
    validFrom: strOrNull(body.valid_from),
    validUntil: strOrNull(body.valid_until),
    issuedAt: now
  };
};

export const parseLockPin = (body: ApiLockPinResponse, now = Date.now()): LockPin => ({ pin: str(body.pin), validFrom: strOrNull(body.valid_from), validUntil: strOrNull(body.valid_until), issuedAt: now });

const points = (v: unknown): [number, number][] => list<unknown>(v).filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number').map((p) => [p[0], p[1]]);

export const parseLevel = (l: ApiLevel): MapLevel => ({
  id: l.id,
  kind: l.kind === 'sitemap' ? 'sitemap' : 'floorplate',
  name: str(l.name, l.kind === 'sitemap' ? 'Property map' : 'Floor'),
  building: strOrNull(l.building),
  floors: list<number>(l.floors),
  image: strOrNull(l.image),
  svg: null, // the floor SVG is a file (`svgPath`), not inline geometry
  svgUrl: strOrNull(l.svg),
  svgPath: strOrNull(l.svg_path),
  svgTransform: l.svg_transform && ['a', 'b', 'c', 'd', 'e', 'f'].every((k) => typeof (l.svg_transform as Record<string, unknown>)[k] === 'number') ? l.svg_transform : null,
  svgSize: l.svg_size && typeof l.svg_size.width === 'number' && typeof l.svg_size.height === 'number' ? { width: l.svg_size.width, height: l.svg_size.height } : null,
  width: num(l.width, 0),
  height: num(l.height, 0),
  space: l.space === 'svg' ? 'svg' : 'raster',
  scaleFtPerPx: numOrNull(l.scale_ft_per_px),
  version: num(l.version, 0)
});

const parseNode = (n: ApiNode): GraphNode => ({
  id: n.id,
  kind: n.kind as GraphNode['kind'],
  level: n.level,
  floor: numOrNull(n.floor),
  building: strOrNull(n.building),
  name: strOrNull(n.name),
  x: num(n.x),
  y: num(n.y),
  anchor: n.anchor === 'icon_top_left' || n.anchor === 'door' ? n.anchor : 'point',
  attach: n.attach ?? null,
  link: n.link == null ? undefined : n.link === 'explicit' || n.link === 'nearest',
  stopKind: n.kind === 'hallway' || n.kind === 'unit' || n.kind === 'amenity' || n.kind === 'door' || n.kind === 'elevator' || n.kind === 'tour_start' ? undefined : (n.kind as StopKind),
  vertical: (n.vertical as GraphNode['vertical']) ?? undefined,
  accessible: n.accessible ?? undefined,
  floorsServed: n.floors_served ?? undefined,
  positions: n.positions ?? undefined,
  note: n.note ?? null,
  radiusPx: n.radius_px ?? null,
  lockProvider: n.lock_provider ?? null
});

export const parseGraph = (g: ApiGraph): WayfindingGraph => ({
  version: g.version,
  communityId: g.community_id,
  isSitemap: !!g.is_sitemap,
  autoWayfinding: !!g.auto_wayfinding,
  scale: { unit: 'px', ftPerPx: numOrNull(g.scale?.ft_per_px) },
  levels: list<ApiLevel>(g.levels).map(parseLevel),
  buildings: list<string>(g.buildings),
  nodes: list<ApiNode>(g.nodes).map(parseNode),
  edges: list<ApiGraph['edges'][number]>(g.edges).map((e) => ({ from: e.from, to: e.to, kind: 'walk', pathKind: str(e.path_kind, 'manual'), level: e.level, lengthPx: num(e.length_px), polyline: points(e.polyline) })),
  verticalConnections: list<ApiGraph['vertical_connections'][number]>(g.vertical_connections).map((v) => ({ id: v.id, kind: (v.kind as 'elevator' | 'stairs' | 'ramp') ?? 'elevator', floors: list<number>(v.floors), accessible: v.accessible !== false, levels: list<string>(v.levels) })),
  gates: list<ApiGraph['gates'][number]>(g.gates).map((x) => ({ id: x.id, building: strOrNull(x.building), kind: (x.kind as 'entry' | 'exit' | 'tour_start' | 'stop') ?? 'entry' })),
  outdoorLinks: [],
  tour: g.tour
    ? {
        id: g.tour.id,
        start: strOrNull(g.tour.start),
        startingFloor: numOrNull(g.tour.starting_floor),
        building: strOrNull(g.tour.building),
        buildingOrder: list<string>(g.tour.building_order),
        version: num(g.tour.version, 0),
        stops: list<NonNullable<ApiGraph['tour']>['stops'][number]>(g.tour.stops).map((s) => ({ tourStopId: s.tour_stop_id, node: strOrNull(s.node), stopType: str(s.stop_type), name: str(s.name), sort: num(s.sort, 1 << 30), visible: s.visible !== false, durationMinutes: numOrNull(s.duration_minutes), onMap: !!s.on_map }))
      }
    : null
});

const ICON_RULES: [RegExp, AmenityIcon][] = [
  [/gym|fitness|workout|weight|cardio/i, 'dumbbell'],
  [/pool|swim|spa|hot tub|water/i, 'wave'],
  [/yoga|wellness|meditat/i, 'yoga'],
  [/dog|pet|bark/i, 'dog'],
  [/garden|park|court|roof|terrace|patio|outdoor|lawn|green/i, 'leaf'],
  [/cafe|coffee|lounge|club|kitchen|dining|bar|game/i, 'coffee'],
  [/office|leasing|business|work|conference|study|mail|package/i, 'briefcase']
];

export const amenityIcon = (name: string, type: string | null): AmenityIcon => {
  const hay = `${type ?? ''} ${name}`;
  return ICON_RULES.find(([re]) => re.test(hay))?.[1] ?? 'star';
};

/** "Tower A · Floor 2", "Floor 2", "Property map". */
export const floorLabelOf = (levels: MapLevel[], levelId: string | null, floor: number | null): string => {
  const level = levels.find((l) => l.id === levelId);
  if (!level) return floor != null ? `Floor ${floor}` : '';
  if (level.kind === 'sitemap') return 'Property map';
  const name = floor != null ? `Floor ${floor}` : level.name;
  return level.building ? `${level.building} · ${name}` : name;
};

export interface ParsedProperty {
  bundle: PropertyBundle;
}

export const parseBundle = (detail: ApiPropertyDetail, graph: ApiGraph, stops: ApiStopsResponse, heroImage: string, map?: ApiMapResponse | null): PropertyBundle => {
  const wayfinding = parseGraph(graph);
  // The map endpoint carries what the graph payload (the Rails shape) does not: the SVG path and calibration per level.
  if (map && Array.isArray(map.levels)) {
    const extras = new Map(map.levels.map((l) => [l.id, parseLevel(l)]));
    wayfinding.levels = wayfinding.levels.map((l) => {
      const extra = extras.get(l.id);
      return extra ? { ...l, svgPath: extra.svgPath, svgTransform: extra.svgTransform, svgSize: extra.svgSize } : l;
    });
  }
  const levels = wayfinding.levels;
  const nodeById = new Map(wayfinding.nodes.map((n) => [n.id, n]));
  const floorLabels: Record<string, string> = {};
  const units: Unit[] = [];
  const amenities: Amenity[] = [];
  list<ApiStopsResponse['groups'][number]>(stops.groups).forEach((group) =>
    list<ApiStop>(group.stops).forEach((s) => {
      const node = nodeById.get(s.id);
      const level = s.level_id ?? node?.level ?? null;
      const floor = s.floor ?? node?.floor ?? null;
      floorLabels[s.id] = floorLabelOf(levels, level, floor);
      if (s.type === 'unit') {
        units.push({
          id: s.record_id,
          node: s.id,
          name: s.name,
          building: strOrNull(s.building),
          floor,
          level,
          bedrooms: numOrNull(s.unit?.bedrooms),
          bathrooms: numOrNull(s.unit?.bathrooms),
          sqft: numOrNull(s.unit?.square_feet),
          rent: numOrNull(s.unit?.rent),
          available: s.unit?.available !== false,
          availabilityKnown: typeof s.unit?.available === 'boolean',
          availability: strOrNull(s.unit?.availability),
          availableDate: strOrNull(s.unit?.available_date),
          unitType: strOrNull(s.unit?.unit_type),
          model: !!s.unit?.model,
          description: stripHtml(s.description) ?? stripHtml(s.instruction),
          polygon: null,
          showInStopsList: true,
          routable: !!s.routable,
          floorplanName: strOrNull(s.unit?.floorplan_name),
          lock: parseLock(s.lock),
          leaseTerms: parseLeaseTerms(s.unit?.lease_terms),
          deposit: numOrNull(s.unit?.deposit),
          additionalFee: stripHtml(s.unit?.additional_fee),
          media: { ...parseMedia(s.media), virtualTourUrl: strOrNull(s.media?.virtual_tour_url) ?? strOrNull(s.unit?.virtual_tour_url) }
        });
      } else {
        amenities.push({
          id: s.record_id,
          node: s.id,
          name: s.name,
          building: strOrNull(s.building),
          floor,
          level,
          icon: amenityIcon(s.name, s.amenity?.amenity_type ?? null),
          hours: null,
          description: stripHtml(s.description),
          instruction: stripHtml(s.instruction),
          polygon: null,
          showInStopsList: true,
          routable: !!s.routable,
          videoUrl: isVirtualTourLink(strOrNull(s.amenity?.video_url)) ? null : strOrNull(s.amenity?.video_url),
          lock: parseLock(s.lock),
          media: { ...parseMedia(s.media), virtualTourUrl: strOrNull(s.media?.virtual_tour_url) ?? (isVirtualTourLink(strOrNull(s.amenity?.video_url)) ? strOrNull(s.amenity?.video_url) : null) }
        });
      }
    })
  );
  // Additional stops and connectors come from the graph: entries, exits, elevators, stairs, doors, leasing, restrooms …
  const places: TourStopPlace[] = wayfinding.nodes
    .filter((n) => !['hallway', 'unit', 'amenity'].includes(n.kind))
    .filter((n, i, all) => all.findIndex((m) => m.id === n.id) === i)
    .map((n) => {
      const kind: StopKind = n.kind === 'elevator' ? ((n.vertical as StopKind) ?? 'elevator') : n.kind === 'tour_start' ? 'entry' : (n.kind as StopKind);
      floorLabels[n.id] = floorLabelOf(levels, n.level, n.floor);
      return {
        id: Number(n.id.split(':')[1]) || 0,
        node: n.id,
        kind,
        name: n.name ?? (n.kind === 'tour_start' ? 'Tour start' : kind),
        building: n.building,
        floor: n.floor,
        level: n.level,
        destination: !['elevator', 'stairs', 'ramp', 'blocker'].includes(kind),
        accessible: n.accessible !== false,
        note: stripHtml(n.note)
      };
    });
  const buildings: Building[] = wayfinding.buildings.map((name) => ({ name, levels: levels.filter((l) => l.building === name).map((l) => l.id) }));
  if (!buildings.length && levels.length) buildings.push({ name: detail.name, levels: levels.map((l) => l.id) });
  const property: Property = {
    id: detail.id,
    name: detail.name,
    address: [detail.address, detail.city, detail.state].filter(Boolean).join(', '),
    city: str(detail.city),
    heroImage: levels.find((l) => l.image)?.image ?? heroImage,
    isSitemap: !!detail.is_sitemap,
    autoWayfinding: !!detail.auto_wayfinding,
    floorsCount: new Set(levels.flatMap((l) => l.floors)).size || levels.length,
    unitsCount: num(detail.units_count),
    amenitiesCount: num(detail.amenities_count),
    tourEnabled: !!detail.tour_enabled,
    phone: strOrNull(detail.phone),
    email: strOrNull(detail.email)
  };
  return { property, buildings, levels, graph: wayfinding, units, amenities, stops: places, arPins: {}, floorLabels, demo: false };
};

export const parseListing = (p: ApiPropertySummary, currentId: number | null): PropertyListing => ({
  id: p.id,
  name: p.name,
  address: [p.address, p.city, p.state].filter(Boolean).join(', ') || (p.company ?? ''),
  current: p.id === currentId,
  tourable: !!p.tour_enabled
});

const parseLeg = (l: ApiLeg): RouteLeg =>
  l.kind === 'walk'
    ? { index: l.index, kind: 'walk', level: str(l.level), floor: numOrNull(l.floor), building: strOrNull(l.building), from: l.from, to: l.to, lengthPx: num(l.length_px), points: points(l.points), nodes: list<string>(l.nodes) }
    : { index: l.index, kind: l.kind, via: str(l.via), name: strOrNull(l.name), floorFrom: numOrNull(l.floor_from), floorTo: numOrNull(l.floor_to), from: l.from, to: l.to, lengthPx: num(l.length_px) };

const parseStep = (s: ApiRouteStep): RouteStep => ({
  kind: s.type,
  leg: num(s.leg),
  title: str(s.title),
  sub: s.instruction && s.type === 'arrive' ? `${s.description} · ${stripHtml(s.instruction) ?? ''}`.replace(/ · $/, '') : str(s.description),
  dwellS: s.dwell_s ?? undefined,
  via: strOrNull(s.transition?.via),
  instruction: stripHtml(s.instruction)
});

/** A route answer whose `route` is missing or not an object is unusable: a typed error the screens can show, never a TypeError. */
const requireRoute = (r: ApiRoute | null | undefined): ApiRoute => {
  if (!r || typeof r !== 'object') throw new ApiError('malformed_response', 'The route service answered without a route. Please try again.', 200);
  return r;
};

export const parseRoute = (route: ApiRoute | null | undefined): Route => {
  const r = requireRoute(route);
  return {
    from: r.start?.id ?? '',
    to: r.destination?.id ?? '',
    stepFree: !!r.step_free,
    avoidBlockers: r.avoid_blockers !== false,
    lengthPx: num(r.total_distance),
    lengthFt: numOrNull(r.total_distance_ft),
    durationS: numOrNull(r.duration_s),
    legs: list<ApiLeg>(r.legs).map(parseLeg),
    steps: list<ApiRouteStep>(r.steps).map(parseStep),
    warnings: list<string>(r.warnings),
    stages: list<ApiRoute['stages'][number]>(r.stages).map((s): RouteStage => ({ level: s.level_id, floor: numOrNull(s.floor), building: strOrNull(s.building), leg: num(s.leg) }))
  };
};

export const parseTourRoute = (body: ApiTourRouteResponse | null | undefined): TourRoute => {
  if (!body || typeof body !== 'object') throw new ApiError('malformed_response', 'The route service answered without a route. Please try again.', 200);
  return {
    route: parseRoute(body.route),
    segments: list<ApiTourRouteResponse['segments'][number]>(body.segments).map((s) => ({ node: s.stop_id, from: s.from_stop_id, route: parseRoute(s.route) }))
  };
};

export const parseDistances = (body: ApiDistancesResponse): Record<string, StopDistance> => {
  const out: Record<string, StopDistance> = {};
  Object.entries(body.distances ?? {}).forEach(([node, d]) => {
    out[node] = d.reachable ? { lengthPx: num(d.distance), lengthFt: numOrNull(d.distance_ft), durationS: numOrNull(d.duration_s), direction: d.direction ?? 'level', unreachable: null } : { lengthPx: 0, lengthFt: null, durationS: null, direction: 'level', unreachable: d.error?.message ?? 'No path connects the tour start to this stop.' };
  });
  return out;
};

// ---- booking ----
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);

export const parseBookingSettings = (s: ApiBookingSettings): BookingSettings => {
  const gates = list<{ ok?: unknown; error?: unknown }>(s.gates);
  const failing = gates.find((g) => g && g.ok === false);
  return {
    propertyId: num(s.property_id),
    timeZone: str(s.time_zone, 'UTC'),
    bookable: bool(s.bookable, false),
    schedulerEnabled: bool(s.scheduler_enabled, true),
    gateError: failing ? strOrNull(failing.error) : null,
    tourTypes: { selfTour: bool(s.tour_types?.self_tour, false), guidedTour: bool(s.tour_types?.guided_tour, false) },
    slotIntervalMinutes: num(s.slot_interval_minutes, 15),
    onlyScheduledTour: bool(s.only_scheduled_tour, false),
    gracePeriod: numOrNull(s.grace_period),
    lengthStayLimit: numOrNull(s.length_stay_limit),
    window: { bufferMinutes: num(s.window?.buffer_minutes), minimumNoticeMinutes: num(s.window?.minimum_notice_minutes), bookingHorizonDays: numOrNull(s.window?.booking_horizon_days) },
    app: {
      afterHoursLabel: bool(s.app?.after_hours_label, true),
      allowShorterTour: bool(s.app?.allow_shorter_tour, true),
      partySizeLimit: Math.max(1, num(s.app?.party_size_limit, 6)),
      askUnit: bool(s.app?.ask_unit, true),
      showTextBooking: bool(s.app?.show_text_booking, true)
    },
    form: { showDesiredBedroom: bool(s.form?.show_desired_bedroom, false), showDesiredMoveInDate: bool(s.form?.show_desired_move_in_date, false), creditCardRequired: bool(s.form?.credit_card_required, false) },
    closures: list<{ date?: unknown; label?: unknown; closed_all_day?: unknown }>(s.closures)
      .filter((c) => typeof c?.date === 'string')
      .map((c) => ({ date: str(c.date), label: strOrNull(c.label), closedAllDay: bool(c.closed_all_day, true) })),
    linkUrl: strOrNull(s.link?.url)
  };
};

export const parseAvailabilityDay = (d: ApiAvailabilityDay): AvailabilityDay => ({
  date: str(d.date),
  closed: bool(d.closed, false),
  beyondHorizon: bool(d.beyond_horizon, false),
  closureLabel: strOrNull(d.closure?.label),
  slots: list<{ time?: unknown; label?: unknown; types?: unknown; full?: unknown }>(d.slots)
    .filter((x) => typeof x?.time === 'string' && typeof x?.label === 'string')
    .map((x) => ({ time: str(x.time), label: str(x.label), types: list<string>(x.types).filter((t) => typeof t === 'string'), full: list<string>(x.full).filter((t) => typeof t === 'string') }))
});

export const parseAvailability = (a: ApiAvailabilityResponse): AvailabilityWindow => ({
  timeZone: str(a.time_zone, 'UTC'),
  now: str(a.now),
  intervalMinutes: num(a.interval_minutes, 15),
  lastBookableDate: strOrNull(a.last_bookable_date),
  days: list<ApiAvailabilityDay>(a.days).filter((d) => typeof d?.date === 'string').map(parseAvailabilityDay)
});

export const parseBookingResult = (r: ApiBookingCreateResponse): BookingResult => {
  const b = r?.booking;
  if (!b || typeof b !== 'object' || typeof b.id !== 'number') throw new ApiError('malformed_response', 'The booking service answered without a booking. Please try again.', 200);
  return {
    id: String(b.id),
    status: str(b.status, 'upcoming'),
    date: str(b.tour_date),
    time: str(b.tour_time),
    timeLabel: str(b.tour_time_label),
    endTime: strOrNull(b.end_time),
    tourType: str(b.tour_type, 'self_tour'),
    rescheduled: bool(b.rescheduled, false),
    visitorId: numOrNull(r.visitor?.id)
  };
};

// ---- the visitor sign-in and visits (October 23, 2026) ----
export const parseVisitor = (v: ApiVisitor): SessionVisitor => {
  if (!v || typeof v !== 'object' || typeof v.id !== 'number') throw new ApiError('malformed_response', 'The sign-in answer was incomplete. Please try again.', 200);
  const first = str(v.first_name).trim();
  const last = str(v.last_name).trim();
  return {
    id: v.id,
    firstName: first,
    lastName: last,
    name: str(v.name).trim() || `${first} ${last}`.trim(),
    email: str(v.email).trim(),
    phone: str(v.phone_number),
    phoneMasked: strOrNull(v.phone_masked),
    smsEnabled: bool(v.is_sms_enabled, true)
  };
};

export const parseVisitorBooking = (b: ApiVisitorBooking): VisitorBooking => ({
  id: num(b.id),
  propertyId: num(b.property_id),
  propertyName: strOrNull(b.property_name),
  status: str(b.status, 'upcoming'),
  date: strOrNull(b.tour_date),
  time: strOrNull(b.tour_time),
  timeLabel: strOrNull(b.tour_time_label),
  endTime: strOrNull(b.end_time),
  tourType: strOrNull(b.tour_type),
  createdBy: strOrNull(b.created_by)
});

export const parseVisitorBookings = (raw: unknown): VisitorBooking[] =>
  list<ApiVisitorBooking>(raw)
    .filter((b) => b && typeof b.id === 'number' && typeof b.property_id === 'number')
    .map(parseVisitorBooking);

export const parseVisit = (v: ApiVisit | null | undefined): VisitRecord => {
  if (!v || typeof v !== 'object' || typeof v.id !== 'number') throw new ApiError('malformed_response', 'The server answered without a visit. Please try again.', 200);
  return {
    id: v.id,
    status: str(v.status, 'in_progress'),
    tourKey: strOrNull(v.tour_key),
    tourType: strOrNull(v.tour_type),
    bookingId: numOrNull(v.booking_id),
    startedAt: strOrNull(v.started_at),
    endedAt: strOrNull(v.ended_at),
    active: bool(v.active, false),
    accessEndsAt: strOrNull(v.access_window?.ends_at),
    accessMinutes: numOrNull(v.access_window?.minutes),
    verificationRequired: bool(v.verification_required, false),
    created: bool(v.created, true)
  };
};

export const parseVisitEvents = (r: ApiVisitEventsResponse): VisitEventsResult => ({
  accepted: list<ApiVisitEventsResponse['accepted'][number]>(r?.accepted).map((a) => ({ index: num(a.index, -1), clientEventId: strOrNull(a.client_event_id), kind: str(a.kind), id: numOrNull(a.id), duplicate: bool(a.duplicate, false) })),
  rejected: list<ApiVisitEventsResponse['rejected'][number]>(r?.rejected).map((x) => ({ index: num(x.index, -1), clientEventId: strOrNull(x.client_event_id), code: str(x.code, 'rejected'), message: str(x.message) }))
});
