import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { PropertyPricingScreen } from '~/core/screens/connect/properties/propertyPricing.screen';

export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <ConnectScreenTemplate title="Pricing & Availability">
      <PropertyScope propId={propId}>
        <PropertyPricingScreen />
      </PropertyScope>
    </ConnectScreenTemplate>
  );
}
