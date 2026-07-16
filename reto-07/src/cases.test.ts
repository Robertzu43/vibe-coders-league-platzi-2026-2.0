import { CASES } from './cases';
import { classifyByRules } from './lib/rules';
import { routeFor } from './lib/route';

test('los 5 casos enrutan como se espera (vía reglas)', () => {
  expect(CASES).toHaveLength(5);
  for (const c of CASES) {
    const d = classifyByRules(c.text);
    expect(routeFor(d.prioridad), `caso: ${c.nota}`).toBe(c.esperado);
  }
});
