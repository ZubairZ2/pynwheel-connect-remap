import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { MapEditorScreen } from '~/core/screens/connect/properties/mapEditor.screen';

export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <ConnectScreenTemplate title="Map & Plotting" demo>
      <PropertyScope propId={propId}>
        <MapEditorScreen />
      </PropertyScope>
    </ConnectScreenTemplate>
  );
}
