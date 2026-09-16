/** Signed-in user, as carried in every listing envelope's `meta`. */
export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  companyId: number | null;
}

export interface ListingMeta {
  totalCount: number;
  currentUser: CurrentUser | null;
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
