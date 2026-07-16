import { getAccessToken, rowFromDecision, appendRow } from './sheets';
import type { Decision } from '../types';

function jsonRes(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}
const d: Decision = { titulo: 'Botón gris', enProduccion: false, afectaNucleo: false, perdidaDatos: false, severidad: 'baja', area: 'ui', prioridad: 'backlog', razon: 'cosmético', accionSugerida: 'backlog', fuente: 'reglas' };

test('getAccessToken devuelve el token', async () => {
  const f = (async () => jsonRes({ access_token: 'ya29.x' })) as unknown as typeof fetch;
  expect(await getAccessToken({ clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl: f })).toBe('ya29.x');
});
test('getAccessToken lanza si no hay token', async () => {
  const f = (async () => jsonRes({}, false, 400)) as unknown as typeof fetch;
  await expect(getAccessToken({ clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl: f })).rejects.toThrow();
});
test('rowFromDecision arma la fila en orden', () => {
  const row = rowFromDecision(d, '2026-07-16T00:00:00Z');
  expect(row[0]).toBe('2026-07-16T00:00:00Z');
  expect(row[1]).toBe('Botón gris');
  expect(row[3]).toBe('backlog');
  expect(row).toHaveLength(10);
});
test('appendRow postea a la URL de append y lanza en error', async () => {
  let calledUrl = '';
  const okF = (async (u: string) => { calledUrl = u; return jsonRes({}); }) as unknown as typeof fetch;
  await appendRow({ sheetId: 'SID', accessToken: 't', row: ['a'], fetchImpl: okF });
  expect(calledUrl).toContain('/spreadsheets/SID/values/');
  expect(calledUrl).toContain(':append');
  const badF = (async () => jsonRes({}, false, 403)) as unknown as typeof fetch;
  await expect(appendRow({ sheetId: 'SID', accessToken: 't', row: ['a'], fetchImpl: badF })).rejects.toThrow('403');
});
