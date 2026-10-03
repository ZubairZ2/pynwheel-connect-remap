import { COMPANY_SORTABLE } from './companyListing.generator';
import { parseListingSort, type ListingSort } from './listingSort';
import { DEFAULT_PAGE_SIZE, clampPageSize } from './pagination.generator';
import { PROPERTY_SORTABLE } from './propertyListing.generator';

/**
 * The state of a server-paged listing, as it travels on the URL and to this
 * app's listing route handlers: the search, the filters, the sort, the page
 * and the rows per page. One module reads it (from a page's `searchParams`,
 * a route handler's query string or `window.location`) and writes it (the
 * canonical query string), so the three always agree. Pure, client-safe.
 */

/** Reads one parameter; null or undefined when it is absent. */
export type ParamSource = (key: string) => string | null | undefined;

/** A filter parameter holds one value or several, comma-separated. `all` is how the old selects said "no filter". */
export const listParam = (value?: string | null): string[] =>
  Array.from(new Set((value ?? '').split(',').map((part) => part.trim()).filter((part) => part !== '' && part !== 'all')));

export interface ListingParamsBase {
  q: string;
  page: number;
  perPage: number;
  sort: ListingSort | null;
}

export interface CompaniesListingParams extends ListingParamsBase {
  status: string[];
  pmsProvider: string[];
  properties: string[];
}

export interface PropertiesListingParams extends ListingParamsBase {
  stage: string[];
  companyId: string[];
  product: string[];
  dataProvider: string[];
}

const baseParams = (get: ParamSource, sortable: readonly string[]): ListingParamsBase => ({
  q: (get('q') ?? '').trim(),
  page: Math.max(1, Number(get('page')) || 1),
  perPage: clampPageSize(get('per_page')),
  sort: parseListingSort(get('sort') ?? undefined, get('dir') ?? undefined, sortable as string[])
});

export const companiesParamsOf = (get: ParamSource): CompaniesListingParams => ({
  ...baseParams(get, COMPANY_SORTABLE),
  status: listParam(get('status')),
  pmsProvider: listParam(get('pms_provider')),
  properties: listParam(get('properties'))
});

export const propertiesParamsOf = (get: ParamSource): PropertiesListingParams => ({
  ...baseParams(get, PROPERTY_SORTABLE),
  stage: listParam(get('stage')),
  companyId: listParam(get('company_id')),
  product: listParam(get('product')),
  dataProvider: listParam(get('data_provider'))
});

/** The same readers over a `URLSearchParams` (the browser's URL, a route handler's request). */
export const companiesParamsFromSearch = (search: URLSearchParams): CompaniesListingParams => companiesParamsOf((key) => search.get(key));
export const propertiesParamsFromSearch = (search: URLSearchParams): PropertiesListingParams => propertiesParamsOf((key) => search.get(key));

type Entry = [string, string | number | string[] | null | undefined];

/**
 * The canonical query string: defaults are left out (an empty search or
 * filter, page 1, the default rows per page, no sort), lists travel
 * comma-separated, and the order is fixed so two equal states give the same
 * string — which is how the listing hook tells its own URL from another.
 */
const build = (entries: Entry[]): string => {
  const params = new URLSearchParams();
  entries.forEach(([key, value]) => {
    if (value == null) return;
    const text = Array.isArray(value) ? value.join(',') : String(value).trim();
    if (text === '' || text === 'all') return;
    if (key === 'page' && text === '1') return;
    if (key === 'per_page' && Number(text) === DEFAULT_PAGE_SIZE) return;
    params.set(key, text);
  });
  return params.toString();
};

export const companiesSearch = (params: CompaniesListingParams): string =>
  build([
    ['q', params.q],
    ['status', params.status],
    ['pms_provider', params.pmsProvider],
    ['properties', params.properties],
    ['sort', params.sort?.key],
    ['dir', params.sort?.dir],
    ['page', params.page],
    ['per_page', params.perPage]
  ]);

export const propertiesSearch = (params: PropertiesListingParams): string =>
  build([
    ['q', params.q],
    ['stage', params.stage],
    ['company_id', params.companyId],
    ['product', params.product],
    ['data_provider', params.dataProvider],
    ['sort', params.sort?.key],
    ['dir', params.sort?.dir],
    ['page', params.page],
    ['per_page', params.perPage]
  ]);
