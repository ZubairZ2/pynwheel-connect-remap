import { ModelDataConverter } from '~/core/utils/converter/modelDataConverter';
import type {
  CompanyFilterOption,
  CurrentUser,
  ListingMeta,
  Pagination
} from '~/core/models/data/session.data';

/**
 * Unwraps the `{ data, meta, flash_messages }` envelope
 * (react-architecture.md §11 + §14) with null-safety, before anything typed
 * touches it.
 */
interface RawEnvelope {
  data?: unknown;
  meta?: unknown;
  flash_messages?: unknown;
}

interface RawMeta {
  totalCount?: number;
  currentUser?: CurrentUser | null;
  pagination?: Partial<Pagination> | null;
  filters?: { companies?: CompanyFilterOption[] } | null;
}

export const unwrapData = (payload: unknown): unknown[] => {
  const envelope = (payload ?? {}) as RawEnvelope;
  const data = envelope.data;

  return Array.isArray(data) ? data : [];
};

export const parseListingMeta = (payload: unknown): ListingMeta => {
  const envelope = (payload ?? {}) as RawEnvelope;
  const meta = ModelDataConverter.toCamelCase<RawMeta>(envelope.meta ?? {});

  return {
    totalCount: Number(meta.totalCount ?? 0),
    currentUser: meta.currentUser ?? null,
    pagination: parsePagination(meta.pagination),
    companyOptions: Array.isArray(meta.filters?.companies)
      ? meta.filters.companies.map((company) => ({
          id: Number(company.id),
          name: String(company.name ?? '')
        }))
      : []
  };
};

/**
 * A listing without pagination metadata (an error response, say) must not blow
 * up the pager, so this always returns a coherent single page.
 */
const parsePagination = (raw: Partial<Pagination> | null | undefined): Pagination | null => {
  if (!raw) return null;

  const perPage = Number(raw.perPage ?? 0) || 10;
  const totalCount = Number(raw.totalCount ?? 0);
  const totalPages = Number(raw.totalPages ?? 0) || Math.ceil(totalCount / perPage) || 0;
  const page = Number(raw.page ?? 1) || 1;

  return { page, perPage, totalCount, totalPages };
};
