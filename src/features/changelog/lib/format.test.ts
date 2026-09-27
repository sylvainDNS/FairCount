import { describe, expect, it } from 'vitest';
import {
  CATEGORY_LABELS,
  CATEGORY_SECTION_TITLES,
  formatFixCount,
  formatReleaseDate,
  formatVersionRange,
} from './format';

describe('formatReleaseDate', () => {
  it('formats in fr-FR as a local date', () => {
    expect(formatReleaseDate('2026-09-26')).toBe('26 sept. 2026');
    expect(formatReleaseDate('2026-02-09')).toBe('9 févr. 2026');
  });

  it('does not shift the day (no UTC parsing)', () => {
    expect(formatReleaseDate('2026-01-01')).toBe('1 janv. 2026');
  });
});

describe('formatVersionRange', () => {
  it('formats a single version', () => {
    expect(formatVersionRange('0.2.0', '0.2.0')).toBe('Version 0.2.0');
  });

  it('formats a range', () => {
    expect(formatVersionRange('0.2.0', '0.4.0')).toBe('Versions 0.2.0 à 0.4.0');
  });
});

describe('formatFixCount', () => {
  it('handles singular and plural', () => {
    expect(formatFixCount(1)).toBe('Plus 1 correction.');
    expect(formatFixCount(3)).toBe('Plus 3 corrections.');
  });

  it('returns null when there is no fix', () => {
    expect(formatFixCount(0)).toBeNull();
  });
});

describe('category labels', () => {
  it('exposes singular labels and plural section titles', () => {
    expect(CATEGORY_LABELS).toEqual({
      feature: 'Nouveauté',
      improvement: 'Amélioration',
      fix: 'Correction',
    });
    expect(CATEGORY_SECTION_TITLES).toEqual({
      feature: 'Nouveautés',
      improvement: 'Améliorations',
      fix: 'Corrections',
    });
  });
});
