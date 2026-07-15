import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateLead } from '../../lib/validation';
import { scoreQuiz, type Respuestas } from '../../lib/diagnostic';
import { buildReport } from '../../lib/report';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const lead = validateLead(body ?? {});
  if (!lead.ok) {
    if (lead.errors[0] === 'spam') return json({ ok: true }, 200); // finge éxito, no inserta
    return json({ error: lead.errors.join(' ') }, 400);
  }

  const respuestas: Respuestas = (body.respuestas && typeof body.respuestas === 'object') ? body.respuestas : {};
  const puntajes = scoreQuiz(respuestas);           // recomputado en el servidor (no se confía en el cliente)
  const informe = buildReport(respuestas, puntajes);
  const tipo_negocio = typeof body.tipo_negocio === 'string' ? body.tipo_negocio : null;

  const url = (env as any).SUPABASE_URL as string;
  const key = (env as any).SUPABASE_PUBLISHABLE_KEY as string;
  if (!url || !key) {
    console.error('Faltan SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY');
    return json({ error: 'Configuración del servidor incompleta.' }, 500);
  }

  try {
    const res = await fetch(`${url}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        nombre: lead.data.nombre,
        email: lead.data.email,
        negocio: lead.data.negocio ?? null,
        tipo_negocio,
        respuestas,
        puntaje_web: puntajes.puntaje_web,
        puntaje_automatizacion: puntajes.puntaje_automatizacion,
        arquetipo: informe.arquetipo.id,
      }),
    });
    if (!res.ok) {
      console.error('Supabase insert error:', res.status, await res.text());
      return json({ error: 'No pudimos guardar tu diagnóstico. Intenta de nuevo.' }, 502);
    }
  } catch (e) {
    console.error('Lead insert error:', e instanceof Error ? e.message : String(e));
    return json({ error: 'No pudimos guardar tu diagnóstico. Intenta de nuevo.' }, 500);
  }

  // Envío de correo: mejor esfuerzo, nunca rompe la respuesta (degradación elegante).
  try { await sendReportEmail(lead.data, informe); }
  catch (e) { console.error('Email skipped/failed:', e instanceof Error ? e.message : String(e)); }

  return json({ ok: true, informe }, 201);
};

/**
 * Envío del informe por correo (mejor esfuerzo).
 * MVP: si el binding EMAIL del Worker no está configurado (aún no hay dominio verificado),
 * sale sin enviar — el flujo NO se rompe (el informe ya se guardó y se muestra en pantalla).
 * El binding y el mensaje real se completan al configurar el dominio (ver Cloudflare Email Service).
 */
async function sendReportEmail(_lead: { nombre: string; email: string }, _informe: unknown): Promise<void> {
  const emailBinding = (env as any).EMAIL;
  if (!emailBinding) return; // degradación: sin binding, no se envía
  // TODO(dominio): construir y enviar el mensaje con el informe vía Cloudflare Email Service.
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
