'use client';

import { useMemo, useState } from 'react';

import {
  filterCompanies,
  generateCompanyColumns,
  generateCompanyRows
} from '~/core/utils/generator/companyListing.generator';
import type { Company } from '~/core/models/data/company.data';

/**
 * Reads the screen's data, calls the generators, returns descriptors +
 * handlers. The screen itself stays declarative (react-architecture.md §7).
 */
export const useCompaniesListing = (companies: Company[]) => {
  const [query, setQuery] = useState('');

  const columns = useMemo(() => generateCompanyColumns(), []);
  const filtered = useMemo(() => filterCompanies(companies, query), [companies, query]);
  const rows = useMemo(() => generateCompanyRows(filtered), [filtered]);

  return { query, setQuery, columns, rows, filteredCount: filtered.length };
};
