/**
 * The property search: a plain substring match on the visible text of each
 * row (name, address, city, meta), case-insensitive, whitespace-trimmed. The
 * list is already in memory (one request when the app signs in), so typing
 * never sends a request and Cancel never has to race one.
 */
export const normalizeQuery = (query: string): string => query.trim().replace(/\s+/g, ' ').toLowerCase();

export const matchesQuery = (query: string, ...parts: (string | null | undefined)[]): boolean => {
  const q = normalizeQuery(query);
  if (!q) return true;
  return parts
    .filter((p): p is string => !!p)
    .join(' ')
    .toLowerCase()
    .includes(q);
};
