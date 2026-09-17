import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { PropertyInventoryScreen } from '~/core/screens/connect/properties/propertyInventory.screen';

export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <ConnectScreenTemplate title="Property Inventory">
      <PropertyScope propId={propId}>
        <PropertyInventoryScreen />
      </PropertyScope>
    </ConnectScreenTemplate>
  );
}
