import { describe, expect, it } from 'vitest';
import { calculateShares } from './share-calculation';

/**
 * Characterization tests for the existing fair-share engine. They lock in the
 * rounding behaviour (deterministic remainder absorbed by the last participant)
 * before the joint-account feature reuses this function on the payer side.
 */
describe('calculateShares', () => {
  it('splits proportionally to coefficients', () => {
    const shares = calculateShares(
      10000,
      [
        { memberId: 'a', customAmount: null },
        { memberId: 'b', customAmount: null },
      ],
      new Map([
        ['a', 60],
        ['b', 40],
      ]),
    );

    expect(shares.get('a')).toBe(6000);
    expect(shares.get('b')).toBe(4000);
  });

  it('absorbs the rounding remainder on the last participant, summing to the total', () => {
    const shares = calculateShares(
      10000,
      [
        { memberId: 'a', customAmount: null },
        { memberId: 'b', customAmount: null },
        { memberId: 'c', customAmount: null },
      ],
      new Map([
        ['a', 1],
        ['b', 1],
        ['c', 1],
      ]),
    );

    const total = [...shares.values()].reduce((sum, s) => sum + s, 0);
    expect(total).toBe(10000);
  });

  it('falls back to an equal split when total coefficient is zero', () => {
    const shares = calculateShares(
      10000,
      [
        { memberId: 'a', customAmount: null },
        { memberId: 'b', customAmount: null },
      ],
      new Map([
        ['a', 0],
        ['b', 0],
      ]),
    );

    const total = [...shares.values()].reduce((sum, s) => sum + s, 0);
    expect(total).toBe(10000);
    expect(shares.get('a')).toBe(5000);
  });

  it('honours custom amounts and fair-splits the remainder', () => {
    const shares = calculateShares(
      10000,
      [
        { memberId: 'a', customAmount: 3000 },
        { memberId: 'b', customAmount: null },
        { memberId: 'c', customAmount: null },
      ],
      new Map([
        ['b', 1],
        ['c', 1],
      ]),
    );

    expect(shares.get('a')).toBe(3000);
    expect((shares.get('b') ?? 0) + (shares.get('c') ?? 0)).toBe(7000);
  });

  it('assigns zero to fair-share participants when custom amounts consume the total', () => {
    const shares = calculateShares(
      10000,
      [
        { memberId: 'a', customAmount: 10000 },
        { memberId: 'b', customAmount: null },
      ],
      new Map([['b', 1]]),
    );

    expect(shares.get('a')).toBe(10000);
    expect(shares.get('b')).toBe(0);
  });
});
