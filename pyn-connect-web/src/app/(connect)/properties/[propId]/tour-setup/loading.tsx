import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { LoadingIndicator } from '~/core/components/atoms/LoadingIndicator';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/** Shown while the property's tour, stops and elevators load. */
export default function TourSetupLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.tourSetup.title)}>
      <LoadingIndicator variant="page" label={i18n.t(CORE_STRINGS.tourSetup.loading)} />
    </ListingScreenTemplate>
  );
}
