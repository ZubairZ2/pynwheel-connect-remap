import 'server-only';

import { createHash } from 'node:crypto';

import type { ApiResponse } from './api/base.api';

/**
 * A short memory of a property's floorplates listing, per signed-in session.
 *
 * The Map & Plotting page reads `floorplates.json` once to build its model;
 * the browser then asks this app's `plan-svg` route for the floor SVG (and,
 * on a Beans property, the shared background), and each of those requests
 * used to read the same listing again only to learn the stored file's URL —
 * the full serializer (unit counts, buildings, lock devices, markers) for one
 * URL, two or three times per map open, and once more on every floor switch
 * (performance audit, October 11, 2026: C1).
 *
 * The page's loader remembers the listing it just received, keyed by the
 * session cookie it was fetched with and the property id, and the route reads
 * it back for a minute. The key is the session, so one user never sees
 * another's listing, and a listing is only ever remembered after Rails
 * answered 200 for that user (the scope check has passed). A Retry on the
 * canvas bypasses the memory (`fresh=1`), so a file replaced in the CMS is
 * re-resolved on demand; otherwise a replaced file is picked up within the
 * minute, as the listing itself would be re-read.
 */
const TTL_MS = 60_000;
const MAX_ENTRIES = 200;

interface Entry {
  expires: number;
  body: unknown;
}

const store = new Map<string, Entry>();

const keyOf = (cookie: string, propertyId: number): string =>
  `${createHash('sha256').update(cookie).digest('hex').slice(0, 32)}:${propertyId}`;

const sweep = () => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.expires <= now) store.delete(key);
  });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
};

/** Remembers a 200 listing body for this session and property. Anything else is ignored. */
export const rememberFloorplatesListing = (cookie: string | null, propertyId: number, response: ApiResponse): void => {
  if (!cookie || !response.ok || response.status !== 200 || response.body == null) return;
  sweep();
  store.delete(keyOf(cookie, propertyId));
  store.set(keyOf(cookie, propertyId), { expires: Date.now() + TTL_MS, body: response.body });
};

/** The remembered listing body for this session and property, or null when there is none (or it has aged out). */
export const recallFloorplatesListing = (cookie: string | null, propertyId: number): unknown | null => {
  if (!cookie) return null;
  const entry = store.get(keyOf(cookie, propertyId));
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    store.delete(keyOf(cookie, propertyId));
    return null;
  }
  return entry.body;
};

export const forgetFloorplatesListing = (cookie: string | null, propertyId: number): void => {
  if (cookie) store.delete(keyOf(cookie, propertyId));
};
