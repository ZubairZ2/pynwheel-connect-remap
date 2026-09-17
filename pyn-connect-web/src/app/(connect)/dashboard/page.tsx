import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { DashboardScreen } from '~/core/screens/connect/dashboard/dashboard.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Dashboard">
      <DashboardScreen />
    </ConnectScreenTemplate>
  );
}
