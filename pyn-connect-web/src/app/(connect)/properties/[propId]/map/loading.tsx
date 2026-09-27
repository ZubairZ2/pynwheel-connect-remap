import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { LoadingIndicator } from '~/core/components/atoms/LoadingIndicator';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/** Shown while the property's inventory and wayfinding graph load. */
export default function MapLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.mapPlotting.title)}>
      <LoadingIndicator variant="page" label={i18n.t(CORE_STRINGS.mapPlotting.loading)} />
    </ListingScreenTemplate>
  );
}
