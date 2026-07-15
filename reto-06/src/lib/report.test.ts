import { buildReport } from './report';
import type { Windows } from '../types';

const win: Windows = {
  current: { startISO: 'c0', endISO: 'c1' },
  previous: { startISO: 'p0', endISO: 'p1' },
};

test('buildReport calcula totales, topLanding, deltas y alertas', () => {
  const m = buildReport({
    window: win,
    currentTraffic: [
      { scriptName: 'parla', requests: 200, errors: 20, subrequests: 0, cpuP50: 3, cpuP99: 9 }, // errorRate 10% > 5%
      { scriptName: 'golazo', requests: 50, errors: 0, subrequests: 0, cpuP50: 2, cpuP99: 8 },
    ],
    previousTraffic: [
      { scriptName: 'parla', requests: 100, errors: 1, subrequests: 0, cpuP50: 3, cpuP99: 9 },
      { scriptName: 'golazo', requests: 200, errors: 0, subrequests: 0, cpuP50: 2, cpuP99: 8 }, // caída -75% < -30%
    ],
    currentConversions: { leads: 4, preorders: 2 },
    previousConversions: { leads: 2, preorders: 0 },
    degraded: { traffic: false, conversions: false },
  });

  expect(m.totalRequests).toBe(250);
  expect(m.totalErrors).toBe(20);
  expect(m.topLanding).toBe('parla');
  expect(m.requestsDeltaPct).toBeCloseTo(-16.666, 1); // 250 vs 300
  const parla = m.landings.find(l => l.scriptName === 'parla')!;
  expect(parla.deltaPct).toBe(100); // 200 vs 100
  expect(m.conversions.leadsDeltaPct).toBe(100);
  expect(m.conversions.preordersDeltaPct).toBeNull(); // prev 0
  expect(m.alerts.some(a => a.includes('parla') && a.includes('error'))).toBe(true);
  expect(m.alerts.some(a => a.includes('golazo'))).toBe(true);
});

test('buildReport con listas vacías no rompe', () => {
  const m = buildReport({
    window: win, currentTraffic: [], previousTraffic: [],
    currentConversions: { leads: 0, preorders: 0 },
    previousConversions: { leads: 0, preorders: 0 },
    degraded: { traffic: true, conversions: false },
  });
  expect(m.totalRequests).toBe(0);
  expect(m.topLanding).toBeNull();
  expect(m.requestsDeltaPct).toBeNull();
  expect(m.degraded.traffic).toBe(true);
});
