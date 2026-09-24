'use client';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { MultiFilter } from '~/core/components/molecules/MultiFilter';
import { SearchField } from '~/core/components/molecules/SearchField';
import { Pagination } from '~/core/components/organisms/Pagination';
import { ResourceListingTemplate } from '~/core/templates/ResourceListingTemplate';
import { usePropertiesListing } from '~/core/hooks/usePropertiesListing';
import type { Property } from '~/core/models/data/property.data';
import type {
  CompanyFilterOption,
  Pagination as PaginationMeta
} from '~/core/models/data/session.data';
import type { PropertyFilters } from '~/core/utils/generator/propertyListing.generator';

interface Props {
  properties: Property[];
  pagination: PaginationMeta | null;
  filters: PropertyFilters;
  companyOptions: CompanyFilterOption[];
  dataProviderOptions: string[];
  /** Every property the user can see, before search and filters. */
  scopeTotal: number | null;
  error?: string | null;
}

export const PropertiesListingScreen = ({
  properties,
  pagination,
  filters: initialFilters,
  companyOptions: companyFilterOptions,
  dataProviderOptions: dataProviderSlugs,
  scopeTotal,
  error
}: Props) => {
  const {
    query,
    setQuery,
    selection,
    toggleFilter,
    clearFilter,
    columns,
    rows,
    pager,
    summary,
    isPending,
    stageOptions,
    companyOptions,
    productOptions,
    dataProviderOptions,
    goToPage
  } = usePropertiesListing(
    properties,
    pagination,
    initialFilters,
    { companies: companyFilterOptions, dataProviders: dataProviderSlugs },
    scopeTotal
  );

  return (
    <ResourceListingTemplate
      summary={summary}
      error={error}
      columns={columns}
      rows={rows}
      busy={isPending}
      caption={i18n.t(CORE_STRINGS.properties.title)}
      emptyLabel={i18n.t(CORE_STRINGS.properties.empty)}
      toolbar={
        <>
          <SearchField
            className="bo-toolbar__search bo-toolbar__search--narrow"
            value={query}
            onChange={setQuery}
            ariaLabel={i18n.t(CORE_STRINGS.properties.search)}
            placeholder={i18n.t(CORE_STRINGS.properties.search)}
          />
          <MultiFilter
            label={i18n.t(CORE_STRINGS.properties.filters.status)}
            allLabel={i18n.t(CORE_STRINGS.properties.filters.allStatuses)}
            options={stageOptions}
            selected={selection.stage}
            onToggle={(id) => toggleFilter('stage', id)}
            onClear={() => clearFilter('stage')}
          />
          <MultiFilter
            label={i18n.t(CORE_STRINGS.properties.filters.companies)}
            allLabel={i18n.t(CORE_STRINGS.properties.filters.allCompanies)}
            options={companyOptions}
            selected={selection.companyId}
            onToggle={(id) => toggleFilter('companyId', id)}
            onClear={() => clearFilter('companyId')}
          />
          <MultiFilter
            label={i18n.t(CORE_STRINGS.properties.filters.products)}
            allLabel={i18n.t(CORE_STRINGS.properties.filters.allProducts)}
            options={productOptions}
            selected={selection.product}
            onToggle={(id) => toggleFilter('product', id)}
            onClear={() => clearFilter('product')}
          />
          <MultiFilter
            label={i18n.t(CORE_STRINGS.properties.filters.dataProviders)}
            allLabel={i18n.t(CORE_STRINGS.properties.filters.allDataProviders)}
            options={dataProviderOptions}
            selected={selection.dataProvider}
            onToggle={(id) => toggleFilter('dataProvider', id)}
            onClear={() => clearFilter('dataProvider')}
          />
        </>
      }
      footer={
        <Pagination
          pager={pager}
          disabled={isPending}
          label={i18n.t(CORE_STRINGS.properties.title)}
          onPageChange={goToPage}
        />
      }
    />
  );
};
