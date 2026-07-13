export interface PreorderInput {
  nombre?: unknown; email?: unknown; ciudad?: unknown;
  cantidad?: unknown; molido?: unknown; website?: unknown;
}
export interface PreorderData {
  nombre: string; email: string; ciudad: string; cantidad: number; molido: 'grano_entero' | 'molido';
}
export type ValidationResult =
  | { ok: true; data: PreorderData }
  | { ok: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOLIDOS = ['grano_entero', 'molido'];

export function validatePreorder(input: PreorderInput): ValidationResult {
  const errors: string[] = [];

  // Honeypot: si viene con contenido, es un bot -> rechazar.
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return { ok: false, errors: ['spam'] };
  }

  const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const ciudad = typeof input.ciudad === 'string' ? input.ciudad.trim() : '';
  const molido = typeof input.molido === 'string' ? input.molido : '';
  const cantidad =
    typeof input.cantidad === 'number' || typeof input.cantidad === 'string'
      ? Number(input.cantidad)
      : NaN;

  if (!nombre) errors.push('El nombre es obligatorio.');
  if (!EMAIL_RE.test(email)) errors.push('El correo no es válido.');
  if (!ciudad) errors.push('La ciudad es obligatoria.');
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 5) errors.push('La cantidad debe estar entre 1 y 5.');
  if (!MOLIDOS.includes(molido)) errors.push('Elige un tipo de molido válido.');

  if (errors.length) return { ok: false, errors };
  return { ok: true, data: { nombre, email, ciudad, cantidad, molido: molido as PreorderData['molido'] } };
}
