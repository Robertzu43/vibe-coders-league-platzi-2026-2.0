import { describe, it, expect } from 'vitest';
import { producto, PRECIO_COP, MOLIDOS } from './product';

describe('producto', () => {
  it('tiene los datos clave del lote', () => {
    expect(producto.marca).toBe('Altura');
    expect(producto.finca).toMatch(/Mirador/);
    expect(producto.sca).toBeGreaterThanOrEqual(80);
    expect(producto.notas.length).toBeGreaterThanOrEqual(3);
  });
  it('define precio y opciones de molido', () => {
    expect(PRECIO_COP).toBe(58000);
    expect(MOLIDOS.map((m) => m.value)).toEqual(['grano_entero', 'molido']);
  });
});
