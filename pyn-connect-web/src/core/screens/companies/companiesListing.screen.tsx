'use client';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { SearchField } from '~/core/components/molecules/SearchField';
import { Pagination } from '~/core/components/organisms/Pagination';
import { ResourceListingTemplate } from '~/core/templates/ResourceListingTemplate';
import { useCompaniesListing } from '~/core/hooks/useCompaniesListing';
import type { Company } from '~/core/models/data/company.data';
import type { Pagination as PaginationMeta } from '~/core/models/data/session.data';
import type { ListingSort } from '~/core/utils/generator/listingSort';

interface Props {
  companies: Company[];
  pagination: PaginationMeta | null;
  initialQuery: string;
  /** The active column sort from the URL; null is the CMS's default order. */
  sort: ListingSort | null;
  /** Companies and properties in the user's scope, before search. */
  totals: { companies: number | null; properties: number | null };
  error?: string | null;
}

export const CompaniesListingScreen = ({ companies, pagination, initialQuery, sort, totals, error }: Props) => {
  const { query, setQuery, columns, rows, pager, summary, isPending, goToPage, toggleSort, sortLabel } = useCompaniesListing(
    companies,
    pagination,
    initialQuery,
    sort,
    totals
  );

  return (
    <ResourceListingTemplate
      summary={summary}
      error={error}
      columns={columns}
      rows={rows}
      busy={isPending}
      sort={sort}
      onSort={toggleSort}
      sortLabel={sortLabel}
      caption={i18n.t(CORE_STRINGS.companies.title)}
      emptyLabel={i18n.t(CORE_STRINGS.companies.empty)}
      toolbar={
        <SearchField
          className="bo-toolbar__search"
          value={query}
          onChange={setQuery}
          ariaLabel={i18n.t(CORE_STRINGS.companies.search)}
          placeholder={i18n.t(CORE_STRINGS.companies.search)}
        />
      }
      footer={
        <Pagination
          pager={pager}
          disabled={isPending}
          label={i18n.t(CORE_STRINGS.companies.title)}
          onPageChange={goToPage}
        />
      }
    />
  );
};
