export type ChangelogCategory = 'feature' | 'improvement' | 'fix';

export interface ChangelogChange {
  readonly category: ChangelogCategory;
  readonly text: string;
}

export interface ChangelogRelease {
  readonly version: string;
  // ISO date `YYYY-MM-DD`, interpreted as a local date
  readonly date: string;
  readonly changes: readonly ChangelogChange[];
}

export interface ChangelogDigest {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly date: string;
  readonly features: readonly string[];
  readonly improvements: readonly string[];
  readonly fixCount: number;
}

export interface ChangelogWrites {
  readonly lastSeen?: string | undefined;
  readonly lastConsulted?: string | undefined;
}

export interface ChangelogState {
  readonly summary: ChangelogDigest | null;
  readonly unread: boolean;
  readonly writes: ChangelogWrites;
}
