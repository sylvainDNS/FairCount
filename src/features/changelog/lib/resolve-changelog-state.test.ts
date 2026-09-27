import { describe, expect, it } from 'vitest';
import type { ChangelogRelease } from '../types';
import { resolveChangelogState } from './resolve-changelog-state';

// Newest first, like the real changelog
const releases: readonly ChangelogRelease[] = [
  {
    version: '0.5.0',
    date: '2026-12-01',
    changes: [{ category: 'fix', text: 'Correction D' }],
  },
  {
    version: '0.4.0',
    date: '2026-11-01',
    changes: [
      { category: 'feature', text: 'Nouveauté C' },
      { category: 'improvement', text: 'Amélioration C' },
      { category: 'fix', text: 'Correction C' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-10-15',
    changes: [
      { category: 'fix', text: 'Correction B1' },
      { category: 'fix', text: 'Correction B2' },
    ],
  },
  { version: '0.2.1', date: '2026-10-01', changes: [] },
  {
    version: '0.2.0',
    date: '2026-09-30',
    changes: [
      { category: 'feature', text: 'Nouveauté A1' },
      { category: 'feature', text: 'Nouveauté A2' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-02-09',
    changes: [{ category: 'feature', text: 'Première version' }],
  },
];

const resolve = (input: {
  currentVersion: string;
  lastSeen?: string | undefined;
  lastConsulted?: string | undefined;
}) => resolveChangelogState({ releases, ...input });

describe('resolveChangelogState', () => {
  describe('rule 1: first open (no valid lastSeen)', () => {
    it('shows nothing and initialises both versions', () => {
      expect(resolve({ currentVersion: '0.2.0' })).toEqual({
        summary: null,
        unread: false,
        writes: { lastSeen: '0.2.0', lastConsulted: '0.2.0' },
      });
    });

    it('treats an invalid lastSeen as absent', () => {
      const state = resolve({ currentVersion: '0.2.0', lastSeen: 'oops', lastConsulted: 'oops' });
      expect(state.summary).toBeNull();
      expect(state.unread).toBe(false);
      expect(state.writes).toEqual({ lastSeen: '0.2.0', lastConsulted: '0.2.0' });
    });
  });

  describe('rule 2: rollback or same version', () => {
    it('does nothing on the same version', () => {
      expect(
        resolve({ currentVersion: '0.2.0', lastSeen: '0.2.0', lastConsulted: '0.2.0' }),
      ).toEqual({
        summary: null,
        unread: false,
        writes: {},
      });
    });

    it('does nothing and never lowers lastSeen on rollback', () => {
      const state = resolve({ currentVersion: '0.2.0', lastSeen: '0.5.0', lastConsulted: '0.5.0' });
      expect(state.summary).toBeNull();
      expect(state.writes).toEqual({});
    });
  });

  describe('rule 3 & 4: summary', () => {
    it('shows the digest of a single announceable release', () => {
      const state = resolve({ currentVersion: '0.2.0', lastSeen: '0.1.0', lastConsulted: '0.1.0' });
      expect(state.summary).toEqual({
        fromVersion: '0.2.0',
        toVersion: '0.2.0',
        date: '2026-09-30',
        features: ['Nouveauté A1', 'Nouveauté A2'],
        improvements: [],
        fixCount: 0,
      });
      expect(state.writes).toEqual({});
    });

    it('merges every concerned release, newest first, and counts fixes', () => {
      const state = resolve({ currentVersion: '0.4.0', lastSeen: '0.1.0', lastConsulted: '0.1.0' });
      expect(state.summary).toEqual({
        fromVersion: '0.2.0',
        toVersion: '0.4.0',
        date: '2026-11-01',
        features: ['Nouveauté C', 'Nouveauté A1', 'Nouveauté A2'],
        improvements: ['Amélioration C'],
        fixCount: 3,
      });
    });

    it('counts fixes of a fix-only release skipped on the way (spec US1 scenario 5)', () => {
      const state = resolve({ currentVersion: '0.4.0', lastSeen: '0.2.0', lastConsulted: '0.2.0' });
      expect(state.summary?.features).toEqual(['Nouveauté C']);
      expect(state.summary?.fixCount).toBe(3);
      expect(state.summary?.fromVersion).toBe('0.2.1');
    });

    it('shows no summary and auto-marks seen for fix-only releases', () => {
      expect(
        resolve({ currentVersion: '0.3.0', lastSeen: '0.2.0', lastConsulted: '0.2.0' }),
      ).toEqual({
        summary: null,
        unread: false,
        writes: { lastSeen: '0.3.0' },
      });
    });

    it('shows no summary for an empty release', () => {
      const state = resolve({ currentVersion: '0.2.1', lastSeen: '0.2.0', lastConsulted: '0.2.0' });
      expect(state.summary).toBeNull();
      expect(state.writes).toEqual({ lastSeen: '0.2.1' });
    });

    it('ignores releases newer than the current version', () => {
      const state = resolve({ currentVersion: '0.2.0', lastSeen: '0.1.0', lastConsulted: '0.1.0' });
      expect(state.summary?.toVersion).toBe('0.2.0');
    });
  });

  describe('rule 5: unread', () => {
    it('is unread while an announceable release is newer than lastConsulted', () => {
      expect(
        resolve({ currentVersion: '0.2.0', lastSeen: '0.2.0', lastConsulted: '0.1.0' }).unread,
      ).toBe(true);
    });

    it('is read once lastConsulted reaches the current version', () => {
      expect(
        resolve({ currentVersion: '0.2.0', lastSeen: '0.2.0', lastConsulted: '0.2.0' }).unread,
      ).toBe(false);
    });

    it('ignores fix-only releases', () => {
      expect(
        resolve({ currentVersion: '0.3.0', lastSeen: '0.3.0', lastConsulted: '0.2.0' }).unread,
      ).toBe(false);
    });

    it('repairs a missing or invalid lastConsulted from lastSeen', () => {
      const missing = resolve({ currentVersion: '0.2.0', lastSeen: '0.1.0' });
      expect(missing.unread).toBe(true);
      expect(missing.writes.lastConsulted).toBe('0.1.0');

      const invalid = resolve({ currentVersion: '0.2.0', lastSeen: '0.2.0', lastConsulted: 'x' });
      expect(invalid.unread).toBe(false);
      expect(invalid.writes).toEqual({ lastConsulted: '0.2.0' });
    });
  });

  describe('transitions table (data-model.md)', () => {
    it('update N → N+1 with a feature: summary and unread', () => {
      const state = resolve({ currentVersion: '0.2.0', lastSeen: '0.1.0', lastConsulted: '0.1.0' });
      expect(state.summary).not.toBeNull();
      expect(state.unread).toBe(true);
    });

    it('after closing the summary: no summary, still unread', () => {
      const state = resolve({ currentVersion: '0.2.0', lastSeen: '0.2.0', lastConsulted: '0.1.0' });
      expect(state.summary).toBeNull();
      expect(state.unread).toBe(true);
    });

    it('after opening the history: nothing left', () => {
      const state = resolve({ currentVersion: '0.2.0', lastSeen: '0.2.0', lastConsulted: '0.2.0' });
      expect(state).toEqual({ summary: null, unread: false, writes: {} });
    });

    it('update to fix-only N+2: auto-seen, no unread', () => {
      const state = resolve({ currentVersion: '0.3.0', lastSeen: '0.2.1', lastConsulted: '0.2.1' });
      expect(state.summary).toBeNull();
      expect(state.unread).toBe(false);
      expect(state.writes).toEqual({ lastSeen: '0.3.0' });
    });
  });
});
