import { triage, extractJson, buildFromParsed } from './triage';

test('extractJson saca el bloque JSON aunque venga envuelto en texto', () => {
  const j = extractJson('claro, aquí tienes: {"a":1,"b":{"c":2}} fin');
  expect(j).toEqual({ a: 1, b: { c: 2 } });
});
test('extractJson devuelve null si no hay JSON', () => {
  expect(extractJson('sin json')).toBeNull();
});
test('buildFromParsed deriva prioridad de los booleanos (no confía en la IA)', () => {
  const d = buildFromParsed({ titulo: 'X', enProduccion: false, afectaNucleo: false, perdidaDatos: true, severidad: 'baja', area: 'datos', prioridad: 'backlog', razon: 'r', accionSugerida: 'a' }, 'fallback');
  expect(d?.prioridad).toBe('P0');
  expect(d?.fuente).toBe('ia');
});
test('triage usa la IA cuando devuelve JSON válido', async () => {
  const ai = async () => ({ response: '{"titulo":"Bug","enProduccion":true,"afectaNucleo":true,"perdidaDatos":false,"severidad":"crítica","area":"pagos","razon":"r","accionSugerida":"a"}' });
  const d = await triage('checkout roto', ai);
  expect(d.fuente).toBe('ia');
  expect(d.prioridad).toBe('P0');
});
test('triage cae a reglas si la IA lanza', async () => {
  const ai = async () => { throw new Error('AI down'); };
  const d = await triage('se borran los datos al editar', ai);
  expect(d.fuente).toBe('reglas');
  expect(d.prioridad).toBe('P0');
});
test('triage cae a reglas si la IA devuelve basura', async () => {
  const ai = async () => ({ response: 'no es json' });
  const d = await triage('El botón se ve gris', ai);
  expect(d.fuente).toBe('reglas');
  expect(d.prioridad).toBe('backlog');
});
