import { CompanyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { CompanyGroupsScreen } from '~/core/screens/connect/companies/companyGroups.screen';

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  return (
    <ConnectScreenTemplate title="Portfolio Groups" demo>
      <CompanyScope orgId={orgId}>
        <CompanyGroupsScreen />
      </CompanyScope>
    </ConnectScreenTemplate>
  );
}
