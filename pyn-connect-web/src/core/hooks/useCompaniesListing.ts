'use client';

import { useMemo } from 'react';

import {
  generateCompanyColumns,
  generateCompanyRows
} from '~/core/utils/generator/companyListing.generator';
import { generatePager } from '~/core/utils/generator/pagination.generator';
import type { Company } from '~/core/models/data/company.data';
import type { Pagination } from '~/core/models/data/session.data';
import { useDebouncedSearch } from './useDebouncedSearch';
import { useListingParams } from './useListingParams';

/**
 * Reads the screen's data, calls the generators, returns descriptors +
 * handlers. Searching and paging are server-side, so both are expressed as URL
 * changes rather than local filtering (react-architecture.md §7).
 */
export const useCompaniesListing = (
  companies: Company[],
  pagination: Pagination | null,
  initialQuery: string
) => {
  const { setParams, isPending } = useListingParams();
  const { value: query, setValue: setQuery } = useDebouncedSearch(initialQuery, (value) =>
    setParams({ q: value })
  );

  const columns = useMemo(() => generateCompanyColumns(), []);
  const rows = useMemo(() => generateCompanyRows(companies), [companies]);
  const pager = useMemo(() => generatePager(pagination), [pagination]);

  return {
    query,
    setQuery,
    columns,
    rows,
    pager,
    isPending,
    goToPage: (page: number) => setParams({ page }, { keepPage: true })
  };
};
