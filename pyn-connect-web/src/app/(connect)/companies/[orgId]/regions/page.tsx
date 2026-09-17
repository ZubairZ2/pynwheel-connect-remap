import { CompanyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { CompanyRegionsScreen } from '~/core/screens/connect/companies/companyRegions.screen';

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  return (
    <ConnectScreenTemplate title="Regions">
      <CompanyScope orgId={orgId}>
        <CompanyRegionsScreen />
      </CompanyScope>
    </ConnectScreenTemplate>
  );
}
