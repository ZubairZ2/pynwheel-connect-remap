import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { PropertyContentScreen } from '~/core/screens/connect/properties/propertyContent.screen';

export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <ConnectScreenTemplate title="Property Content">
      <PropertyScope propId={propId}>
        <PropertyContentScreen />
      </PropertyScope>
    </ConnectScreenTemplate>
  );
}
