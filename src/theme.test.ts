import { describe, expect, it } from 'vitest';

import { DEFAULT_THEME, isTheme, readTheme, themeIds } from './theme';

function storageWith(value: string | null) {
  return { getItem: () => value };
}

describe('theme resolution', () => {
  it('accepts every shipped theme id', () => {
    for (const id of themeIds) expect(isTheme(id)).toBe(true);
  });

  it('rejects unknown, differently-cased and missing values', () => {
    expect(isTheme('paper ')).toBe(false);
    expect(isTheme('PAPER')).toBe(false);
    expect(isTheme('solarized')).toBe(false);
    expect(isTheme(null)).toBe(false);
  });

  it('restores the saved theme', () => {
    expect(readTheme(storageWith('moss'))).toBe('moss');
  });

  it('falls back to the default when nothing is saved', () => {
    expect(readTheme(storageWith(null))).toBe(DEFAULT_THEME);
  });

  it('falls back to the default when the stored value is not a theme', () => {
    expect(readTheme(storageWith('plaid'))).toBe(DEFAULT_THEME);
  });

  it('survives storage that throws, such as private browsing', () => {
    const hostile = { getItem: () => { throw new Error('blocked'); } };
    expect(readTheme(hostile)).toBe(DEFAULT_THEME);
  });

  it('survives an environment with no storage at all', () => {
    expect(readTheme(undefined)).toBe(DEFAULT_THEME);
  });
});
