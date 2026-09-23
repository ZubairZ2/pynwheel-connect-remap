import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/** Shown while the first page of companies is being fetched. */
export default function CompaniesLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.companies.title)}>
      <div className="bo-listing">
        <div className="bo-panel">
          <div className="bo-empty" role="status">
            Loading…
          </div>
        </div>
      </div>
    </ListingScreenTemplate>
  );
}
