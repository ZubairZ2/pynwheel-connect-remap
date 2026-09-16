'use client';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { SearchField } from '~/core/components/molecules/SearchField';
import { ResourceListingTemplate } from '~/core/templates/ResourceListingTemplate';
import { useCompaniesListing } from '~/core/hooks/useCompaniesListing';
import type { Company } from '~/core/models/data/company.data';

interface Props {
  companies: Company[];
  error?: string | null;
}

export const CompaniesListingScreen = ({ companies, error }: Props) => {
  const { query, setQuery, columns, rows } = useCompaniesListing(companies);

  return (
    <ResourceListingTemplate
      error={error}
      columns={columns}
      rows={rows}
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
    />
  );
};
