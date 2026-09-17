import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { BuildsScreen } from '~/core/screens/connect/builds/builds.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="White-Label Build Pipeline">
      <BuildsScreen />
    </ConnectScreenTemplate>
  );
}
