'use client';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { SearchField } from '~/core/components/molecules/SearchField';
import { ResourceListingTemplate } from '~/core/templates/ResourceListingTemplate';
import { usePropertiesListing } from '~/core/hooks/usePropertiesListing';
import type { Property } from '~/core/models/data/property.data';
import type { FilterOption } from '~/core/utils/generator/listing.types';

interface Props {
  properties: Property[];
  error?: string | null;
}

export const PropertiesListingScreen = ({ properties, error }: Props) => {
  const {
    filters,
    setFilter,
    columns,
    rows,
    stageOptions,
    companyOptions,
    productOptions
  } = usePropertiesListing(properties);

  return (
    <ResourceListingTemplate
      error={error}
      columns={columns}
      rows={rows}
      caption={i18n.t(CORE_STRINGS.properties.title)}
      emptyLabel={i18n.t(CORE_STRINGS.properties.empty)}
      toolbar={
        <>
          <SearchField
            className="bo-toolbar__search"
            value={filters.query}
            onChange={(value) => setFilter('query', value)}
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
