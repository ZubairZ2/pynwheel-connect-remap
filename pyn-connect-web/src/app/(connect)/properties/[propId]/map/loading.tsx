import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/** Shown while the property's inventory and wayfinding graph load. */
export default function MapLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.mapPlotting.title)}>
      <div className="bo-inv">
        <div className="bo-section bo-section--empty" role="status">
          <p className="bo-section__subtitle">{i18n.t(CORE_STRINGS.mapPlotting.loading)}</p>
        </div>
      </div>
    </ListingScreenTemplate>
  );
}
