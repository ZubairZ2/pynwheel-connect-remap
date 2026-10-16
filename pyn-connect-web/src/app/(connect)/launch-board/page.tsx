import { TITLES } from '~/config/app/connectRoutes';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { LaunchBoardScreen } from '~/core/screens/connect/launchBoard/launchBoard.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title={TITLES.launchBoard} demo>
      <LaunchBoardScreen />
    </ConnectScreenTemplate>
  );
}
