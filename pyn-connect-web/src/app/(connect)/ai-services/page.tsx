import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { AiServicesScreen } from '~/core/screens/connect/aiServices/aiServices.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="AI Services" demo>
      <AiServicesScreen />
    </ConnectScreenTemplate>
  );
}
