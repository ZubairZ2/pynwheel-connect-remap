import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { HelpScreen } from '~/core/screens/connect/help/help.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Help & Tutorials" demo>
      <HelpScreen />
    </ConnectScreenTemplate>
  );
}
