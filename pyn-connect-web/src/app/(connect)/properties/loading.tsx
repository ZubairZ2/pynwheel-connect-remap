import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/** Shown while the first page of properties is being fetched. */
export default function PropertiesLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.properties.title)}>
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
