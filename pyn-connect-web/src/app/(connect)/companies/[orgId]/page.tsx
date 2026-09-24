import { CompanyScope } from '~/core/components/connect/PropertyScope';
import { ConnectScreenTemplate } from '~/core/templates/ConnectScreenTemplate';
import { CompanyDetailScreen } from '~/core/screens/connect/companies/companyDetail.screen';

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  return (
    <ConnectScreenTemplate title="Company">
      <CompanyScope orgId={orgId}>
        <CompanyDetailScreen />
      </CompanyScope>
    </ConnectScreenTemplate>
  );
}
