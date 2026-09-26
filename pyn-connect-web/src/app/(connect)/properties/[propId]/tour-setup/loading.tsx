import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/** Shown while the property's tour, inventory and wayfinding graph load. */
export default function TourSetupLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.tourSetup.title)}>
      <div className="bo-inv">
        <div className="bo-section bo-section--empty" role="status">
          <p className="bo-section__subtitle">{i18n.t(CORE_STRINGS.tourSetup.loading)}</p>
        </div>
      </div>
    </ListingScreenTemplate>
  );
}
