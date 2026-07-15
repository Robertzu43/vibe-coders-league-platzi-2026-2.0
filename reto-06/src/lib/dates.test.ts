import { computeWindows, formatRange } from './dates';

test('computeWindows produce ventana actual de 7d y previa contigua de 7d', () => {
  const now = Date.parse('2026-07-17T22:00:00.000Z'); // viernes 5pm Bogota
  const w = computeWindows(now);
  expect(w.current.endISO).toBe('2026-07-17T22:00:00.000Z');
  expect(w.current.startISO).toBe('2026-07-10T22:00:00.000Z');
  expect(w.previous.endISO).toBe('2026-07-10T22:00:00.000Z');
  expect(w.previous.startISO).toBe('2026-07-03T22:00:00.000Z');
});

test('formatRange muestra YYYY-MM-DD → YYYY-MM-DD', () => {
  expect(formatRange({ startISO: '2026-07-10T22:00:00.000Z', endISO: '2026-07-17T22:00:00.000Z' }))
    .toBe('2026-07-10 → 2026-07-17');
});
