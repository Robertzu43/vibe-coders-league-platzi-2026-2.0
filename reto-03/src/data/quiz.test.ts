import { describe, it, expect } from 'vitest';
import { PREGUNTAS, PREGUNTA_TIPO, ARQUETIPOS } from './quiz';

describe('quiz data', () => {
  it('tiene 6 preguntas que puntúan, 3 por eje', () => {
    expect(PREGUNTAS.length).toBe(6);
    expect(PREGUNTAS.filter((p) => p.eje === 'web').length).toBe(3);
    expect(PREGUNTAS.filter((p) => p.eje === 'automatizacion').length).toBe(3);
  });
  it('cada opción de puntaje tiene peso 0..100', () => {
    for (const p of PREGUNTAS)
      for (const o of p.opciones)
        expect(o.peso).toBeGreaterThanOrEqual(0), expect(o.peso).toBeLessThanOrEqual(100);
  });
  it('la pregunta de tipo de negocio no puntúa', () => {
    expect(PREGUNTA_TIPO.opciones.length).toBeGreaterThanOrEqual(3);
    expect((PREGUNTA_TIPO as any).eje).toBeUndefined();
  });
  it('define exactamente 4 arquetipos con cuadrante web/auto', () => {
    expect(ARQUETIPOS.length).toBe(4);
    const ids = ARQUETIPOS.map((a) => a.id).sort();
    expect(ids).toEqual(['analogo', 'digital', 'motor', 'vitrina']);
    const quadrantes = ARQUETIPOS.map((a) => `${a.web}-${a.auto}`).sort();
    expect(quadrantes).toEqual(['alto-alto', 'alto-bajo', 'bajo-alto', 'bajo-bajo']);
  });
});
