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
    listing: '/communities.json'
  }
} as const;

/** Base URL of the existing Pynwheel CMS (Rails) application. */
export const baseURLGenerator = (): string =>
  (process.env.PYNWHEEL_CMS_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');

export const railsURL = (path: string): string => `${baseURLGenerator()}${path}`;

/** Client-side routes of this app. */
export const APP_ROUTES = {
  signIn: '/sign-in',
  companies: '/companies',
  properties: '/properties'
} as const;
