import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { AnalyticsScreen } from '~/core/screens/connect/analytics/analytics.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Analytics">
      <AnalyticsScreen />
    </ConnectScreenTemplate>
  );
}
