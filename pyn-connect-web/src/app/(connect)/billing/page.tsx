import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { BillingScreen } from '~/core/screens/connect/billing/billing.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Billing">
      <BillingScreen />
    </ConnectScreenTemplate>
  );
}
