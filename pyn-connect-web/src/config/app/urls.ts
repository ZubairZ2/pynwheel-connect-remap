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
      `/automate_plotting/shortest_path.json?community_id=${propertyId}&path_type=${encodeURIComponent(pathType)}`
  }
} as const;

/** This app's own route handlers the browser calls (never Rails directly). */
export const APP_API = {
  /** Runs the CMS routing algorithm for a property; GET, read-only. */
  wayfindingRoute: (propertyId: number) => `/api/properties/${propertyId}/wayfinding-route`
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
