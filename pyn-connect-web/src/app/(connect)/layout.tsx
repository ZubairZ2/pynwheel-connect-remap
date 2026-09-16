import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { Sidebar } from '~/core/components/organisms/Sidebar';
import { loadCurrentUser } from '~/core/session/currentUser.server';

/**
 * ListingLayout: sidebar + main column, plus the auth guard. Without a Rails
 * session cookie there is nothing to render, so we send the visitor to Sign In.
 */
export default async function ConnectLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await loadCurrentUser();
  if (!currentUser) redirect(APP_ROUTES.signIn);

  return (
    <div className="bo-shell">
      <Sidebar currentUser={currentUser} />
      <div className="bo-main">{children}</div>
    </div>
  );
}
