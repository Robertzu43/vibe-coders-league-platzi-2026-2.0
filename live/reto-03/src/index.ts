export interface Env {
  AI: Ai;
  ASSETS: Fetcher;
}

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

// El navegador consulta OpenAlex directo (CORS abierto, IP propia sin rate-limit).
// El Worker solo sintetiza: recibe los abstracts ya recolectados y devuelve resumen + hallazgos.
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/api/sintesis') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });

    let body: any;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'JSON inválido' }, { status: 400 });
    }
    const tema = String(body?.tema ?? '').slice(0, 200);
    const corpus = Array.isArray(body?.corpus) ? body.corpus.slice(0, 8) : [];
    if (!tema || !corpus.length) return Response.json({ error: 'faltan tema/corpus' }, { status: 400 });

    const textos = corpus
      .map((c: any, i: number) =>
        `[${i + 1}] ${String(c.titulo).slice(0, 150)} (${c.anio}, ${c.citas} citas): ${String(c.abstract).slice(0, 300)}`)
      .join('\n');

    try {
      const res: any = await env.AI.run(MODEL as any, {
        messages: [
          {
            role: 'system',
            content:
              'Eres un investigador académico riguroso. Respondes SOLO con base en los abstracts provistos, en español claro. No inventas datos ni cifras.',
          },
          {
            role: 'user',
            content: `Tema de investigación: "${tema}".\nAbstracts de los papers más citados:\n${textos}\n\nEscribe un resumen ejecutivo (4-6 frases) y 4 hallazgos clave (frases cortas y concretas).`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            type: 'object',
            properties: {
              resumen: { type: 'string' },
              hallazgos: { type: 'array', items: { type: 'string' } },
            },
            required: ['resumen', 'hallazgos'],
          },
        },
      });
      return Response.json(res.response ?? res);
    } catch (e) {
      console.log('IA fallo:', String(e));
      return Response.json({ error: 'sintesis no disponible' }, { status: 502 });
    }
  },
};
