import { LoadingIndicator } from '~/core/components/atoms/LoadingIndicator';

/**
 * The shell's own loading state: what shows inside the sidebar layout while a
 * route without a loading file of its own resolves (the first navigation into
 * the back office, a screen that reads its page params on the server). The
 * routes that fetch from the CMS carry their own titled version next to their
 * page.
 */
export default function ConnectLoading() {
  return (
    <main className="bo-content">
      <LoadingIndicator variant="page" />
    </main>
  );
}
