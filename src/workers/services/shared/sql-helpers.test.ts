// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { selectByIdsChunked } from './sql-helpers';

describe('selectByIdsChunked', () => {
  it('returns empty array and does not call fetcher when ids is empty', async () => {
    const fetcher = vi.fn();
    const result = await selectByIdsChunked([], fetcher);
    expect(result).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('makes a single call when ids fit in one chunk (50 ids)', async () => {
    const ids = Array.from({ length: 50 }, (_, i) => `id-${i}`);
    const fetcher = vi.fn(async (chunk: readonly string[]) =>
      chunk.map((id) => ({ id, value: id.toUpperCase() })),
    );

    const result = await selectByIdsChunked(ids, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(ids);
    expect(result).toHaveLength(50);
    expect(result[0]).toEqual({ id: 'id-0', value: 'ID-0' });
  });

  it('makes a single call when ids are exactly at the default limit (100 ids)', async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `id-${i}`);
    const fetcher = vi.fn(async (chunk: readonly string[]) => chunk.map((id) => ({ id })));

    const result = await selectByIdsChunked(ids, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toHaveLength(100);
    expect(result).toHaveLength(100);
  });

  it('chunks 250 ids into 3 calls (100/100/50) and concatenates results in order', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `id-${i}`);
    const fetcher = vi.fn(async (chunk: readonly string[]) => chunk.map((id) => ({ id })));

    const result = await selectByIdsChunked(ids, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0]?.[0]).toHaveLength(100);
    expect(fetcher.mock.calls[1]?.[0]).toHaveLength(100);
    expect(fetcher.mock.calls[2]?.[0]).toHaveLength(50);

    expect(result).toHaveLength(250);
    expect(result.map((r) => r.id)).toEqual(ids);
  });

  it('respects custom chunkSize option', async () => {
    const ids = Array.from({ length: 200 }, (_, i) => `id-${i}`);
    const fetcher = vi.fn(async (chunk: readonly string[]) => chunk.map((id) => ({ id })));

    const result = await selectByIdsChunked(ids, fetcher, { chunkSize: 50 });

    expect(fetcher).toHaveBeenCalledTimes(4);
    for (const call of fetcher.mock.calls) {
      expect(call[0]).toHaveLength(50);
    }
    expect(result).toHaveLength(200);
    expect(result.map((r) => r.id)).toEqual(ids);
  });

  it('throws when chunkSize is zero or negative', async () => {
    const ids = ['a', 'b', 'c'];
    const fetcher = vi.fn();

    await expect(selectByIdsChunked(ids, fetcher, { chunkSize: 0 })).rejects.toThrow();
    await expect(selectByIdsChunked(ids, fetcher, { chunkSize: -1 })).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('preserves original id order across chunk boundaries', async () => {
    const ids = ['z', 'a', 'm', 'b', 'q'];
    const fetcher = vi.fn(async (chunk: readonly string[]) => chunk.map((id) => ({ id })));

    const result = await selectByIdsChunked(ids, fetcher, { chunkSize: 2 });

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0]?.[0]).toEqual(['z', 'a']);
    expect(fetcher.mock.calls[1]?.[0]).toEqual(['m', 'b']);
    expect(fetcher.mock.calls[2]?.[0]).toEqual(['q']);
    expect(result.map((r) => r.id)).toEqual(['z', 'a', 'm', 'b', 'q']);
  });
});
