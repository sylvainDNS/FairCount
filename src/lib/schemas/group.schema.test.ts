import { describe, expect, it } from 'vitest';
import { jointAccountSchema } from './group.schema';

describe('jointAccountSchema', () => {
  it('accepts an omitted name (optional)', () => {
    const result = jointAccountSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a valid name', () => {
    const result = jointAccountSchema.safeParse({ name: 'Compte joint' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Compte joint');
    }
  });

  it('trims surrounding whitespace', () => {
    const result = jointAccountSchema.safeParse({ name: '  Compte commun  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Compte commun');
    }
  });

  it('rejects an empty name once trimmed', () => {
    const result = jointAccountSchema.safeParse({ name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects a name longer than 100 characters', () => {
    const result = jointAccountSchema.safeParse({ name: 'x'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('accepts a name of exactly 100 characters', () => {
    const result = jointAccountSchema.safeParse({ name: 'x'.repeat(100) });
    expect(result.success).toBe(true);
  });
});
