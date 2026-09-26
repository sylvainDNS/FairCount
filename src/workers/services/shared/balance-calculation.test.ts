import { describe, expect, it } from 'vitest';
import { calculatePaidShares } from './balance-calculation';
import { calculateShares } from './share-calculation';

/**
 * Coefficients are stored as coefficient * 10000. Absolute scale is irrelevant
 * to the ratio, so plain integers are used here for readability.
 */
describe('calculatePaidShares', () => {
  it('attributes the full amount to a single real payer', () => {
    const shares = calculatePaidShares(
      { paidBy: 'alice', amount: 10000 },
      false,
      ['alice', 'bob'],
      new Map([
        ['alice', 60],
        ['bob', 40],
      ]),
    );

    expect(shares.get('alice')).toBe(10000);
    expect(shares.has('bob')).toBe(false);
  });

  it('spreads a joint-account payment across members by coefficient', () => {
    const shares = calculatePaidShares(
      { paidBy: 'joint', amount: 10000 },
      true,
      ['alice', 'bob'],
      new Map([
        ['alice', 60],
        ['bob', 40],
      ]),
    );

    expect(shares.get('alice')).toBe(6000);
    expect(shares.get('bob')).toBe(4000);
    expect(shares.has('joint')).toBe(false);
  });

  it('produces a zero-sum net effect for a personal purchase paid by the joint account', () => {
    const coefficients = new Map([
      ['alice', 60],
      ['bob', 40],
    ]);
    // 100.00 € paid by the joint account, consumed by Alice alone.
    const paid = calculatePaidShares(
      { paidBy: 'joint', amount: 10000 },
      true,
      ['alice', 'bob'],
      coefficients,
    );
    const owed = calculateShares(10000, [{ memberId: 'alice', customAmount: null }], coefficients);

    const net = (id: string) => (paid.get(id) ?? 0) - (owed.get(id) ?? 0);
    expect(net('alice')).toBe(-4000);
    expect(net('bob')).toBe(4000);
    expect(net('alice') + net('bob')).toBe(0);
  });

  it('absorbs rounding remainders so the distributed total equals the amount', () => {
    const shares = calculatePaidShares(
      { paidBy: 'joint', amount: 10000 },
      true,
      ['a', 'b', 'c'],
      new Map([
        ['a', 1],
        ['b', 1],
        ['c', 1],
      ]),
    );

    const total = [...shares.values()].reduce((sum, s) => sum + s, 0);
    expect(total).toBe(10000);
  });

  it('gives a zero share to a member with a zero coefficient', () => {
    const shares = calculatePaidShares(
      { paidBy: 'joint', amount: 10000 },
      true,
      ['alice', 'bob'],
      new Map([
        ['alice', 100],
        ['bob', 0],
      ]),
    );

    expect(shares.get('alice')).toBe(10000);
    expect(shares.get('bob')).toBe(0);
  });

  it('only distributes to the provided active persons (never the joint account)', () => {
    const shares = calculatePaidShares(
      { paidBy: 'joint', amount: 9000 },
      true,
      ['alice', 'bob'],
      new Map([
        ['alice', 50],
        ['bob', 50],
        ['joint', 0],
      ]),
    );

    expect([...shares.keys()].sort()).toEqual(['alice', 'bob']);
  });
});
