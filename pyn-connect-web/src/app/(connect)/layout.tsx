import { redirect } from 'next/navigation';

import { legacyFlowURL, reactFlowEnabled } from '~/config/app/reactFlow';
import { APP_ROUTES } from '~/config/app/urls';
import { ConfirmDialog } from '~/core/components/connect/ConfirmDialog';
import { ConnectDialogs } from '~/core/components/connect/ConnectDialogs';
import { ConnectToast } from '~/core/components/connect/ConnectToast';
import { Sidebar } from '~/core/components/organisms/Sidebar';
import { StoreProvider } from '~/core/store/StoreProvider';
import { loadCurrentUser } from '~/core/session/currentUser.server';

/**
 * The back-office shell: sidebar + main column, plus the auth guard. Without a
 * Rails session cookie there is nothing to render, so we send the visitor to
 * Sign In.
 *
 * `StoreProvider` wraps the whole shell because the demo slice backs the
 * topbar's omni-search and every ported screen; the Rails-backed listings
 * simply never read from it.
 */
export default async function ConnectLayout({ children }: { children: React.ReactNode }) {
  // The one place the React flow can be turned off in favour of the legacy
  // Rails UI. See config/app/reactFlow.ts.
  if (!reactFlowEnabled()) redirect(legacyFlowURL());

  const currentUser = await loadCurrentUser();
  if (!currentUser) redirect(APP_ROUTES.signIn);

  return (
    <StoreProvider>
      <div className="bo-shell">
        <Sidebar currentUser={currentUser} />
        <div className="bo-main">{children}</div>
      </div>
      <ConnectDialogs />
      <ConfirmDialog />
      <ConnectToast />
    </StoreProvider>
  );
}
