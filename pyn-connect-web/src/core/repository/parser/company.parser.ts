import { ModelDataConverter } from '~/core/utils/converter/modelDataConverter';
import type { Company } from '~/core/models/data/company.data';
import { unwrapData } from './envelope.parser';

export const parseCompanies = (payload: unknown): Company[] =>
  unwrapData(payload).map((row) => {
    const source = ModelDataConverter.toCamelCase<Partial<Company>>(row);

    return {
      id: Number(source.id),
      name: source.name ?? '',
      email: source.email ?? null,
      phone: source.phone ?? null,
      city: source.city ?? null,
      state: source.state ?? null,
      locked: Boolean(source.locked),
      inactivate: Boolean(source.inactivate),
      pmsProviders: Array.isArray(source.pmsProviders) ? source.pmsProviders : [],
      regionCount: Number(source.regionCount ?? 0),
      portfolioGroupCount: Number(source.portfolioGroupCount ?? 0),
      propertyCount: Number(source.propertyCount ?? 0),
      userCount: Number(source.userCount ?? 0),
      updatedAt: source.updatedAt ?? null
    };
  });
