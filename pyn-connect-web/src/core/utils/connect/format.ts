/** Small formatting helpers the design uses everywhere. */

export const initials = (name: string | undefined): string =>
  (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export const uid = (prefix: string): string => prefix + Math.random().toString(36).slice(2, 7);

export const plural = (n: number, one: string, many?: string): string =>
  `${n} ${n === 1 ? one : many ?? `${one}s`}`;

export const money = (n: number): string => `$${n.toLocaleString()}`;
