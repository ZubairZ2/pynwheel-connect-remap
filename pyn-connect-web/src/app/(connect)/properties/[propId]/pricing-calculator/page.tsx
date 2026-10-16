import { TITLES } from '~/config/app/connectRoutes';
import { PropertyScopedDemoPage } from '~/core/templates/PropertyScopedDemoPage';
import { PricingCalculatorScreen } from '~/core/screens/connect/pricingCalculator/pricingCalculator.screen';

export const dynamic = 'force-dynamic';

/** The property-scoped page of the Back Office design: Properties / {property} / {page}. */
export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <PropertyScopedDemoPage
      propId={propId}
      title={TITLES.pricingCalc}
      realNote="The pricing calculator is not read from the CMS yet. The builder below runs on the demo data set."
    >
      <PricingCalculatorScreen />
    </PropertyScopedDemoPage>
  );
}
