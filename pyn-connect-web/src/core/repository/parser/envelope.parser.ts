import { ModelDataConverter } from '~/core/utils/converter/modelDataConverter';
import type { CurrentUser, ListingMeta } from '~/core/models/data/session.data';

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

export const unwrapData = (payload: unknown): unknown[] => {
  const envelope = (payload ?? {}) as RawEnvelope;
  const data = envelope.data;

  return Array.isArray(data) ? data : [];
};

export const parseListingMeta = (payload: unknown): ListingMeta => {
  const envelope = (payload ?? {}) as RawEnvelope;
  const meta = ModelDataConverter.toCamelCase<{
    totalCount?: number;
    currentUser?: CurrentUser | null;
  }>(envelope.meta ?? {});

  return {
    totalCount: Number(meta.totalCount ?? 0),
    currentUser: meta.currentUser ?? null
  };
};
