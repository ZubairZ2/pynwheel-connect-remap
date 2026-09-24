import { PropertyPreselect } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { IntegrationsScreen } from '~/core/screens/connect/integrations/integrations.screen';

interface Props {
  /** `?property=` — set by a Properties listing row's Go To button. */
  searchParams: Promise<{ property?: string }>;
}

export default async function Page({ searchParams }: Props) {
  const { property } = await searchParams;

  return (
    <ConnectScreenTemplate title="Integrations Hub">
      {property ? (
        <PropertyPreselect propId={property}>
          <IntegrationsScreen />
        </PropertyPreselect>
      ) : (
        <IntegrationsScreen />
      )}
    </ConnectScreenTemplate>
  );
}
