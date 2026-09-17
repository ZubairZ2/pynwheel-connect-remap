'use client';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { SearchField } from '~/core/components/molecules/SearchField';
import { Pagination } from '~/core/components/organisms/Pagination';
import { ResourceListingTemplate } from '~/core/templates/ResourceListingTemplate';
import { useCompaniesListing } from '~/core/hooks/useCompaniesListing';
import type { Company } from '~/core/models/data/company.data';
import type { Pagination as PaginationMeta } from '~/core/models/data/session.data';

interface Props {
  companies: Company[];
  pagination: PaginationMeta | null;
  initialQuery: string;
  error?: string | null;
}

export const CompaniesListingScreen = ({ companies, pagination, initialQuery, error }: Props) => {
  const { query, setQuery, columns, rows, pager, isPending, goToPage } = useCompaniesListing(
    companies,
    pagination,
    initialQuery
  );

  return (
    <ResourceListingTemplate
      error={error}
      columns={columns}
      rows={rows}
      busy={isPending}
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
