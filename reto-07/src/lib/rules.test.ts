import { classifyByRules } from './rules';

test('bug de pérdida de datos → perdidaDatos true, P0', () => {
  const d = classifyByRules('Al editar un registro se borran los datos de otros registros.');
  expect(d.perdidaDatos).toBe(true);
  expect(d.prioridad).toBe('P0');
  expect(d.fuente).toBe('reglas');
});
test('checkout 500 en producción → prod + núcleo, P0', () => {
  const d = classifyByRules('El checkout tira error 500 al pagar en producción.');
  expect(d.enProduccion).toBe(true);
  expect(d.afectaNucleo).toBe(true);
  expect(d.prioridad).toBe('P0');
});
test('bug solo en local → no producción → backlog', () => {
  const d = classifyByRules('La app falla solo en mi entorno local con Node 18, en dev.');
  expect(d.enProduccion).toBe(false);
  expect(d.prioridad).toBe('backlog');
});
test('cosmético → baja severidad, backlog', () => {
  const d = classifyByRules('El botón de ayuda se ve gris y desalineado en móvil.');
  expect(d.prioridad).toBe('backlog');
  expect(d.severidad).toBe('baja');
});
