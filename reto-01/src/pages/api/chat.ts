import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { buildSystemPrompt, MODEL } from '../../lib/system-prompt';

export const prerender = false;

// Límites de entrada: este endpoint es público, no autenticado y factura
// contra un binding de Cloudflare Workers AI, así que hay que ponerle cotas.
const MAX_MESSAGES = 40;
const MAX_TOTAL_CHARS = 8000;

type ChatRole = 'user' | 'assistant' | 'system';
const VALID_ROLES: ChatRole[] = ['user', 'assistant', 'system'];

interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * Valida forma y tamaño del arreglo de mensajes recibido.
 * Devuelve un mensaje de error (en español, tono Kiko) si algo no cumple,
 * o `null` si todo está en orden.
 */
function validateMessages(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'Se requiere un arreglo de mensajes';
  }

  if (messages.length > MAX_MESSAGES) {
    return `Esa es mucha cháchara para mí 🦜. Máximo ${MAX_MESSAGES} mensajes por conversación.`;
  }

  let totalChars = 0;
  for (const item of messages) {
    if (
      typeof item !== 'object' ||
      item === null ||
      !VALID_ROLES.includes((item as { role?: unknown }).role as ChatRole) ||
      typeof (item as { content?: unknown }).content !== 'string' ||
      (item as { content: string }).content.trim().length === 0
    ) {
      return 'Uno de tus mensajes no tiene el formato correcto 🦜';
    }
    totalChars += (item as ChatMessage).content.length;
  }

  if (totalChars > MAX_TOTAL_CHARS) {
    return 'El mensaje es demasiado largo, intenta algo más corto 🦜';
  }

  return null;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { messages } = await request.json();

    const validationError = validateMessages(messages);
    if (validationError) {
      return json({ error: validationError }, 400);
    }

    // Acceso al binding en @astrojs/cloudflare v13 (Astro.locals.runtime fue removido).
    const ai = (
      env as unknown as {
        AI: { run: (model: string, opts: unknown) => Promise<{ response: string }> };
      }
    ).AI;
    const aiMessages = [
      { role: 'system', content: buildSystemPrompt() },
      ...(messages as ChatMessage[]),
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
