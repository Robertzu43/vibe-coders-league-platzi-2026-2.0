export interface LeadInput { nombre?: unknown; email?: unknown; negocio?: unknown; website?: unknown; }
export interface LeadData { nombre: string; email: string; negocio?: string; }
export type LeadResult = { ok: true; data: LeadData } | { ok: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLead(input: LeadInput): LeadResult {
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return { ok: false, errors: ['spam'] };
  }
  const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const negocioRaw = typeof input.negocio === 'string' ? input.negocio.trim() : '';

  const errors: string[] = [];
  if (!nombre) errors.push('El nombre es obligatorio.');
  if (!EMAIL_RE.test(email)) errors.push('El correo no es válido.');

  if (errors.length) return { ok: false, errors };
  return { ok: true, data: { nombre, email, ...(negocioRaw ? { negocio: negocioRaw } : {}) } };
}
