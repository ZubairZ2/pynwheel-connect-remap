import { TITLES } from '~/config/app/connectRoutes';
import { PropertyScopedDemoPage } from '~/core/templates/PropertyScopedDemoPage';
import { PropertyPricingScreen } from '~/core/screens/connect/properties/propertyPricing.screen';

export const dynamic = 'force-dynamic';

/** The property-scoped page of the Back Office design: Properties / {property} / {page}. */
export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <PropertyScopedDemoPage
      propId={propId}
      title={TITLES.propPricing}
      realNote="Pricing & Availability is not read from the CMS yet. The rates and units below are the demo data set."
    >
      <PropertyPricingScreen />
    </PropertyScopedDemoPage>
  );
}
