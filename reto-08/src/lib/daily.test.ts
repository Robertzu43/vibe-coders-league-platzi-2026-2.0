import { puzzleNumber, dailyIndex, seededShuffle, mulberry32 } from './daily';
import { terms } from '../data/words';

// Epoch = 2026-07-20 00:00 America/Bogotá (UTC-5) = 2026-07-20 05:00 UTC.

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

// Golden test (spec §8): el orden barajado de words.ts con la semilla fija debe ser
// estable. Si este test falla, alguien reordenó/añadió términos en words.ts y con eso
// cambió qué palabra cae en cada puzzle ya publicado. La semilla debe coincidir con
// SHUFFLE_SEED en scripts/game-ui.ts.
describe('daily puzzle order stability', () => {
  const PUZZLE_SEED = 20260720;
  const EXPECTED_ORDER = [
    'QUERY', 'PROMPT', 'ASTRO', 'FIGMA', 'HTML', 'SEGURIDAD', 'API', 'DATOS',
    'SERVIDOR', 'NUBES', 'CACHE', 'LINUX', 'REACT', 'NODEJS', 'PYTHON', 'CSS',
    'KUBERNETES', 'GITHUB', 'TYPESCRIPT', 'MODELO', 'BACKEND', 'TOKEN', 'ARRAY',
    'CLASE', 'DEBUG', 'FRONTEND', 'FUNCION', 'DOCKER', 'VARIABLE', 'ALGORITMO',
  ];

  it('keeps a stable shuffled order for the fixed seed', () => {
    const order = seededShuffle(terms, PUZZLE_SEED).map((t) => t.word);
    expect(order).toEqual(EXPECTED_ORDER);
  });

  it('maps puzzle #1 (epoch day) to index 0 of the shuffled order', () => {
    const epoch = new Date('2026-07-20T17:00:00Z'); // 2026-07-20 Bogotá = puzzle #1
    expect(dailyIndex(epoch, terms.length)).toBe(0);
  });
});
