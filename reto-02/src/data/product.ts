export const PRECIO_COP = 58000;
export const ENVIO_GRATIS_COP = 200000;
export const LOTE_TOTAL = 300;
export const LOTE_RESERVADAS = 128; // número de marketing estático (MVP; ver spec §6)

export const MOLIDOS = [
  { value: 'grano_entero', label: 'Grano entero' },
  { value: 'molido', label: 'Molido' },
] as const;

export const producto = {
  marca: 'Altura',
  eslogan: 'Un lote. Una cosecha. Tuyo.',
  descripcion:
    'Café de especialidad colombiano de un solo lote y una sola cosecha. Lo tostamos cuando lo pides y lo enviamos fresco desde el origen.',
  finca: 'Finca El Mirador',
  region: 'Pitalito, Huila, Colombia',
  altitud: '1.850 msnm',
  variedad: 'Caturra',
  proceso: 'Lavado',
  sca: 86.5,
  notas: ['Panela', 'Mandarina', 'Chocolate con leche'] as string[],
  presentacion: 'Bolsa de 340 g',
  pasos: [
    { t: 'Reservas', d: 'Aseguras tu bolsa de este lote limitado.' },
    { t: 'Tostamos al pedir', d: 'Tostamos tu café solo después de tu reserva, para máxima frescura.' },
    { t: 'Enviamos fresco', d: 'Despachamos desde el origen a tu ciudad.' },
  ],
  faqs: [
    { q: '¿Cuándo llega mi café?', a: 'Tostamos y despachamos dentro de los 5 días hábiles siguientes a tu reserva.' },
    { q: '¿El envío tiene costo?', a: 'El envío se calcula al despacho y es gratis en pedidos sobre $200.000 COP.' },
    { q: '¿Puedo cancelar mi reserva?', a: 'Sí, puedes cancelar sin costo antes de que tostemos tu lote.' },
  ],
  contacto: { correo: 'hola@altura.cafe', instagram: '@altura.cafe' },
} as const;
