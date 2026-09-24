import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { LiveChatScreen } from '~/core/screens/connect/liveChat/liveChat.screen';

export default function Page() {
  return (
    <ConnectScreenTemplate title="Live Chat">
      <LiveChatScreen />
    </ConnectScreenTemplate>
  );
}
