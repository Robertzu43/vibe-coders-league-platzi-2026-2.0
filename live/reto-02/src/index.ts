/// <reference types="@cloudflare/workers-types" />
import { board } from './board.ts';

export interface Env {
  AI: Ai;
  DB: D1Database;
  TG_TOKEN: string;
  TG_SECRET: string;
}

export const ESTADOS = ['nuevo', 'curso', 'trabado', 'listo'] as const;
export type Estado = (typeof ESTADOS)[number];

export interface Ticket {
  titulo: string;
  detalle: string;
  prioridad: 'alta' | 'media' | 'baja';
  area: string;
  automatizable: boolean;
  accion: string;
}

const SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    prioridad: { type: 'string', enum: ['alta', 'media', 'baja'] },
    area: { type: 'string' },
    automatizable: { type: 'boolean' },
    accion: { type: 'string' },
  },
  required: ['titulo', 'prioridad', 'area', 'automatizable', 'accion'],
} as const;

/** Tareas de software/accesos que un bot resuelve sin manos humanas. */
const AUTOMATIZABLE = /contrase|password|credencial|clave|acceso|permiso|vpn|licencia|correo|email|cuenta|usuario|resetea|reinici|bloquead|desbloque|instal|suscripci|factura|recibo|reporte|export/;
/** Nada físico se automatiza, aunque la frase mencione software. */
const FISICO = /puerta|foco|bombill|llave|cerradur|máquina|maquina|motor|caj[óo]n|estanter|piso|techo|goter|fuga|camion|cami[óo]n|llanta|caf[ée]tera|impresora|papel|tóner|toner|cable|silla|escritorio/;

/** Reglas: lo que corre si la IA falla. Nunca perdemos el mensaje. */
export function porReglas(texto: string): Ticket {
  const t = texto.trim();
  const bajo = t.toLowerCase();
  const urgente = /urge|urgent|ya|hoy|caí|cai[oó]|parad|no funciona|se dañ|grave|cliente/.test(bajo);
  const leve = /cuando pueda|algún d|algun d|no corre prisa|menor|detalle/.test(bajo);
  const auto = AUTOMATIZABLE.test(bajo) && !FISICO.test(bajo);
  return {
    titulo: t.length > 70 ? t.slice(0, 67).trimEnd() + '…' : t,
    detalle: t,
    prioridad: urgente ? 'alta' : leve ? 'baja' : 'media',
    area: auto ? 'sistemas' : 'general',
    automatizable: auto,
    accion: auto ? 'Ejecutar el trámite de sistemas y avisar a quien lo pidió' : '',
  };
}

export async function extraer(ai: Ai, texto: string): Promise<Ticket> {
  try {
    const r = (await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        {
          role: 'system',
          content: [
            'Convertís mensajes de chat de trabajadores en tickets. Devolvé JSON en español:',
            '- titulo: imperativo, máximo 70 caracteres.',
            '- prioridad: "alta" si afecta clientes o producción o dice urgente; "baja" si es cosmético o "cuando puedas"; si no, "media".',
            '- area: una palabra (taller, bodega, ventas, sistemas, limpieza, entregas, general).',
            '- automatizable: true SOLO si un bot puede resolverlo entero sin manos humanas, por software: resetear contraseñas, dar o quitar accesos y permisos, desbloquear cuentas, reenviar una factura o un recibo, generar un reporte, instalar o renovar una licencia. false para cualquier cosa física, presencial, o que necesite decisión humana.',
            '- accion: si automatizable es true, la acción concreta en una frase corta y en infinitivo (ej: "Enviar correo de restablecimiento de contraseña"). Si es false, string vacío.',
          ].join('\n'),
        },
        { role: 'user', content: texto },
      ],
      response_format: { type: 'json_schema', json_schema: SCHEMA },
    })) as { response?: unknown };

    // GOTCHA reto-07: con json_schema, `response` ya viene parseado como objeto.
    const raw = r.response;
    const o = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Partial<Ticket>;
    if (!o?.titulo) throw new Error('sin titulo');

    // La IA propone, las reglas vetan: nada físico se marca como automatizable.
    const auto = o.automatizable === true && !FISICO.test(texto.toLowerCase());
    const accion = auto ? String(o.accion ?? '').trim() : '';
    return {
      titulo: String(o.titulo).slice(0, 70),
      detalle: texto,
      prioridad: o.prioridad === 'alta' || o.prioridad === 'baja' ? o.prioridad : 'media',
      area: (o.area ? String(o.area) : 'general').toLowerCase().slice(0, 20),
      automatizable: auto && accion.length > 0,
      accion: accion.slice(0, 120),
    };
  } catch {
    return porReglas(texto);
  }
}

async function guardar(db: D1Database, t: Ticket, autor: string) {
  await db
    .prepare(
      'insert into tickets (titulo, detalle, prioridad, area, autor, automatizable, accion) values (?,?,?,?,?,?,?)',
    )
    .bind(t.titulo, t.detalle, t.prioridad, t.area, autor, t.automatizable ? 1 : 0, t.accion)
    .run();
}

const COLUMNAS =
  'id, titulo, detalle, prioridad, area, autor, estado, creado, automatizable, accion, resuelto';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      return new Response(board, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    if (url.pathname === '/api/tickets') {
      const { results } = await env.DB.prepare(
        'select ' + COLUMNAS + ' from tickets order by id desc',
      ).all();
      return json(results);
    }

    if (url.pathname === '/api/move' && req.method === 'POST') {
      const { id, estado } = (await req.json()) as { id?: number; estado?: string };
      if (!id || !ESTADOS.includes(estado as Estado)) return json({ error: 'datos inválidos' }, 400);
      await env.DB.prepare('update tickets set estado = ? where id = ?').bind(estado, id).run();
      return json({ ok: true });
    }

    // Autorizar a la colmena: solo el humano dispara, y solo si la IA lo marcó automatizable.
    if (url.pathname === '/api/resolver' && req.method === 'POST') {
      const { id } = (await req.json()) as { id?: number };
      if (!id) return json({ error: 'falta id' }, 400);
      const t = await env.DB.prepare('select accion, automatizable from tickets where id = ?')
        .bind(id)
        .first<{ accion: string; automatizable: number }>();
      if (!t) return json({ error: 'no existe' }, 404);
      if (!t.automatizable) return json({ error: 'este ticket necesita manos humanas' }, 409);

      // ponytail: la ejecución es simulada — el valor del reto es la decisión, no el side effect.
      // Cablear de verdad = un fetch por acción (Gmail para resets, API de accesos, etc).
      const resuelto = t.accion || 'Trámite ejecutado';
      await env.DB.prepare("update tickets set estado = 'listo', resuelto = ? where id = ?")
        .bind(resuelto, id)
        .run();
      return json({ ok: true, resuelto });
    }

    // Webhook de Telegram. El equipo escribe como siempre; acá se vuelve ticket.
    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('x-telegram-bot-api-secret-token') !== env.TG_SECRET) {
        return new Response('no', { status: 401 });
      }
      const u = (await req.json()) as {
        message?: { text?: string; chat?: { id: number }; from?: { first_name?: string } };
      };
      const texto = u.message?.text?.trim();
      const chatId = u.message?.chat?.id;
      if (!texto || !chatId) return json({ ok: true });

      const autor = u.message?.from?.first_name ?? 'equipo';
      const t = await extraer(env.AI, texto);
      await guardar(env.DB, t, autor);

      const emoji = t.prioridad === 'alta' ? '🔥' : t.prioridad === 'baja' ? '🌱' : '📌';
      const cola = t.automatizable
        ? '\n\n🐝 esto lo puede resolver la colmena sola: _' + t.accion + '_'
        : '';
      await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `listo, anotado ✅\n\n${emoji} *${t.titulo}*\n${t.area} · prioridad ${t.prioridad}${cola}\n\nya está en el tablero.`,
          parse_mode: 'Markdown',
        }),
      });
      return json({ ok: true });
    }

    // Demo sin Telegram: POST /api/decir {texto}
    if (url.pathname === '/api/decir' && req.method === 'POST') {
      const { texto, autor } = (await req.json()) as { texto?: string; autor?: string };
      if (!texto?.trim()) return json({ error: 'falta texto' }, 400);
      const t = await extraer(env.AI, texto);
      await guardar(env.DB, t, autor?.trim() || 'demo');
      return json({ ok: true, ticket: t });
    }

    return new Response('no existe', { status: 404 });
  },
};
