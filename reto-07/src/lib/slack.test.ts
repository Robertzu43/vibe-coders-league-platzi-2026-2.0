import { buildSlackMessage, postSlack } from './slack';
import type { Decision } from '../types';

const d: Decision = { titulo: 'Checkout roto', enProduccion: true, afectaNucleo: true, perdidaDatos: false, severidad: 'crítica', area: 'pagos', prioridad: 'P0', razon: 'bloquea compra', accionSugerida: 'hotfix', fuente: 'ia' };

test('buildSlackMessage arma bloques con título y campos', () => {
  const m = JSON.stringify(buildSlackMessage(d, 'texto original'));
  expect(m).toContain('Checkout roto');
  expect(m).toContain('crítica');
  expect(m).toContain('pagos');
  expect(m).toContain('blocks');
});
test('postSlack lanza en HTTP no-ok', async () => {
  const f = (async () => ({ ok: false, status: 500 } as Response)) as unknown as typeof fetch;
  await expect(postSlack('https://hooks/x', { a: 1 }, f)).rejects.toThrow('500');
});
test('postSlack ok no lanza', async () => {
  const f = (async () => ({ ok: true, status: 200 } as Response)) as unknown as typeof fetch;
  await expect(postSlack('https://hooks/x', { a: 1 }, f)).resolves.toBeUndefined();
});
