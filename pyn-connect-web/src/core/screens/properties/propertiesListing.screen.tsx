'use client';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { SearchField } from '~/core/components/molecules/SearchField';
import { Pagination } from '~/core/components/organisms/Pagination';
import { ResourceListingTemplate } from '~/core/templates/ResourceListingTemplate';
import { usePropertiesListing } from '~/core/hooks/usePropertiesListing';
import type { Property } from '~/core/models/data/property.data';
import type {
  CompanyFilterOption,
  Pagination as PaginationMeta
} from '~/core/models/data/session.data';
import type { FilterOption } from '~/core/utils/generator/listing.types';
import type { PropertyFilters } from '~/core/utils/generator/propertyListing.generator';

interface Props {
  properties: Property[];
  pagination: PaginationMeta | null;
  filters: PropertyFilters;
  companyOptions: CompanyFilterOption[];
  error?: string | null;
}

export const PropertiesListingScreen = ({
  properties,
  pagination,
  filters: initialFilters,
  companyOptions: companyFilterOptions,
  error
}: Props) => {
  const {
    filters,
    setQuery,
    setFilter,
    columns,
    rows,
    pager,
    isPending,
    stageOptions,
    companyOptions,
    productOptions,
    goToPage
  } = usePropertiesListing(properties, pagination, initialFilters, companyFilterOptions);

  return (
    <ResourceListingTemplate
      error={error}
      columns={columns}
      rows={rows}
      busy={isPending}
      caption={i18n.t(CORE_STRINGS.properties.title)}
      emptyLabel={i18n.t(CORE_STRINGS.properties.empty)}
      toolbar={
        <>
          <SearchField
            className="bo-toolbar__search"
            value={filters.query}
            onChange={setQuery}
            ariaLabel={i18n.t(CORE_STRINGS.properties.search)}
            placeholder={i18n.t(CORE_STRINGS.properties.search)}
          />
          <FilterSelect
            label={i18n.t(CORE_STRINGS.properties.allStatuses)}
            value={filters.stage}
            options={stageOptions}
            onChange={(value) => setFilter('stage', value)}
          />
          <FilterSelect
            label={i18n.t(CORE_STRINGS.properties.allCompanies)}
            value={filters.companyId}
            options={companyOptions}
            onChange={(value) => setFilter('companyId', value)}
          />
          <FilterSelect
            label={i18n.t(CORE_STRINGS.properties.allProducts)}
            value={filters.product}
            options={productOptions}
            onChange={(value) => setFilter('product', value)}
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

interface FilterSelectProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

const FilterSelect = ({ label, value, options, onChange }: FilterSelectProps) => (
  <select
    className="bo-select"
    aria-label={label}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  >
    {options.map((option) => (
      <option key={option.id} value={option.id}>
        {option.label}
      </option>
    ))}
  </select>
);
