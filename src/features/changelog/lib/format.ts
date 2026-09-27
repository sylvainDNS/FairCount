import type { ChangelogCategory } from '../types';

export const CATEGORY_LABELS = {
  feature: 'Nouveauté',
  improvement: 'Amélioration',
  fix: 'Correction',
} as const satisfies Record<ChangelogCategory, string>;

export const CATEGORY_SECTION_TITLES = {
  feature: 'Nouveautés',
  improvement: 'Améliorations',
  fix: 'Corrections',
} as const satisfies Record<ChangelogCategory, string>;

export const CATEGORY_ORDER: readonly ChangelogCategory[] = ['feature', 'improvement', 'fix'];

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// `YYYY-MM-DD` parsed as a local date to avoid the UTC day shift of `new Date(iso)`
export const formatReleaseDate = (isoDate: string): string => {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  return dateFormatter.format(new Date(year, month - 1, day));
};

export const formatVersionRange = (fromVersion: string, toVersion: string): string =>
  fromVersion === toVersion ? `Version ${toVersion}` : `Versions ${fromVersion} à ${toVersion}`;

export const formatFixCount = (count: number): string | null => {
  if (count <= 0) return null;
  return count === 1 ? 'Plus 1 correction.' : `Plus ${count} corrections.`;
};
