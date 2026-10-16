import { TITLES } from '~/config/app/connectRoutes';
import { PropertyScopedDemoPage } from '~/core/templates/PropertyScopedDemoPage';
import { ResidentAccessScreen } from '~/core/screens/connect/residentAccess/residentAccess.screen';

export const dynamic = 'force-dynamic';

/** The property-scoped page of the Back Office design: Properties / {property} / {page}. */
export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <PropertyScopedDemoPage
      propId={propId}
      title={TITLES.residentAccess}
      realNote="Resident access is not read from the CMS yet. The residents below are the demo data set."
    >
      <ResidentAccessScreen />
    </PropertyScopedDemoPage>
  );
}
