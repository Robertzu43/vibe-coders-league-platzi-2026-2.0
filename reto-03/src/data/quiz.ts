export type Eje = 'web' | 'automatizacion';

export interface Opcion {
  id: string;
  label: string;
  peso: number;
}
export interface Pregunta {
  id: string;
  eje: Eje;
  texto: string;
  opciones: Opcion[];
}
export interface PreguntaTipo {
  id: 'tipo';
  texto: string;
  opciones: { id: string; label: string }[];
}

export const PREGUNTA_TIPO: PreguntaTipo = {
  id: 'tipo',
  texto: '¿Qué tipo de negocio tienes?',
  opciones: [
    { id: 'restaurante', label: 'Restaurante / café' },
    { id: 'retail', label: 'Tienda / retail' },
    { id: 'servicios', label: 'Servicios profesionales' },
    { id: 'salud', label: 'Salud / belleza' },
    { id: 'otro', label: 'Otro' },
  ],
};

export const PREGUNTAS: Pregunta[] = [
  {
    id: 'web_sitio',
    eje: 'web',
    texto: '¿Tienes página web propia?',
    opciones: [
      { id: 'ninguna', label: 'No, ninguna', peso: 0 },
      { id: 'redes', label: 'Solo redes sociales', peso: 33 },
      { id: 'basica', label: 'Sí, pero básica o desactualizada', peso: 66 },
      { id: 'moderna', label: 'Sí, moderna y activa', peso: 100 },
    ],
  },
  {
    id: 'web_encuentran',
    eje: 'web',
    texto: '¿Cómo te encuentran nuevos clientes hoy?',
    opciones: [
      { id: 'voz', label: 'Voz a voz / recomendaciones', peso: 0 },
      { id: 'redes', label: 'Redes sociales', peso: 40 },
      { id: 'google', label: 'Aparezco en Google', peso: 80 },
      { id: 'ads', label: 'Publicidad digital activa', peso: 100 },
    ],
  },
  {
    id: 'web_comprar',
    eje: 'web',
    texto: '¿Un cliente puede comprar o agendar contigo en línea?',
    opciones: [
      { id: 'presencial', label: 'No, todo es presencial o por teléfono', peso: 0 },
      { id: 'whatsapp', label: 'Por WhatsApp, a mano', peso: 33 },
      { id: 'formulario', label: 'Sí, por un formulario o catálogo', peso: 66 },
      { id: 'checkout', label: 'Sí, checkout / agenda en línea completa', peso: 100 },
    ],
  },
  {
    id: 'auto_pedidos',
    eje: 'automatizacion',
    texto: '¿Cómo tomas pedidos o agendas citas?',
    opciones: [
      { id: 'mano', label: 'A mano (papel o de memoria)', peso: 0 },
      { id: 'whatsapp', label: 'Por WhatsApp / llamadas, manual', peso: 33 },
      { id: 'hoja', label: 'En una hoja de cálculo', peso: 66 },
      { id: 'sistema', label: 'Un sistema que lo gestiona solo', peso: 100 },
    ],
  },
  {
    id: 'auto_preguntas',
    eje: 'automatizacion',
    texto: '¿Respondes las mismas preguntas de clientes una y otra vez?',
    opciones: [
      { id: 'todo', label: 'Sí, todo el día a mano', peso: 0 },
      { id: 'aveces', label: 'A veces', peso: 40 },
      { id: 'guardadas', label: 'Tengo respuestas guardadas', peso: 70 },
      { id: 'bot', label: 'Un bot / FAQ responde por mí', peso: 100 },
    ],
  },
  {
    id: 'auto_facturacion',
    eje: 'automatizacion',
    texto: '¿Cómo manejas facturación y seguimiento post-venta?',
    opciones: [
      { id: 'manual', label: 'Manual, cuando me acuerdo', peso: 0 },
      { id: 'organizado', label: 'Manual pero organizado', peso: 40 },
      { id: 'plantillas', label: 'Con plantillas / recordatorios', peso: 70 },
      { id: 'auto', label: 'Automatizado (correos / CRM)', peso: 100 },
    ],
  },
];

export interface Arquetipo {
  id: 'analogo' | 'motor' | 'vitrina' | 'digital';
  label: string;
  emoji: string;
  web: 'alto' | 'bajo';
  auto: 'alto' | 'bajo';
  resumen: string;
}

export const ARQUETIPOS: Arquetipo[] = [
  {
    id: 'analogo',
    label: 'Negocio Análogo',
    emoji: '🌱',
    web: 'bajo',
    auto: 'bajo',
    resumen:
      'Todo funciona a pulso. Es el punto de mayor oportunidad: pequeños cambios digitales se notan enseguida.',
  },
  {
    id: 'motor',
    label: 'Motor sin Vitrina',
    emoji: '⚙️',
    web: 'bajo',
    auto: 'alto',
    resumen:
      'Operas ordenado por dentro, pero pocos te encuentran. Te falta vitrina digital para que ese motor rinda.',
  },
  {
    id: 'vitrina',
    label: 'Vitrina Manual',
    emoji: '📣',
    web: 'alto',
    auto: 'bajo',
    resumen:
      'Tienes presencia y te ven, pero pierdes horas en tareas manuales. Automatizar te libera tiempo real.',
  },
  {
    id: 'digital',
    label: 'Digital en Marcha',
    emoji: '🚀',
    web: 'alto',
    auto: 'alto',
    resumen: 'Vas muy bien. Ahora se trata de optimizar y exprimir lo que ya tienes.',
  },
];
