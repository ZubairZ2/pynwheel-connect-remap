import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/** Shown while the property's inventory listings (which the unit is picked from) load. */
export default function UnitDetailLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.unitDetail.title)}>
      <div className="bo-inv">
        <div className="bo-section bo-section--empty" role="status">
          <p className="bo-section__subtitle">{i18n.t(CORE_STRINGS.unitDetail.loading)}</p>
        </div>
      </div>
    </ListingScreenTemplate>
  );
}
