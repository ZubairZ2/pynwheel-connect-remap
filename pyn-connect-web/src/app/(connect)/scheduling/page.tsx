import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { SchedulingScreen } from '~/core/screens/connect/scheduling/scheduling.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Tour Scheduling">
      <SchedulingScreen />
    </ConnectScreenTemplate>
  );
}
