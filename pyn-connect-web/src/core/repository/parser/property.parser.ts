import { ModelDataConverter } from '~/core/utils/converter/modelDataConverter';
import type {
  IntegrationState,
  LifecycleStage,
  Property
} from '~/core/models/data/property.data';
import { unwrapData } from './envelope.parser';

const STAGES: LifecycleStage[] = ['installed', 'activated', 'production', 'released', 'approval'];
const STATES: IntegrationState[] = ['ok', 'warn', 'crit', 'neutral'];

const asStage = (value: unknown): LifecycleStage =>
  STAGES.includes(value as LifecycleStage) ? (value as LifecycleStage) : 'installed';

const asState = (value: unknown): IntegrationState =>
  STATES.includes(value as IntegrationState) ? (value as IntegrationState) : 'neutral';

export const parseProperties = (payload: unknown): Property[] =>
  unwrapData(payload).map((row) => {
    const source = ModelDataConverter.toCamelCase<Record<string, unknown>>(row);
    const products = (source.products ?? {}) as Record<string, unknown>;
    const integrations = (source.integrations ?? {}) as Record<string, unknown>;

    return {
      id: Number(source.id),
      name: (source.name as string) ?? '',
      city: (source.city as string) ?? null,
      state: (source.state as string) ?? null,
      location: (source.location as string) ?? '',
      unitCount: Number(source.unitCount ?? 0),
      companyId: source.companyId == null ? null : Number(source.companyId),
      companyName: (source.companyName as string) ?? null,
      regionName: (source.regionName as string) ?? null,
      stage: asStage(source.stage),
      products: {
        touch: Boolean(products.touch),
        tour: Boolean(products.tour),
        maps: Boolean(products.maps)
      },
      integrations: {
        lock: asState(integrations.lock),
        identity: asState(integrations.identity),
        pms: asState(integrations.pms)
      },
      tourPublished: Boolean(source.tourPublished),
      dataProvider: (source.dataProvider as string) ?? null,
      dataProviderUpdatedOn: (source.dataProviderUpdatedOn as string) ?? null,
      timeZone: (source.timeZone as string) ?? null,
      moveToProduction: Boolean(source.moveToProduction),
      updatedAt: (source.updatedAt as string) ?? null
    };
  });
