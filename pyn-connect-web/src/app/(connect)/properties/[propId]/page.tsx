import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { PropertyDetailScreen } from '~/core/screens/connect/properties/propertyDetail.screen';

export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <ConnectScreenTemplate title="Property">
      <PropertyScope propId={propId}>
        <PropertyDetailScreen />
      </PropertyScope>
    </ConnectScreenTemplate>
  );
}
