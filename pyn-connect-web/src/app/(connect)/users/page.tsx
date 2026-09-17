import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { UsersScreen } from '~/core/screens/connect/users/users.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Users & Roles">
      <UsersScreen />
    </ConnectScreenTemplate>
  );
}
