import { base64UrlEncode, buildMime, renderHtml, renderText } from './render';
import type { ReportModel } from '../types';

const model: ReportModel = {
  window: { current: { startISO: '2026-07-10T22:00:00.000Z', endISO: '2026-07-17T22:00:00.000Z' }, previous: { startISO: 'p0', endISO: 'p1' } },
  landings: [{ scriptName: 'parla', requests: 200, errors: 2, errorRate: 0.01, cpuP50: 3, requestsPrev: 100, deltaPct: 100 }],
  totalRequests: 200, totalErrors: 2, topLanding: 'parla', requestsDeltaPct: 100,
  conversions: { leads: 4, leadsPrev: 2, leadsDeltaPct: 100, preorders: 1, preordersPrev: 0, preordersDeltaPct: null },
  alerts: [], degraded: { traffic: false, conversions: false },
};

test('base64UrlEncode: sin +, /, ni =, y decodifica de vuelta', () => {
  const s = base64UrlEncode('Hola, liga ✅');
  expect(s).not.toMatch(/[+/=]/);
  // Decodificar con atob/TextDecoder (no Buffer: el tsconfig no incluye @types/node)
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const restored = new TextDecoder().decode(bytes);
  expect(restored).toBe('Hola, liga ✅');
});

test('renderHtml incluye métricas clave y el resumen', () => {
  const html = renderHtml(model, 'Resumen ejecutivo.');
  expect(html).toContain('parla');
  expect(html).toContain('200');
  expect(html).toContain('Resumen ejecutivo.');
});

test('renderText es texto plano con las métricas', () => {
  const txt = renderText(model, 'Resumen ejecutivo.');
  expect(txt).toContain('parla');
  expect(txt).toContain('Resumen ejecutivo.');
  expect(txt).not.toContain('<');
});

test('buildMime arma multipart con ambas partes y subject codificado', () => {
  const mime = buildMime({ to: 'a@b.com', subject: 'Pulso ✅', html: '<b>h</b>', text: 't' });
  expect(mime).toContain('To: a@b.com');
  expect(mime).toContain('multipart/alternative');
  expect(mime).toContain('text/plain');
  expect(mime).toContain('text/html');
  expect(mime).toContain('=?UTF-8?B?'); // subject RFC2047
});
