import 'server-only';

import type { Property } from '~/core/models/data/property.data';
import { parseListingMeta } from '~/core/repository/parser/envelope.parser';
import { parseProperties } from '~/core/repository/parser/property.parser';
import type { ApiResponse } from './api/base.api';
import { fetchProperties } from './api/properties.api';

/** The most rows Rails serves per page (`Connect::PaginatedCollection::MAX_PER_PAGE`). */
const LOOKUP_PAGE_SIZE = 100;

export type PropertyLookup =
  | { status: 'found'; property: Property }
  | { status: 'missing' }
  | { status: 'unauthorized' }
  | { status: 'failed' };

const isSignedOut = (response: ApiResponse): boolean =>
  response.status === 401 || response.status === 302;

const findIn = (response: ApiResponse, id: number): Property | undefined =>
  response.ok ? parseProperties(response.body).find((property) => property.id === id) : undefined;

/**
 * One property, by id.
 *
 * Rails has no single-property JSON (see gaps_properties_detail_feature.md), and
 * this phase adds nothing to the backend, so the property is found in the
 * listing the user already has: `GET /communities.json`, at its largest page
 * size. The first page says how many pages there are; the others are fetched
 * together. The listing is scoped to the communities the user may access, so
 * an id outside that scope comes back `missing`, exactly like one that does not
 * exist.
 */
export const lookupProperty = async (cookie: string | null, id: number): Promise<PropertyLookup> => {
  const first = await fetchProperties(cookie, { page: 1, perPage: LOOKUP_PAGE_SIZE });
  if (isSignedOut(first)) return { status: 'unauthorized' };
  if (!first.ok) return { status: 'failed' };

  const onFirstPage = findIn(first, id);
  if (onFirstPage) return { status: 'found', property: onFirstPage };

  const totalPages = parseListingMeta(first.body).pagination?.totalPages ?? 1;
  const rest = await Promise.all(
    Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) =>
      fetchProperties(cookie, { page: index + 2, perPage: LOOKUP_PAGE_SIZE })
    )
  );

  for (const response of rest) {
    const property = findIn(response, id);
    if (property) return { status: 'found', property };
  }

  if (rest.some(isSignedOut)) return { status: 'unauthorized' };
  if (rest.some((response) => !response.ok)) return { status: 'failed' };
  return { status: 'missing' };
};
