/** The Tour App API's JSON (snake_case), as `tour-api/app/schemas` defines it. Parsed into `~/models` by `parsers.ts`. */

export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface ApiLoginResponse {
  success: true;
  access_token: string;
  token_type: string;
  expires_at: string | null;
  user: ApiUser;
}

export interface ApiPropertySummary {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  company: string | null;
  tour_enabled: boolean;
  is_sitemap: boolean;
}

export interface ApiPropertyDetail extends ApiPropertySummary {
  auto_wayfinding: boolean;
  floorplates_count: number;
  units_count: number;
  amenities_count: number;
  buildings: string[];
  tour: { id: number; start_node: string | null; starting_floor: number | null; building: string | null; building_order: string[]; stops_total: number } | null;
  graph_version: string | null;
}

export interface ApiLevel {
  id: string;
  kind: 'floorplate' | 'sitemap';
  name: string | null;
  building: string | null;
  floors: number[];
  image: string | null;
  svg: string | null;
  width: number | null;
  height: number | null;
  space: string;
  scale_ft_per_px: number | null;
  version: number | null;
  svg_path?: string | null;
  svg_transform?: { a: number; b: number; c: number; d: number; e: number; f: number } | null;
  svg_size?: { width: number | null; height: number | null } | null;
}

export interface ApiMapResponse {
  success: true;
  property_id: number;
  graph_version: string;
  is_sitemap: boolean;
  auto_wayfinding: boolean;
  buildings: { name: string; level_ids: string[] }[];
  levels: ApiLevel[];
}

export interface ApiNode {
  id: string;
  kind: string;
  level: string;
  floor: number | null;
  building: string | null;
  name: string | null;
  x: number;
  y: number;
  anchor: 'icon_top_left' | 'door' | 'point';
  review?: string | null;
  attach?: string | null;
  link?: string | null;
  lock_provider?: string | null;
  note?: string | null;
  vertical?: string | null;
  accessible?: boolean | null;
  floors_served?: number[] | null;
  positions?: Record<string, { x: number; y: number }> | null;
  radius_px?: number | null;
}

export interface ApiEdge {
  from: string;
  to: string;
  kind: 'walk';
  path_kind: string;
  level: string;
  length_px: number;
  polyline: [number, number][];
}

export interface ApiGraph {
  success: true;
  version: string;
  community_id: number;
  is_sitemap: boolean;
  auto_wayfinding: boolean;
  scale: { unit: 'px'; ft_per_px: number | null };
  levels: ApiLevel[];
  buildings: string[];
  nodes: ApiNode[];
  edges: ApiEdge[];
  vertical_connections: { id: string; kind: string; floors: number[]; accessible: boolean | null; levels: string[] }[];
  gates: { id: string; building: string | null; kind: string }[];
  tour: { id: number; start: string | null; starting_floor: number | null; building: string | null; building_order: string[]; version: number | null; stops: { tour_stop_id: number; node: string | null; stop_type: string | null; name: string | null; sort: number | null; visible: boolean; duration_minutes: number | null; on_map: boolean }[] } | null;
}

export interface ApiStop {
  id: string;
  type: 'unit' | 'amenity';
  record_id: number;
  tour_stop_id: number;
  name: string;
  description: string | null;
  instruction: string | null;
  building: string | null;
  floor: number | null;
  level_id: string | null;
  floorplate_id: number | null;
  location: { x: number; y: number } | null;
  map_node_id: string | null;
  routable: boolean;
  sort: number | null;
  duration_minutes: number | null;
  unit: { bedrooms: number | null; bathrooms: number | null; square_feet: number | null; rent: number | null; available: boolean | null; model: boolean; floorplan_name: string | null } | null;
  amenity: { amenity_type: string | null; video_url: string | null; video_button_label: string | null } | null;
}

export interface ApiStopsResponse {
  success: true;
  property_id: number;
  graph_version: string;
  tour_id: number | null;
  start_node: string | null;
  groups: { key: 'amenities' | 'floorplans'; label: string; stops: ApiStop[] }[];
  total: number;
}

export interface ApiPlaceRef {
  id: string;
  type: string | null;
  name: string | null;
}

export interface ApiRouteStep {
  sequence: number;
  type: 'walk' | 'elevator' | 'stairs' | 'ramp' | 'outdoor' | 'arrive';
  title: string;
  description: string;
  instruction: string | null;
  distance: number;
  unit: 'px';
  distance_ft: number | null;
  floor: { level_id: string | null; number: number | null; name: string } | null;
  from: ApiPlaceRef | null;
  to: ApiPlaceRef | null;
  leg: number;
  geometry: [number, number][];
  transition: { kind: string; via: string | null; name: string | null; floor_from: number | null; floor_to: number | null; from_level_id: string | null; to_level_id: string | null } | null;
  dwell_s?: number | null;
}

export type ApiLeg =
  | { index: number; kind: 'walk'; level: string | null; floor: number | null; building: string | null; from: string; to: string; length_px: number; points: [number, number][]; nodes: string[] }
  | { index: number; kind: 'elevator' | 'stairs' | 'ramp' | 'outdoor'; via: string | null; name: string | null; floor_from: number | null; floor_to: number | null; from: string; to: string; length_px: number };

export interface ApiRoute {
  start: ApiPlaceRef;
  destination: ApiPlaceRef;
  step_free: boolean;
  avoid_blockers: boolean;
  total_distance: number;
  unit: 'px';
  total_distance_ft: number | null;
  duration_s: number | null;
  floors: { level_id: string | null; number: number | null; name: string }[];
  buildings: string[];
  stages: { level_id: string; floor: number | null; building: string | null; leg: number }[];
  legs: ApiLeg[];
  steps: ApiRouteStep[];
  warnings: string[];
}

export interface ApiRouteResponse {
  success: true;
  graph_version: string;
  route: ApiRoute;
}

export interface ApiTourRouteResponse {
  success: true;
  graph_version: string;
  route: ApiRoute;
  segments: { stop_id: string; tour_stop_id: number | null; from_stop_id: string; route: ApiRoute }[];
  skipped: string[];
}

export interface ApiDistancesResponse {
  success: true;
  graph_version: string;
  from_stop_id: string | null;
  distances: Record<string, { reachable: boolean; distance: number; unit: 'px'; distance_ft: number | null; duration_s: number | null; direction: 'up' | 'down' | 'level'; error: { code: string; message: string } | null }>;
}
