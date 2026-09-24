import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { AuditScreen } from '~/core/screens/connect/audit/audit.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Audit Log">
      <AuditScreen />
    </ConnectScreenTemplate>
  );
}
