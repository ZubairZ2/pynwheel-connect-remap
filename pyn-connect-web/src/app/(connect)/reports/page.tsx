import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { ReportsScreen } from '~/core/screens/connect/reports/reports.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Reports" demo>
      <ReportsScreen />
    </ConnectScreenTemplate>
  );
}
