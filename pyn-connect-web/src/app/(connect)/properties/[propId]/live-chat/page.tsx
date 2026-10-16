import { TITLES } from '~/config/app/connectRoutes';
import { PropertyScopedDemoPage } from '~/core/templates/PropertyScopedDemoPage';
import { LiveChatScreen } from '~/core/screens/connect/liveChat/liveChat.screen';

export const dynamic = 'force-dynamic';

/** The property-scoped page of the Back Office design: Properties / {property} / {page}. */
export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <PropertyScopedDemoPage
      propId={propId}
      title={TITLES.liveChat}
      realNote="Live chat conversations are not read from the CMS yet. The conversations below are the demo data set."
    >
      <LiveChatScreen />
    </PropertyScopedDemoPage>
  );
}
