import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { PropertyUnitsScreen } from '~/core/screens/connect/properties/propertyUnits.screen';

export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <ConnectScreenTemplate title="Units & Floor Plans">
      <PropertyScope propId={propId}>
        <PropertyUnitsScreen />
      </PropertyScope>
    </ConnectScreenTemplate>
  );
}
