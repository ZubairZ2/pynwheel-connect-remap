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
  }
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
