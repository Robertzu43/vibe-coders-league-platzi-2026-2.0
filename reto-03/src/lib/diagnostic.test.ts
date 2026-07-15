import { describe, it, expect } from 'vitest';
import { scoreQuiz, archetypeFor } from './diagnostic';

const todoAlto = { web_sitio: 'moderna', web_encuentran: 'ads', web_comprar: 'checkout',
  auto_pedidos: 'sistema', auto_preguntas: 'bot', auto_facturacion: 'auto' };
const todoBajo = { web_sitio: 'ninguna', web_encuentran: 'voz', web_comprar: 'presencial',
  auto_pedidos: 'mano', auto_preguntas: 'todo', auto_facturacion: 'manual' };

describe('scoreQuiz', () => {
  it('todo alto → 100/100', () => {
    expect(scoreQuiz(todoAlto)).toEqual({ puntaje_web: 100, puntaje_automatizacion: 100 });
  });
  it('todo bajo → 0/0', () => {
    expect(scoreQuiz(todoBajo)).toEqual({ puntaje_web: 0, puntaje_automatizacion: 0 });
  });
  it('promedia por eje y redondea', () => {
    const r = scoreQuiz({ ...todoBajo, web_sitio: 'basica' }); // web: (66+0+0)/3 = 22
    expect(r.puntaje_web).toBe(22);
    expect(r.puntaje_automatizacion).toBe(0);
  });
  it('opción desconocida o faltante cuenta como 0', () => {
    const r = scoreQuiz({ web_sitio: 'inexistente' } as any);
    expect(r.puntaje_web).toBe(0);
    expect(r.puntaje_automatizacion).toBe(0);
  });
});

describe('archetypeFor', () => {
  it('bajo/bajo → analogo', () => expect(archetypeFor({ puntaje_web: 20, puntaje_automatizacion: 10 }).id).toBe('analogo'));
  it('bajo web, alto auto → motor', () => expect(archetypeFor({ puntaje_web: 30, puntaje_automatizacion: 70 }).id).toBe('motor'));
  it('alto web, bajo auto → vitrina', () => expect(archetypeFor({ puntaje_web: 80, puntaje_automatizacion: 20 }).id).toBe('vitrina'));
  it('alto/alto → digital', () => expect(archetypeFor({ puntaje_web: 60, puntaje_automatizacion: 90 }).id).toBe('digital'));
  it('el umbral 50 cuenta como alto', () => expect(archetypeFor({ puntaje_web: 50, puntaje_automatizacion: 50 }).id).toBe('digital'));
});
