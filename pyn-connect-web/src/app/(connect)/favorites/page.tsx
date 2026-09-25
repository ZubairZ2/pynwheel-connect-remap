import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { FavoritesScreen } from '~/core/screens/connect/favorites/favorites.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Favorites & eBrochure" demo>
      <FavoritesScreen />
    </ConnectScreenTemplate>
  );
}
