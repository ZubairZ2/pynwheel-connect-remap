import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { LoadingIndicator } from '~/core/components/atoms/LoadingIndicator';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/** Shown while the first page of companies is being fetched. */
export default function CompaniesLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.companies.title)}>
      <LoadingIndicator variant="page" />
    </ListingScreenTemplate>
  );
}
