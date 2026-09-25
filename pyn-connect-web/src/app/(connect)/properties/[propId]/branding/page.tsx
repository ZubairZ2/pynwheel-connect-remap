import { PropertyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { BrandingScreen } from '~/core/screens/connect/properties/branding.screen';

export default async function Page({ params }: { params: Promise<{ propId: string }> }) {
  const { propId } = await params;

  return (
    <ConnectScreenTemplate title="Design System & Branding" demo>
      <PropertyScope propId={propId}>
        <BrandingScreen />
      </PropertyScope>
    </ConnectScreenTemplate>
  );
}
