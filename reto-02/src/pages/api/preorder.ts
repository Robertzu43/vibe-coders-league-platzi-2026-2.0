import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validatePreorder } from '../../lib/validation';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); }
  catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const result = validatePreorder((body ?? {}) as any);
  if (!result.ok) {
    // Honeypot: fingir éxito para no darle pistas al bot.
    if (result.errors[0] === 'spam') return json({ ok: true }, 200);
    return json({ error: result.errors.join(' ') }, 400);
  }

  const url = (env as any).SUPABASE_URL as string;
  const key = (env as any).SUPABASE_PUBLISHABLE_KEY as string;
  if (!url || !key) {
    console.error('Faltan SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY');
    return json({ error: 'Configuración del servidor incompleta.' }, 500);
  }

  try {
    const res = await fetch(`${url}/rest/v1/preorders`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(result.data),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('Supabase insert error:', res.status, detail);
      return json({ error: 'No pudimos guardar tu reserva. Intenta de nuevo.' }, 502);
    }
    return json({ ok: true }, 201);
  } catch (e) {
    console.error('Preorder error:', e instanceof Error ? e.message : String(e));
    return json({ error: 'No pudimos guardar tu reserva. Intenta de nuevo.' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
