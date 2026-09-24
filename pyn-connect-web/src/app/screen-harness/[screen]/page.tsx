'use client';

import { notFound } from 'next/navigation';
import { use } from 'react';

import { ConfirmDialog } from '~/core/components/connect/ConfirmDialog';
import { ConnectDialogs } from '~/core/components/connect/ConnectDialogs';
import { ConnectToast } from '~/core/components/connect/ConnectToast';
import { StoreProvider } from '~/core/store/StoreProvider';
import { AiServicesScreen } from '~/core/screens/connect/aiServices/aiServices.screen';
import { AnalyticsScreen } from '~/core/screens/connect/analytics/analytics.screen';
import { AuditScreen } from '~/core/screens/connect/audit/audit.screen';
import { BillingScreen } from '~/core/screens/connect/billing/billing.screen';
import { BuildsScreen } from '~/core/screens/connect/builds/builds.screen';
import { CompanyDetailScreen } from '~/core/screens/connect/companies/companyDetail.screen';
import { CompanyGroupsScreen } from '~/core/screens/connect/companies/companyGroups.screen';
import { CompanyRegionsScreen } from '~/core/screens/connect/companies/companyRegions.screen';
import { DashboardScreen } from '~/core/screens/connect/dashboard/dashboard.screen';
import { FavoritesScreen } from '~/core/screens/connect/favorites/favorites.screen';
import { HelpScreen } from '~/core/screens/connect/help/help.screen';
import { IntegrationsScreen } from '~/core/screens/connect/integrations/integrations.screen';
import { LiveChatScreen } from '~/core/screens/connect/liveChat/liveChat.screen';
import { PartnerConfigScreen } from '~/core/screens/connect/partnerConfig/partnerConfig.screen';
import { PricingCalculatorScreen } from '~/core/screens/connect/pricingCalculator/pricingCalculator.screen';
import { BrandingScreen } from '~/core/screens/connect/properties/branding.screen';
import { MapEditorScreen } from '~/core/screens/connect/properties/mapEditor.screen';
import { PropertyContentScreen } from '~/core/screens/connect/properties/propertyContent.screen';
import { PropertyDetailScreen } from '~/core/screens/connect/properties/propertyDetail.screen';
import { PropertyInventoryScreen } from '~/core/screens/connect/properties/propertyInventory.screen';
import { PropertyPricingScreen } from '~/core/screens/connect/properties/propertyPricing.screen';
import { PropertyUnitsScreen } from '~/core/screens/connect/properties/propertyUnits.screen';
import { TourSetupScreen } from '~/core/screens/connect/properties/tourSetup.screen';
import { UnitDetailScreen } from '~/core/screens/connect/properties/unitDetail.screen';
import { ReportsScreen } from '~/core/screens/connect/reports/reports.screen';
import { ResidentAccessScreen } from '~/core/screens/connect/residentAccess/residentAccess.screen';
import { SchedulingScreen } from '~/core/screens/connect/scheduling/scheduling.screen';
import { SvgOptimizerScreen } from '~/core/screens/connect/svgOptimizer/svgOptimizer.screen';
import { UsersScreen } from '~/core/screens/connect/users/users.screen';

const SCREENS: Record<string, () => React.JSX.Element> = {
  dashboard: DashboardScreen,
  companyDetail: CompanyDetailScreen,
  companyRegions: CompanyRegionsScreen,
  companyGroups: CompanyGroupsScreen,
  propertyDetail: PropertyDetailScreen,
  propertyPricing: PropertyPricingScreen,
  propertyUnits: PropertyUnitsScreen,
  unitDetail: UnitDetailScreen,
  mapEditor: MapEditorScreen,
  propertyInventory: PropertyInventoryScreen,
  tourSetup: TourSetupScreen,
  branding: BrandingScreen,
  propertyContent: PropertyContentScreen,
  scheduling: SchedulingScreen,
  integrations: IntegrationsScreen,
  svgOptimizer: SvgOptimizerScreen,
  partnerConfig: PartnerConfigScreen,
  builds: BuildsScreen,
  pricingCalculator: PricingCalculatorScreen,
  favorites: FavoritesScreen,
  residentAccess: ResidentAccessScreen,
  liveChat: LiveChatScreen,
  analytics: AnalyticsScreen,
  reports: ReportsScreen,
  users: UsersScreen,
  aiServices: AiServicesScreen,
  billing: BillingScreen,
  audit: AuditScreen,
  help: HelpScreen
};

/**
 * Test harness for the ported screens.
 *
 * The real routes live behind the Rails session guard in `(connect)/layout.tsx`,
 * which the end-to-end suite has no credentials for. This route renders one
 * screen at a time with the demo store and the dialog host, and nothing else —
 * same components, same state, no chrome.
 *
 * It is not part of the product: a production build returns 404 unless
 * `PYN_CONNECT_SCREEN_HARNESS=on` is set explicitly.
 */
export default function ScreenHarnessPage({ params }: { params: Promise<{ screen: string }> }) {
  const enabled =
    process.env.NEXT_PUBLIC_SCREEN_HARNESS === 'on' || process.env.NODE_ENV !== 'production';
  if (!enabled) notFound();

  const { screen } = use(params);
  const Screen = SCREENS[screen];

  return (
    <StoreProvider>
      <div className="bo-shell">
        <div className="bo-main">
          <main className="bo-content">{Screen ? <Screen /> : <div>unknown: {screen}</div>}</main>
        </div>
      </div>
      <ConnectDialogs />
      <ConfirmDialog />
      <ConnectToast />
    </StoreProvider>
  );
}
