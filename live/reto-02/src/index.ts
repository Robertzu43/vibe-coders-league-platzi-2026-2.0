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
}

const SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    prioridad: { type: 'string', enum: ['alta', 'media', 'baja'] },
    area: { type: 'string' },
  },
  required: ['titulo', 'prioridad', 'area'],
} as const;

/** Reglas: lo que corre si la IA falla. Nunca perdemos el mensaje. */
export function porReglas(texto: string): Ticket {
  const t = texto.trim();
  const bajo = t.toLowerCase();
  const urgente = /urge|urgent|ya|hoy|caí|cai[oó]|parad|no funciona|se dañ|grave|cliente/.test(bajo);
  const leve = /cuando pueda|algún d|algun d|no corre prisa|menor|detalle/.test(bajo);
  return {
    titulo: t.length > 70 ? t.slice(0, 67).trimEnd() + '…' : t,
    detalle: t,
    prioridad: urgente ? 'alta' : leve ? 'baja' : 'media',
    area: 'general',
  };
}

export async function extraer(ai: Ai, texto: string): Promise<Ticket> {
  try {
    const r = (await ai.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        {
          role: 'system',
          content:
            'Convertís mensajes de chat de trabajadores en tickets. Devolvé JSON: titulo (imperativo, máx 70 caracteres, español), prioridad (alta si afecta clientes/producción/urgente, baja si es cosmético o "cuando puedas", media si no), area (una palabra: taller, bodega, ventas, sistemas, limpieza, entregas o general).',
        },
        { role: 'user', content: texto },
      ],
      response_format: { type: 'json_schema', json_schema: SCHEMA },
    })) as { response?: unknown };

    // GOTCHA reto-07: con json_schema, `response` ya viene parseado como objeto.
    const raw = r.response;
    const o = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Partial<Ticket>;
    if (!o?.titulo) throw new Error('sin titulo');
    return {
      titulo: String(o.titulo).slice(0, 70),
      detalle: texto,
      prioridad: o.prioridad === 'alta' || o.prioridad === 'baja' ? o.prioridad : 'media',
      area: (o.area ? String(o.area) : 'general').toLowerCase().slice(0, 20),
    };
  } catch {
    return porReglas(texto);
  }
}

async function guardar(db: D1Database, t: Ticket, autor: string) {
  await db
    .prepare('insert into tickets (titulo, detalle, prioridad, area, autor) values (?,?,?,?,?)')
    .bind(t.titulo, t.detalle, t.prioridad, t.area, autor)
    .run();
}

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
        'select id, titulo, detalle, prioridad, area, autor, estado, creado from tickets order by id desc',
      ).all();
      return json(results);
    }

    if (url.pathname === '/api/move' && req.method === 'POST') {
      const { id, estado } = (await req.json()) as { id?: number; estado?: string };
      if (!id || !ESTADOS.includes(estado as Estado)) return json({ error: 'datos inválidos' }, 400);
      await env.DB.prepare('update tickets set estado = ? where id = ?').bind(estado, id).run();
      return json({ ok: true });
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
      await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `listo, anotado ✅\n\n${emoji} *${t.titulo}*\n${t.area} · prioridad ${t.prioridad}\n\nya está en el tablero.`,
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
