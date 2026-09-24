import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/** Shown while the property is looked up in the Properties listing. */
export default function PropertyLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.propertyDetail.title)}>
      <div className="bo-detail">
        <div className="bo-section bo-section--empty" role="status">
          <p className="bo-section__subtitle">{i18n.t(CORE_STRINGS.propertyDetail.loading)}</p>
        </div>
      </div>
    </ListingScreenTemplate>
  );
}
