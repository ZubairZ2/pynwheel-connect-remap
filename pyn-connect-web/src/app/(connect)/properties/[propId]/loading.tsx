import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { LoadingIndicator } from '~/core/components/atoms/LoadingIndicator';
import { ListingScreenTemplate } from '~/core/templates/ListingScreenTemplate';

/**
 * Shown while a property route resolves: the record itself, and also a child
 * screen (Inventory, Map & Plotting, Tour Setup) reached from the property,
 * since this boundary wraps the whole `[propId]` segment. So the caption stays
 * generic; each child's own loading file names what it fetches.
 */
export default function PropertyLoading() {
  return (
    <ListingScreenTemplate headerTitle={i18n.t(CORE_STRINGS.propertyDetail.title)}>
      <LoadingIndicator variant="page" />
    </ListingScreenTemplate>
  );
}
