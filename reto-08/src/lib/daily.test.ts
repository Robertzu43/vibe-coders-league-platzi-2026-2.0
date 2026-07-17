import { puzzleNumber, dailyIndex, seededShuffle, mulberry32 } from './daily';

// Epoch = 2026-07-20 00:00 America/Bogotá (UTC-5) = 2026-07-20 05:00 UTC.
const atBogota = (iso: string) => new Date(iso); // pass explicit UTC instants below

describe('puzzleNumber', () => {
  it('is 1 at midday on the epoch day (Bogotá)', () => {
    // 2026-07-20 12:00 Bogotá = 17:00 UTC
    expect(puzzleNumber(new Date('2026-07-20T17:00:00Z'))).toBe(1);
  });
  it('is still 1 late on the epoch day (Bogotá 23:30 = next-day 04:30 UTC)', () => {
    expect(puzzleNumber(new Date('2026-07-21T04:30:00Z'))).toBe(1);
  });
  it('rolls to 2 after Bogotá midnight (00:30 Bogotá = 05:30 UTC)', () => {
    expect(puzzleNumber(new Date('2026-07-21T05:30:00Z'))).toBe(2);
  });
});

describe('dailyIndex', () => {
  it('stays within [0, listLen)', () => {
    for (let d = 0; d < 40; d++) {
      const when = new Date(Date.UTC(2026, 6, 20, 17) + d * 86400000);
      const idx = dailyIndex(when, 15);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(15);
    }
  });
});

describe('mulberry32 / seededShuffle', () => {
  it('is deterministic for the same seed', () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 123);
    const b = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 123);
    expect(a).toEqual(b);
  });
  it('produces a permutation (same multiset)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = seededShuffle(input, 999);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });
  it('does not mutate the input array', () => {
    const input = [1, 2, 3];
    seededShuffle(input, 7);
    expect(input).toEqual([1, 2, 3]);
  });
});
