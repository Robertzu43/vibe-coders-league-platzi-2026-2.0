import { describe, it, expect } from 'vitest';
import { validateLead } from './validation';

const base = { nombre: 'Ana', email: 'ana@correo.com', negocio: 'Café Luna', website: '' };

describe('validateLead', () => {
  it('acepta un lead válido y normaliza', () => {
    const r = validateLead(base);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.data.nombre).toBe('Ana'); expect(r.data.negocio).toBe('Café Luna'); }
  });
  it('negocio es opcional', () => {
    const r = validateLead({ ...base, negocio: '' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.negocio).toBeUndefined();
  });
  it('rechaza email inválido', () => expect(validateLead({ ...base, email: 'no-email' }).ok).toBe(false));
  it('rechaza nombre vacío', () => expect(validateLead({ ...base, nombre: '  ' }).ok).toBe(false));
  it('rechaza si el honeypot viene lleno (bot)', () => {
    const r = validateLead({ ...base, website: 'http://spam' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toBe('spam');
  });
});
