import { describe, it, expect } from 'vitest';
import { validatePreorder } from './validation';

const base = { nombre: 'Ana', email: 'ana@correo.com', ciudad: 'Bogotá', cantidad: 2, molido: 'molido', website: '' };

describe('validatePreorder', () => {
  it('acepta una pre-orden válida y normaliza cantidad', () => {
    const r = validatePreorder(base);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.data.cantidad).toBe(2); expect(r.data.email).toBe('ana@correo.com'); }
  });
  it('rechaza email inválido', () => {
    expect(validatePreorder({ ...base, email: 'no-es-email' }).ok).toBe(false);
  });
  it('rechaza campos requeridos vacíos', () => {
    expect(validatePreorder({ ...base, nombre: '' }).ok).toBe(false);
    expect(validatePreorder({ ...base, ciudad: '  ' }).ok).toBe(false);
  });
  it('rechaza cantidad fuera de 1..5', () => {
    expect(validatePreorder({ ...base, cantidad: 0 }).ok).toBe(false);
    expect(validatePreorder({ ...base, cantidad: 6 }).ok).toBe(false);
  });
  it('rechaza molido inválido', () => {
    expect(validatePreorder({ ...base, molido: 'polvo' }).ok).toBe(false);
  });
  it('rechaza si el honeypot viene lleno (bot)', () => {
    expect(validatePreorder({ ...base, website: 'http://spam' }).ok).toBe(false);
  });
});
