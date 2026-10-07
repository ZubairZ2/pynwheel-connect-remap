import { describe, expect, it } from 'vitest';
import { matchesQuery, normalizeQuery } from './searchFilter';

describe('property search filter', () => {
  it('matches case-insensitively on any visible part', () => {
    expect(matchesQuery('hazel', 'Hazel', '4733 Hazel St, Burnaby, BC')).toBe(true);
    expect(matchesQuery('BURNABY', 'Arbour Place', '4769 Hazel Street, Burnaby, BC')).toBe(true);
    expect(matchesQuery('denver', 'Hazel', '4733 Hazel St, Burnaby, BC')).toBe(false);
  });
  it('an empty or whitespace query matches everything (the full list after Cancel)', () => {
    expect(matchesQuery('', 'Hazel', null)).toBe(true);
    expect(matchesQuery('   ', 'Hazel', undefined)).toBe(true);
    expect(normalizeQuery('  John   Demo ')).toBe('john demo');
  });
  it('a short query narrows without throwing on missing parts', () => {
    expect(matchesQuery('j', 'John Pynwheel Demo', null, undefined)).toBe(true);
    expect(matchesQuery('zz', 'John Pynwheel Demo')).toBe(false);
  });
});
