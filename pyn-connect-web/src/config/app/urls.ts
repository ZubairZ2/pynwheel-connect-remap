/**
 * Every Rails endpoint the app talks to, in one place — the `CORE_URLS` +
 * `baseURLGenerator` convention from react-architecture.md §10.
 *
 * Paths are legacy Rails controller paths, not a designed REST API, which is
 * exactly why they are centralised here instead of inlined in feature code.
 */
export const CORE_URLS = {
  auth: {
    signIn: '/users/sign_in',
    signOut: '/users/sign_out'
  },
  companies: {
    listing: '/companies.json'
  },
  properties: {
    // The Properties tab is the communities listing.
    listing: '/communities.json',
    // CommunitiesController#edit (the legacy Property Details page), as JSON.
    detail: (propertyId: number) => `/communities/${propertyId}/edit.json`
  },
  // One property's inventory: the legacy listings' `format.json` branches.
  inventory: {
    floorplates: (propertyId: number) => `/communities/${propertyId}/floorplates.json`,
    floorplans: (propertyId: number) => `/communities/${propertyId}/floorplans.json`,
    units: (propertyId: number) => `/communities/${propertyId}/units.json`,
    amenities: (propertyId: number) => `/communities/${propertyId}/amenities.json`
  },
  // The legacy Auto Wayfinding page (AutomatePlottingController), as JSON:
  // the pathway graph, elevators, starting points and tour stops, and the
  // routing algorithm it runs (a read; it persists nothing).
  wayfinding: {
    graph: (propertyId: number) => `/automate_plotting.json?community_id=${propertyId}`,
    route: (propertyId: number, pathType: 'sorting' | 'actual shortest') =>
      `/automate_plotting/shortest_path.json?community_id=${propertyId}&path_type=${encodeURIComponent(pathType)}`,
    /** A route between two places on the persisted graph (`Wayfinding::RouteService`), the same answer the Tour App gets. GET, read-only. */
    path: (propertyId: number, params: { from: string; to: string; stepFree: boolean; fromFloor?: number | null; toFloor?: number | null }) => {
      const query = new URLSearchParams({ community_id: String(propertyId), from: params.from, to: params.to, step_free: params.stepFree ? '1' : '0' });
      if (params.fromFloor != null) query.set('from_floor', String(params.fromFloor));
      if (params.toFloor != null) query.set('to_floor', String(params.toFloor));
      return `/automate_plotting/shortest_path.json?${query.toString()}`;
    },
    /** One-transaction save of one level's graph (`HallwaysController#save_graph`, Wayfinding::GraphSave). PUT. */
    saveGraph: (propertyId: number) => `/communities/${propertyId}/wayfinding_graph.json`,
    /** One-transaction save of the Tour Setup screen (`ToursController#save_setup`, TourSetup::Save). PUT. */
    saveTourSetup: (propertyId: number) => `/communities/${propertyId}/tours/save_setup.json`,
    /** The Unit / Amenity "Show in Stops List" toggle (`ToursController#stop_list`, TourStops::Membership). PUT. */
    stopList: (propertyId: number) => `/communities/${propertyId}/tours/stop_list.json`
  }
} as const;

/** This app's own route handlers the browser calls (never Rails directly). */
export const APP_API = {
  /** One page of the Companies / Properties listing for a query string (the same parameters the pages read). GET, read-only. */
  companiesListing: '/api/listings/companies',
  propertiesListing: '/api/listings/properties',
  /** A property's units listing, parsed; the Property Inventory reads it on demand. GET, read-only. */
  inventoryUnits: (propertyId: number) => `/api/properties/${propertyId}/inventory/units`,
  /** Runs the CMS routing algorithm for a property; GET, read-only. */
  wayfindingRoute: (propertyId: number) => `/api/properties/${propertyId}/wayfinding-route`,
  /** A route between two places on the saved graph, as the Tour App would get it; GET, read-only. */
  wayfindingPath: (propertyId: number) => `/api/properties/${propertyId}/wayfinding-path`,
  /** Saves one level's wayfinding graph (points, paths, bridges, pins, additional stops) in one transaction. PUT. */
  mapSave: (propertyId: number) => `/api/properties/${propertyId}/map/save`,
  /** Saves the Tour Setup screen (stops added, removed, hidden, reordered, timed; elevators deleted). PUT. */
  tourSetupSave: (propertyId: number) => `/api/properties/${propertyId}/tour-setup/save`,
  /** Turns a unit or amenity on or off in the Self-Guided Tour's stop list. PUT. */
  stopList: (propertyId: number) => `/api/properties/${propertyId}/stop-list`,
  /**
   * The floor SVG of one of the property's floorplates (or its property map),
   * fetched by this server from where the CMS stores it and handed to the
   * browser as `image/svg+xml`, so the Map & Plotting canvas can read its
   * polygons (the stored S3 file carries no CORS headers for this origin).
   * GET, read-only.
   */
  planSvg: (propertyId: number, level: { kind: 'floorplate' | 'sitemap'; id: number }) =>
    `/api/properties/${propertyId}/plan-svg?${level.kind}=${level.id}`
} as const;

/**
 * Legacy CMS pages a Connect screen sends the user to in the browser, for work
 * Connect cannot do yet. Null when `NEXT_PUBLIC_CMS_URL` is not set, since
 * there is then nowhere to send them.
 */
export const legacyCmsURLs = {
  /** CommunitiesController#edit, the legacy "Property Details" form. */
  propertyDetails: (companyId: number, propertyId: number): string | null =>
    legacyCmsURL(`/companies/${companyId}/communities/${propertyId}/edit`)
};

const legacyCmsURL = (path: string): string | null => {
  const base = process.env.NEXT_PUBLIC_CMS_URL;
  return base ? `${base.replace(/\/$/, '')}${path}` : null;
};

/** Base URL of the existing Pynwheel CMS (Rails) application. */
export const baseURLGenerator = (): string =>
  (process.env.PYNWHEEL_CMS_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

export const railsURL = (path: string): string => `${baseURLGenerator()}${path}`;

/** Client-side routes of this app. */
export const APP_ROUTES = {
  signIn: '/sign-in',
  dashboard: '/dashboard',
  companies: '/companies',
  properties: '/properties'
} as const;
