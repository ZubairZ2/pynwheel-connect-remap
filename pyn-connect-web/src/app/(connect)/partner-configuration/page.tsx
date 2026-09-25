import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { PartnerConfigScreen } from '~/core/screens/connect/partnerConfig/partnerConfig.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Partner Configuration" demo>
      <PartnerConfigScreen />
    </ConnectScreenTemplate>
  );
}
