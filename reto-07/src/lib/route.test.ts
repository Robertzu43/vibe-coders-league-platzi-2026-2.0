import { priorityFromFlags, routeFor } from './route';

test('perdidaDatos sola → P0 aunque enProduccion sea false', () => {
  expect(priorityFromFlags({ perdidaDatos: true, enProduccion: false, afectaNucleo: false })).toBe('P0');
});
test('producción + núcleo → P0', () => {
  expect(priorityFromFlags({ perdidaDatos: false, enProduccion: true, afectaNucleo: true })).toBe('P0');
});
test('producción sin núcleo → backlog', () => {
  expect(priorityFromFlags({ perdidaDatos: false, enProduccion: true, afectaNucleo: false })).toBe('backlog');
});
test('nada → backlog', () => {
  expect(priorityFromFlags({ perdidaDatos: false, enProduccion: false, afectaNucleo: false })).toBe('backlog');
});
test('routeFor mapea prioridad → ruta', () => {
  expect(routeFor('P0')).toBe('urgente');
  expect(routeFor('backlog')).toBe('registrar');
});
