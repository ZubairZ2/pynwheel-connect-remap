import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { LoadingIndicator } from '~/core/components/atoms/LoadingIndicator';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/** Shown while the property's inventory listings (which the unit is picked from) load. */
export default function UnitDetailLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.unitDetail.title)}>
      <LoadingIndicator variant="page" label={i18n.t(CORE_STRINGS.unitDetail.loading)} />
    </ListingScreenTemplate>
  );
}
