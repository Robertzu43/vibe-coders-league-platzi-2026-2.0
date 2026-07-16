import { renderDemoPage } from './demo';
import { CASES } from '../cases';

test('la página incluye el formulario, el botón de 5 casos y llama a /triage', () => {
  const html = renderDemoPage(CASES);
  expect(html).toContain('<textarea');
  expect(html).toContain('/triage');
  expect(html).toContain('Correr 5 casos');
  expect(html).toContain('Centinela');
  expect(html).toContain('checkout');
});
