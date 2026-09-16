'use client';

import { useMemo, useState } from 'react';

import {
  filterProperties,
  generateCompanyFilterOptions,
  generateProductFilterOptions,
  generatePropertyColumns,
  generatePropertyRows,
  generateStageFilterOptions,
  type PropertyFilters
} from '~/core/utils/generator/propertyListing.generator';
import type { Property } from '~/core/models/data/property.data';

const INITIAL_FILTERS: PropertyFilters = {
  query: '',
  stage: 'all',
  companyId: 'all',
  product: 'all'
};

export const usePropertiesListing = (properties: Property[]) => {
  const [filters, setFilters] = useState<PropertyFilters>(INITIAL_FILTERS);

  const setFilter = <K extends keyof PropertyFilters>(key: K, value: PropertyFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const columns = useMemo(() => generatePropertyColumns(), []);
  const stageOptions = useMemo(() => generateStageFilterOptions(), []);
  const productOptions = useMemo(() => generateProductFilterOptions(), []);
  const companyOptions = useMemo(() => generateCompanyFilterOptions(properties), [properties]);
  const filtered = useMemo(() => filterProperties(properties, filters), [properties, filters]);
  const rows = useMemo(() => generatePropertyRows(filtered), [filtered]);

  return {
    filters,
    setFilter,
    columns,
    rows,
    stageOptions,
    companyOptions,
    productOptions,
    filteredCount: filtered.length
  };
};
