import { describe, it, expect } from 'vitest';
import { knowledgeBase, factCount } from './knowledge-base';

describe('knowledgeBase', () => {
  it('tiene al menos 10 datos concretos del negocio', () => {
    expect(factCount()).toBeGreaterThanOrEqual(10);
  });

  it('incluye los campos esenciales del negocio', () => {
    expect(knowledgeBase.nombre).toBe('Parla');
    expect(knowledgeBase.idiomas.length).toBe(4);
    expect(knowledgeBase.precios.length).toBeGreaterThanOrEqual(3);
    expect(knowledgeBase.faqs.length).toBeGreaterThanOrEqual(4);
    expect(knowledgeBase.contacto.whatsapp).toContain('+57');
  });
});
