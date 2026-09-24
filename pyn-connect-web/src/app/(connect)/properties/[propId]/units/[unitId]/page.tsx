import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { UnitScope } from '~/core/components/connect/UnitScope';
import { UnitDetailScreen } from '~/core/screens/connect/properties/unitDetail.screen';

export default async function Page({
  params
}: {
  params: Promise<{ propId: string; unitId: string }>;
}) {
  const { propId, unitId } = await params;

  return (
    <ConnectScreenTemplate title="Unit">
      <PropertyScope propId={propId}>
        <UnitScope unitId={unitId}>
          <UnitDetailScreen />
        </UnitScope>
      </PropertyScope>
    </ConnectScreenTemplate>
  );
}
