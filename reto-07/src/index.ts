import { triage, type AiRunner } from './lib/triage';
import { routeFor } from './lib/route';
import { buildSlackMessage, postSlack } from './lib/slack';
import { getAccessToken, appendRow, rowFromDecision } from './lib/sheets';
import { renderDemoPage } from './lib/demo';
import { CASES } from './cases';

export interface Env {
  AI: Ai;
  SLACK_WEBHOOK_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REFRESH_TOKEN: string;
  SHEETS_ID: string;
}

export async function handleTriage(
  env: Env,
  body: { text?: string; dryRun?: boolean },
  now: string,
): Promise<{ status: number; json: any }> {
  const text = (body.text ?? '').trim();
  if (!text) return { status: 400, json: { ok: false, error: 'text requerido' } };

  const aiRunner: AiRunner = (m, i) => env.AI.run(m as any, i as any) as any;
  const decision = await triage(text, aiRunner);
  const route = routeFor(decision.prioridad);

  // dryRun=true → solo clasifica (preview, sin efectos). dryRun=false → reporta de verdad.
  const dryRun = body.dryRun !== false;
  if (dryRun) return { status: 200, json: { ok: true, dryRun: true, decision, route } };

  try {
    if (route === 'urgente') {
      await postSlack(env.SLACK_WEBHOOK_URL, buildSlackMessage(decision, text));
      return { status: 200, json: { ok: true, dryRun: false, decision, route, destino: 'slack' } };
    }
    const token = await getAccessToken({
      clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, refreshToken: env.GOOGLE_REFRESH_TOKEN,
    });
    await appendRow({ sheetId: env.SHEETS_ID, accessToken: token, row: rowFromDecision(decision, now) });
    return { status: 200, json: { ok: true, dryRun: false, decision, route, destino: 'sheet' } };
  } catch (e) {
    return { status: 200, json: { ok: false, decision, route, error: String(e) } };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(renderDemoPage(CASES), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (request.method === 'POST' && url.pathname === '/triage') {
      let body: any = {};
      try { body = await request.json(); } catch { /* body vacío */ }
      const { status, json } = await handleTriage(env, body, new Date().toISOString());
      return Response.json(json, { status });
    }
    return new Response('Centinela — agente de triage de bugs. GET / para la demo.', { status: 404 });
  },
};
