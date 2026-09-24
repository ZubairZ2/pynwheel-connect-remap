import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { IntegrationsScreen } from '~/core/screens/connect/integrations/integrations.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Integrations Hub">
      <IntegrationsScreen />
    </ConnectScreenTemplate>
  );
}
