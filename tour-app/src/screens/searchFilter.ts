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

/**
 * How many rows the picker renders at once. A production account sees
 * thousands of properties (4,832 on the October 2026 dump): rendering them
 * all costs ~34,000 DOM nodes, a third of a second on a laptop and a few
 * seconds on a phone, repeated on every keystroke. The list is capped and the
 * footer says how many more match, so typing narrows it instead.
 */
export const MAX_VISIBLE_ROWS = 120;

export const visibleRows = <T>(rows: T[], max = MAX_VISIBLE_ROWS): { shown: T[]; hidden: number } => ({ shown: rows.length > max ? rows.slice(0, max) : rows, hidden: Math.max(0, rows.length - max) });
