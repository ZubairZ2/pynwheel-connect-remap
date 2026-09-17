import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { TourSetupScreen } from '~/core/screens/connect/properties/tourSetup.screen';

export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <ConnectScreenTemplate title="Tour Setup">
      <PropertyScope propId={propId}>
        <TourSetupScreen />
      </PropertyScope>
    </ConnectScreenTemplate>
  );
}
