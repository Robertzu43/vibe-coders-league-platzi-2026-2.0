export interface Idioma {
  nombre: string;
  bandera: string;
  codigo: string;
}
export interface Precio {
  plan: string;
  valor: string;
  detalle: string;
}
export interface Faq {
  pregunta: string;
  respuesta: string;
}

export const knowledgeBase = {
  nombre: 'Parla',
  eslogan: 'Idiomas sin miedo',
  descripcion:
    'Academia de idiomas online y presencial en Bogotá. Enseñamos las 4 lenguas más habladas del mundo.',
  idiomas: [
    { nombre: 'Inglés', bandera: '🇬🇧', codigo: 'en' },
    { nombre: 'Mandarín', bandera: '🇨🇳', codigo: 'zh' },
    { nombre: 'Hindi', bandera: '🇮🇳', codigo: 'hi' },
    { nombre: 'Español', bandera: '🇪🇸', codigo: 'es' },
  ] as Idioma[],
  modalidades: [
    'Grupal (máximo 8 personas)',
    'Clases 1-a-1 privadas',
    'Online en vivo',
  ],
  niveles: 'MCER A1 → C2 (aprox. 3 meses por nivel en modalidad grupal)',
  precios: [
    { plan: 'Curso grupal', valor: '$189.000 COP/mes', detalle: '8 clases/mes (2 por semana)' },
    { plan: 'Clase 1-a-1', valor: '$55.000 COP', detalle: 'sesión de 60 minutos' },
    { plan: 'Plan intensivo', valor: '$650.000 COP/mes', detalle: 'clase diaria de lunes a viernes' },
    { plan: 'Clase de prueba', valor: 'Gratis', detalle: '1 clase sin costo' },
  ] as Precio[],
  horarios: 'Lunes a viernes 6:00am–9:00pm · Sábados 8:00am–1:00pm · Domingos cerrado',
  sede: 'Chapinero, Bogotá (Calle 63 #11-45) + campus online',
  pagos: 'PSE, tarjeta de crédito/débito, Nequi y efectivo en sede',
  reembolso: 'Reembolso del 100% si cancelas dentro de los primeros 7 días del mes; después no hay reembolso.',
  congelamiento: 'Puedes congelar tu plan hasta 1 mes por semestre sin costo.',
  certificacion: 'Certificado de nivel MCER al aprobar (nota ≥ 70%). Preparamos para TOEFL, IELTS y HSK.',
  descuentos: '15% de descuento pagando el semestre completo. 2x1 trayendo un amigo el primer mes.',
  profesores: 'Profesores nativos y certificados. Ratio máximo de 8 alumnos por grupo.',
  contacto: {
    whatsapp: '+57 300 123 4567',
    correo: 'hola@parla.co',
    instagram: '@parla.idiomas',
  },
  faqs: [
    { pregunta: '¿Ofrecen clase de prueba?', respuesta: 'Sí, la primera clase es gratis.' },
    { pregunta: '¿Cómo puedo pagar?', respuesta: 'PSE, tarjeta, Nequi o efectivo en la sede.' },
    { pregunta: '¿Dan certificado?', respuesta: 'Sí, un certificado de nivel MCER al aprobar con nota ≥ 70%.' },
    { pregunta: '¿Puedo congelar mi plan?', respuesta: 'Sí, hasta 1 mes por semestre sin costo.' },
    { pregunta: '¿Hay descuentos?', respuesta: '15% pagando el semestre completo y 2x1 trayendo un amigo el primer mes.' },
  ] as Faq[],
} as const;

/** Cuenta los datos concretos del negocio expuestos en la KB. */
export function factCount(): number {
  return (
    knowledgeBase.idiomas.length +
    knowledgeBase.precios.length +
    knowledgeBase.faqs.length +
    // datos escalares: niveles, horarios, sede, pagos, reembolso, congelamiento, certificacion, descuentos, profesores, modalidades, contacto
    11
  );
}
