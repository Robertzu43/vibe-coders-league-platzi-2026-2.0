import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { buildSystemPrompt, MODEL } from '../../lib/system-prompt';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Se requiere un arreglo de mensajes' }, 400);
    }

    // Acceso al binding en @astrojs/cloudflare v13 (Astro.locals.runtime fue removido).
    const ai = (env as any).AI;
    const aiMessages = [
      { role: 'system', content: buildSystemPrompt() },
      ...messages,
    ];

    const result = await ai.run(MODEL, {
      messages: aiMessages,
      max_tokens: 600,
      temperature: 0.2,
    });

    return json({ response: result.response }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Chat API error:', msg);
    return json({ error: '¡Uy! Se me trabó la lengua 🦜. ¿Intentamos de nuevo?' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
