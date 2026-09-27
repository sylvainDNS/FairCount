import type { ChangelogRelease, ChangelogState } from '../types';
import { compareVersions, isValidVersion } from './version';

export interface ResolveChangelogStateInput {
  readonly currentVersion: string;
  readonly lastSeen?: string | undefined;
  readonly lastConsulted?: string | undefined;
  readonly releases: readonly ChangelogRelease[];
}

const isAnnounceable = (release: ChangelogRelease) =>
  release.changes.some(
    (change) => change.category === 'feature' || change.category === 'improvement',
  );

// Releases in (after, upTo], newest first (input order is preserved)
const releasesBetween = (
  releases: readonly ChangelogRelease[],
  after: string,
  upTo: string,
): readonly ChangelogRelease[] =>
  releases.filter(
    (release) =>
      compareVersions(release.version, after) > 0 && compareVersions(release.version, upTo) <= 0,
  );

const textsOf = (releases: readonly ChangelogRelease[], category: 'feature' | 'improvement') =>
  releases.flatMap((release) =>
    release.changes.filter((change) => change.category === category).map((change) => change.text),
  );

// Pure decision engine: see specs/002-app-changelog/data-model.md « Règles de décision »
export const resolveChangelogState = ({
  currentVersion,
  lastSeen,
  lastConsulted,
  releases,
}: ResolveChangelogStateInput): ChangelogState => {
  // Rule 1: first open on this device
  if (!isValidVersion(lastSeen)) {
    return {
      summary: null,
      unread: false,
      writes: { lastSeen: currentVersion, lastConsulted: currentVersion },
    };
  }

  // A missing or corrupt lastConsulted is repaired from lastSeen, otherwise the unread
  // dot could never show again
  const consulted = isValidVersion(lastConsulted) ? lastConsulted : lastSeen;
  const repair = isValidVersion(lastConsulted) ? {} : { lastConsulted: lastSeen };

  // Rule 5: unread while an announceable release is newer than the last consulted one
  const unread = releasesBetween(releases, consulted, currentVersion).some(isAnnounceable);

  // Rule 2: same version or rollback
  if (compareVersions(currentVersion, lastSeen) <= 0) {
    return { summary: null, unread, writes: repair };
  }

  // Rule 3: summary only if something announceable happened since lastSeen
  const concerned = releasesBetween(releases, lastSeen, currentVersion);
  const newest = concerned[0];
  const oldest = concerned[concerned.length - 1];
  if (!newest || !oldest || !concerned.some(isAnnounceable)) {
    return { summary: null, unread, writes: { ...repair, lastSeen: currentVersion } };
  }

  // Rule 4: digest merged across all concerned releases
  return {
    summary: {
      fromVersion: oldest.version,
      toVersion: newest.version,
      date: newest.date,
      features: textsOf(concerned, 'feature'),
      improvements: textsOf(concerned, 'improvement'),
      fixCount: concerned.reduce(
        (count, release) => count + release.changes.filter((c) => c.category === 'fix').length,
        0,
      ),
    },
    unread,
    writes: repair,
  };
};
