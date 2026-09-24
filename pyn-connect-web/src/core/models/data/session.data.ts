/** Signed-in user, as carried in every listing envelope's `meta`. */
export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  companyId: number | null;
}

/** One page of a listing, as the backend reports it. */
export interface Pagination {
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}

/** Filter options the backend supplies, because one page cannot derive them. */
export interface CompanyFilterOption {
  id: number;
  name: string;
}

export interface ListingMeta {
  totalCount: number;
  currentUser: CurrentUser | null;
  pagination: Pagination | null;
  companyOptions: CompanyFilterOption[];
}

/** The `{ data, meta, flash_messages }` envelope every endpoint returns. */
export interface ResponseEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
  flashMessages: string[];
}

export interface SignInResult {
  ok: boolean;
  error?: string;
  currentUser?: CurrentUser | null;
}
