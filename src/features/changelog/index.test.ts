import { describe, expect, it } from 'vitest';
import { ChangelogPage } from './index';

describe('changelog public API', () => {
  // Layout imports this barrel eagerly: the page must stay a lazy component so its code
  // is only downloaded on /profile/changelog (plan: code splitting, SC-005)
  it('exposes ChangelogPage as a lazy component', () => {
    expect((ChangelogPage as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for('react.lazy'),
    );
  });
});
