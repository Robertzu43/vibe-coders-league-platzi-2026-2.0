import { summarize, ruleSummary } from './summarize';
import type { ReportModel } from '../types';

const model: ReportModel = {
  window: { current: { startISO: 'c0', endISO: 'c1' }, previous: { startISO: 'p0', endISO: 'p1' } },
  landings: [{ scriptName: 'parla', requests: 200, errors: 0, errorRate: 0, cpuP50: 3, requestsPrev: 100, deltaPct: 100 }],
  totalRequests: 200, totalErrors: 0, topLanding: 'parla', requestsDeltaPct: 100,
  conversions: { leads: 4, leadsPrev: 2, leadsDeltaPct: 100, preorders: 1, preordersPrev: 0, preordersDeltaPct: null },
  alerts: [], degraded: { traffic: false, conversions: false },
};

test('ruleSummary incluye totales y top landing', () => {
  const s = ruleSummary(model);
  expect(s).toContain('200');
  expect(s).toContain('parla');
  expect(s).toContain('4 leads');
});

test('summarize sin AI usa el fallback por reglas', async () => {
  const s = await summarize(model);
  expect(s).toContain('parla');
});

test('summarize cae al fallback si la AI lanza', async () => {
  const ai = async () => { throw new Error('AI down'); };
  const s = await summarize(model, ai);
  expect(s).toContain('parla'); // fallback determinista
});

test('summarize cae al fallback si la AI devuelve vacío', async () => {
  const ai = async () => ({ response: '   ' });
  const s = await summarize(model, ai);
  expect(s).toContain('parla');
});

test('summarize usa el texto de la AI cuando responde', async () => {
  const ai = async () => ({ response: 'Resumen IA de la semana.' });
  const s = await summarize(model, ai);
  expect(s).toBe('Resumen IA de la semana.');
});
