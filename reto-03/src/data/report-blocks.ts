// SERVER-ONLY. No importar desde código de cliente (scripts/). Ver "Frontera cliente/servidor".
import type { Arquetipo } from './quiz';

export interface Bloque { id: string; titulo: string; cuerpo: string; }

// Bloques disparados por una pregunta débil (id === preguntaId).
export const BLOQUES: Bloque[] = [
  { id: 'web_sitio', titulo: 'Crea tu vitrina digital',
    cuerpo: 'Sin un sitio propio, dependes de que te recuerden. Una landing simple con lo que ofreces, fotos y un botón de contacto te da presencia 24/7 y credibilidad.' },
  { id: 'web_encuentran', titulo: 'Haz que Google te encuentre',
    cuerpo: 'Si solo llegas por voz a voz, dejas clientes sobre la mesa. Un perfil de Google Business y SEO básico hacen que te encuentren justo cuando te buscan.' },
  { id: 'web_comprar', titulo: 'Deja que te compren en línea',
    cuerpo: 'Cada pedido que pasa por chat manual es fricción. Un catálogo con carrito o una agenda en línea deja que el cliente avance solo, incluso fuera de tu horario.' },
  { id: 'auto_pedidos', titulo: 'Automatiza pedidos y agenda',
    cuerpo: 'Tomar pedidos a mano no escala y genera errores. Un sistema de reservas/pedidos confirma solo, evita choques de horario y te libera para atender.' },
  { id: 'auto_preguntas', titulo: 'Un asistente que responde por ti',
    cuerpo: 'Responder lo mismo todo el día cuesta horas. Un FAQ inteligente o un bot resuelve las preguntas repetidas al instante y te deja lo importante.' },
  { id: 'auto_facturacion', titulo: 'Automatiza facturación y seguimiento',
    cuerpo: 'El seguimiento manual se olvida y se pierde recompra. Facturas y correos automáticos post-venta mantienen la relación viva sin que muevas un dedo.' },
];

// Optimizaciones por arquetipo para rellenar si el perfil ya está fuerte.
export const OPTIMIZACIONES: Record<Arquetipo['id'], Bloque[]> = {
  digital: [
    { id: 'opt_datos', titulo: 'Mide y decide con datos',
      cuerpo: 'Ya tienes la base. Un panel con tus métricas clave (conversión, recompra) te dice dónde afinar para crecer sin adivinar.' },
    { id: 'opt_fidelizacion', titulo: 'Automatiza la fidelización',
      cuerpo: 'Campañas automáticas por segmento (inactivos, mejores clientes) exprimen la base que ya construiste.' },
    { id: 'opt_integraciones', titulo: 'Conecta tus herramientas',
      cuerpo: 'Integrar web, inventario y CRM elimina la doble digitación y los errores entre sistemas.' },
  ],
  vitrina: [
    { id: 'opt_flujos', titulo: 'Mapea tus tareas repetitivas',
      cuerpo: 'Anota qué haces manual cada día; ahí están las primeras automatizaciones de alto impacto.' },
    { id: 'opt_crm', titulo: 'Centraliza a tus clientes',
      cuerpo: 'Un CRM simple guarda cada contacto, compra y conversación en un solo lugar, para que ningún seguimiento se te escape.' },
    { id: 'opt_resenas', titulo: 'Convierte clientes felices en reseñas',
      cuerpo: 'Pide reseñas automáticamente después de cada compra: prueba social que te trae más clientes sin esfuerzo.' },
  ],
  motor: [
    { id: 'opt_contenido', titulo: 'Convierte tu operación en contenido',
      cuerpo: 'Tienes el músculo operativo; muéstralo. Contenido y reseñas atraen la demanda que aún no llega.' },
    { id: 'opt_seo_local', titulo: 'Aparece cuando te buscan cerca',
      cuerpo: 'Un perfil de Google Business optimizado y SEO local hacen que te encuentren justo en tu zona.' },
    { id: 'opt_ads', titulo: 'Prueba pauta con poco presupuesto',
      cuerpo: 'Campañas digitales pequeñas y bien segmentadas atraen demanda nueva sin arriesgar mucho.' },
  ],
  analogo: [
    { id: 'opt_quickwin', titulo: 'Empieza por una sola cosa',
      cuerpo: 'No intentes todo a la vez. Elige el bloque de arriba con mayor urgencia y ejecútalo esta semana.' },
    { id: 'opt_whatsapp', titulo: 'Ordena tu WhatsApp Business',
      cuerpo: 'Catálogo, respuestas rápidas y horario: el primer paso de digitalización con el menor esfuerzo.' },
    { id: 'opt_presencia', titulo: 'Reclama tu lugar en Google y redes',
      cuerpo: 'Un perfil de Google Business y una red social activa hacen que existas cuando te buscan.' },
  ],
};
