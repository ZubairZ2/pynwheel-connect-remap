import 'server-only';

import type { Company } from '~/core/models/data/company.data';
import type { Property } from '~/core/models/data/property.data';
import type { ListingMeta } from '~/core/models/data/session.data';
import { parseCompanies } from '~/core/repository/parser/company.parser';
import { parseListingMeta } from '~/core/repository/parser/envelope.parser';
import { parseProperties } from '~/core/repository/parser/property.parser';
import type { CompaniesListingParams, PropertiesListingParams } from '~/core/utils/generator/listingParams';
import type { ApiResponse } from './api/base.api';
import { fetchCompanies } from './api/companies.api';
import { fetchProperties } from './api/properties.api';

/** One page of a listing: its rows and the envelope's meta (paging, totals, filter options). */
export interface ListingData<TRow> {
  rows: TRow[];
  meta: ListingMeta;
}

export type ListingLoad<TRow> = ({ status: 'found' } & ListingData<TRow>) | { status: 'unauthorized' } | { status: 'failed' };

/** What a page shows while the CMS could not be read: no rows, empty meta. */
export const emptyListing = <TRow,>(): ListingData<TRow> => ({ rows: [], meta: parseListingMeta(null) });

const outcome = <TRow,>(response: ApiResponse, rows: (body: unknown) => TRow[]): ListingLoad<TRow> => {
  if (response.status === 401 || response.status === 302) return { status: 'unauthorized' };
  if (!response.ok || response.body == null) return { status: 'failed' };
  return { status: 'found', rows: rows(response.body), meta: parseListingMeta(response.body) };
};

/**
 * The Companies listing (`companies.json`) for one state of its toolbar. The
 * page's server render and the listing route handler both go through here,
 * so a search typed in the browser and a shared link load the same way.
 */
export const loadCompaniesListing = async (cookie: string | null, params: CompaniesListingParams): Promise<ListingLoad<Company>> =>
  outcome(
    await fetchCompanies(cookie, {
      page: params.page,
      perPage: params.perPage,
      q: params.q,
      status: params.status,
      pmsProvider: params.pmsProvider,
      properties: params.properties,
      sort: params.sort?.key,
      dir: params.sort?.dir
    }),
    parseCompanies
  );

/** The Properties listing (`communities.json`), likewise. */
export const loadPropertiesListing = async (cookie: string | null, params: PropertiesListingParams): Promise<ListingLoad<Property>> =>
  outcome(
    await fetchProperties(cookie, {
      page: params.page,
      perPage: params.perPage,
      q: params.q,
      stage: params.stage,
      companyId: params.companyId,
      product: params.product,
      dataProvider: params.dataProvider,
      sort: params.sort?.key,
      dir: params.sort?.dir
    }),
    parseProperties
  );
