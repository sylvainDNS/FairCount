import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compareVersions, isValidVersion } from '../lib/version';
import { changelog } from './changelog';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const packageVersion: string = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../package.json'), 'utf-8'),
).version;

describe('changelog (release gate)', () => {
  it('starts with the version declared in package.json', () => {
    expect(
      changelog[0]?.version,
      `package.json is ${packageVersion}: add a changelog entry for it (or revert the bump)`,
    ).toBe(packageVersion);
  });

  it('uses strict MAJOR.MINOR.PATCH versions', () => {
    for (const release of changelog) {
      expect(isValidVersion(release.version), `invalid version "${release.version}"`).toBe(true);
    }
  });

  it('lists versions strictly descending (newest first, no duplicates)', () => {
    changelog.slice(1).forEach((release, index) => {
      const previous = changelog[index];
      expect(
        previous && compareVersions(previous.version, release.version) === 1,
        `${previous?.version} must be greater than ${release.version}`,
      ).toBe(true);
    });
  });

  it('uses YYYY-MM-DD dates, non-increasing', () => {
    changelog.forEach((release, index) => {
      expect(release.date, `invalid date for ${release.version}`).toMatch(ISO_DATE);
      const previous = changelog[index - 1];
      if (previous) {
        expect(
          previous.date >= release.date,
          `${release.version} (${release.date}) is newer than ${previous.version} (${previous.date})`,
        ).toBe(true);
      }
    });
  });

  it('has non-empty, trimmed texts', () => {
    for (const release of changelog) {
      for (const change of release.changes) {
        expect(change.text.trim(), `empty text in ${release.version}`).not.toBe('');
        expect(change.text, `untrimmed text in ${release.version}`).toBe(change.text.trim());
      }
    }
  });
});
