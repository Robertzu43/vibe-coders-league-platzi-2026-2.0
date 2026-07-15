import { describe, it, expect } from 'vitest';
import { buildReport } from './report';
import { BLOQUES, OPTIMIZACIONES } from '../data/report-blocks';
import { PREGUNTAS, ARQUETIPOS } from '../data/quiz';

const todoBajo = { web_sitio: 'ninguna', web_encuentran: 'voz', web_comprar: 'presencial',
  auto_pedidos: 'mano', auto_preguntas: 'todo', auto_facturacion: 'manual' };
const todoAlto = { web_sitio: 'moderna', web_encuentran: 'ads', web_comprar: 'checkout',
  auto_pedidos: 'sistema', auto_preguntas: 'bot', auto_facturacion: 'auto' };

describe('buildReport', () => {
  it('perfil análogo (todo bajo) devuelve 4 bloques priorizados por urgencia', () => {
    const r = buildReport(todoBajo, { puntaje_web: 0, puntaje_automatizacion: 0 });
    expect(r.arquetipo.id).toBe('analogo');
    expect(r.bloques.length).toBe(4);           // cap en 4
    expect(r.bloques[0].titulo).toBeTruthy();
    expect(r.bloques[0].cuerpo).toBeTruthy();
    expect(r.cierre).toBeTruthy();
  });
  it('perfil digital (todo alto) igual devuelve al menos 3 bloques (optimización)', () => {
    const r = buildReport(todoAlto, { puntaje_web: 100, puntaje_automatizacion: 100 });
    expect(r.arquetipo.id).toBe('digital');
    expect(r.bloques.length).toBeGreaterThanOrEqual(3);
  });
  it('selecciona el bloque específico de la debilidad', () => {
    const soloSinWeb = { ...todoAlto, web_sitio: 'ninguna' };
    const r = buildReport(soloSinWeb, { puntaje_web: 66, puntaje_automatizacion: 100 });
    expect(r.bloques.some((b) => b.id === 'web_sitio')).toBe(true);
  });

  it('cada arquetipo tiene >=3 bloques de optimización (garantiza el mínimo)', () => {
    for (const a of ARQUETIPOS) {
      expect((OPTIMIZACIONES[a.id] ?? []).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('un perfil motor con una sola debilidad igual da >=3 bloques', () => {
    const respuestas = { web_sitio: 'basica', web_encuentran: 'google', web_comprar: 'ninguna',
      auto_pedidos: 'hoja', auto_preguntas: 'guardadas', auto_facturacion: 'plantillas' };
    const r = buildReport(respuestas, { puntaje_web: 49, puntaje_automatizacion: 69 });
    expect(r.arquetipo.id).toBe('motor');
    expect(r.bloques.length).toBeGreaterThanOrEqual(3);
  });

  it('ordena las debilidades por urgencia (peso ascendente)', () => {
    const respuestas = { web_sitio: 'moderna', web_encuentran: 'ads', web_comprar: 'whatsapp',
      auto_pedidos: 'mano', auto_preguntas: 'bot', auto_facturacion: 'auto' };
    const r = buildReport(respuestas, { puntaje_web: 78, puntaje_automatizacion: 67 });
    const ids = r.bloques.map((b) => b.id);
    expect(ids.indexOf('auto_pedidos')).toBeLessThan(ids.indexOf('web_comprar'));
  });

  it('los ids de BLOQUES coinciden con las preguntas que puntúan', () => {
    expect(BLOQUES.map((b) => b.id).sort()).toEqual(PREGUNTAS.map((p) => p.id).sort());
  });
});
