export type VersionTuple = readonly [number, number, number];

// Strict MAJOR.MINOR.PATCH, no leading zeros, no pre-release
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export const parseVersion = (value: unknown): VersionTuple | null => {
  if (typeof value !== 'string') return null;
  const match = SEMVER.exec(value);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

export const isValidVersion = (value: unknown): value is string => parseVersion(value) !== null;

// Both arguments must be valid versions; invalid ones compare as 0.0.0
export const compareVersions = (a: string, b: string): -1 | 0 | 1 => {
  const left = parseVersion(a) ?? [0, 0, 0];
  const right = parseVersion(b) ?? [0, 0, 0];
  for (let index = 0; index < 3; index++) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
};
