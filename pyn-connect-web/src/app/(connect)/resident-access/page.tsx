import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { ResidentAccessScreen } from '~/core/screens/connect/residentAccess/residentAccess.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Resident Access">
      <ResidentAccessScreen />
    </ConnectScreenTemplate>
  );
}
