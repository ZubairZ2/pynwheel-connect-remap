'use client';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { MultiFilter } from '~/core/components/molecules/MultiFilter';
import { SearchField } from '~/core/components/molecules/SearchField';
import { Pagination } from '~/core/components/organisms/Pagination';
import { ResourceListingTemplate } from '~/core/templates/ResourceListingTemplate';
import { useCompaniesListing } from '~/core/hooks/useCompaniesListing';
import type { ListingData } from '~/core/hooks/useServerListing';
import type { Company } from '~/core/models/data/company.data';
import type { CompaniesListingParams } from '~/core/utils/generator/listingParams';

interface Props {
  /** What the server rendered for `params`. */
  initial: ListingData<Company>;
  /** The listing's state from the URL. */
  params: CompaniesListingParams;
  error?: string | null;
}

export const CompaniesListingScreen = ({ initial, params, error }: Props) => {
  const {
    query,
    setQuery,
    selection,
    toggleFilter,
    clearFilter,
    columns,
    rows,
    pager,
    pageSize,
    sort,
    summary,
    isPending,
    failed,
    statusOptions,
    providerOptions,
    propertiesOptions,
    goToPage,
    setPageSize,
    toggleSort,
    sortLabel
  } = useCompaniesListing(initial, params);
  const F = CORE_STRINGS.companies.filters;

  return (
    <ResourceListingTemplate
      summary={summary}
      error={error ?? (failed ? i18n.t(CORE_STRINGS.shared.loadFailed) : null)}
      columns={columns}
      rows={rows}
      busy={isPending}
      sort={sort}
      onSort={toggleSort}
      sortLabel={sortLabel}
      caption={i18n.t(CORE_STRINGS.companies.title)}
      emptyLabel={i18n.t(CORE_STRINGS.companies.empty)}
      toolbar={
        <>
          <SearchField
            className="bo-toolbar__search bo-toolbar__search--narrow"
            value={query}
            onChange={setQuery}
            ariaLabel={i18n.t(CORE_STRINGS.companies.search)}
            placeholder={i18n.t(CORE_STRINGS.companies.search)}
          />
          <MultiFilter
            label={i18n.t(F.status)}
            allLabel={i18n.t(F.allStatuses)}
            options={statusOptions}
            selected={selection.status}
            onToggle={(id) => toggleFilter('status', id)}
            onClear={() => clearFilter('status')}
          />
          <MultiFilter
            label={i18n.t(F.pmsProvider)}
            allLabel={i18n.t(F.allProviders)}
            options={providerOptions}
            selected={selection.pmsProvider}
            onToggle={(id) => toggleFilter('pmsProvider', id)}
            onClear={() => clearFilter('pmsProvider')}
          />
          <MultiFilter
            label={i18n.t(F.properties)}
            allLabel={i18n.t(F.allProperties)}
            options={propertiesOptions}
            selected={selection.properties}
            onToggle={(id) => toggleFilter('properties', id)}
            onClear={() => clearFilter('properties')}
          />
        </>
      }
      footer={
        <Pagination
          pager={pager}
          disabled={isPending}
          label={i18n.t(CORE_STRINGS.companies.title)}
          onPageChange={goToPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      }
    />
  );
};
