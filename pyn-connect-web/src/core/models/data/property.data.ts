export type LifecycleStage = 'installed' | 'activated' | 'production' | 'released' | 'approval';
export type IntegrationState = 'ok' | 'warn' | 'crit' | 'neutral';
export type ProductKey = 'touch' | 'tour' | 'maps';

export interface PropertyProducts {
  touch: boolean;
  tour: boolean;
  maps: boolean;
}

export interface PropertyIntegrations {
  lock: IntegrationState;
  identity: IntegrationState;
  pms: IntegrationState;
}

/** A community row on the Properties listing. */
export interface Property {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  location: string;
  unitCount: number;
  companyId: number | null;
  companyName: string | null;
  regionName: string | null;
  stage: LifecycleStage;
  products: PropertyProducts;
  integrations: PropertyIntegrations;
  tourPublished: boolean;
  dataProvider: string | null;
  dataProviderUpdatedOn: string | null;
  timeZone: string | null;
  moveToProduction: boolean;
  updatedAt: string | null;
}
