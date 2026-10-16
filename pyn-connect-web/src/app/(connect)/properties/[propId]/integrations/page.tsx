import { TITLES } from '~/config/app/connectRoutes';
import { PropertyScopedDemoPage } from '~/core/templates/PropertyScopedDemoPage';
import { IntegrationsScreen } from '~/core/screens/connect/integrations/integrations.screen';

export const dynamic = 'force-dynamic';

/** The property-scoped page of the Back Office design: Properties / {property} / {page}. */
export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <PropertyScopedDemoPage
      propId={propId}
      title={TITLES.integrations}
      realNote="Integrations data for this property is not in Connect yet. The cards below are the demo data set; pick a demo property to explore them."
    >
      <IntegrationsScreen />
    </PropertyScopedDemoPage>
  );
}
