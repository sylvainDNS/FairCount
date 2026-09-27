import { describe, expect, it } from 'vitest';
import { compareVersions, parseVersion } from './version';

describe('parseVersion', () => {
  it('parses strict semver', () => {
    expect(parseVersion('0.2.0')).toEqual([0, 2, 0]);
    expect(parseVersion('10.20.30')).toEqual([10, 20, 30]);
  });

  it.each(['', '1.2', '1.2.3-beta', 'v1.2.3', '01.2.3', '1.2.3.4', ' 1.2.3'])(
    'rejects %j',
    (value) => {
      expect(parseVersion(value)).toBeNull();
    },
  );

  it('rejects non-strings', () => {
    expect(parseVersion(null)).toBeNull();
    expect(parseVersion(undefined)).toBeNull();
    expect(parseVersion(123)).toBeNull();
  });
});

describe('compareVersions', () => {
  it('compares numerically, not lexicographically', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBe(1);
    expect(compareVersions('0.9.0', '0.10.0')).toBe(-1);
  });

  it('compares major, minor then patch', () => {
    expect(compareVersions('1.0.0', '0.99.99')).toBe(1);
    expect(compareVersions('0.2.1', '0.2.0')).toBe(1);
    expect(compareVersions('0.2.0', '0.2.0')).toBe(0);
  });
});
