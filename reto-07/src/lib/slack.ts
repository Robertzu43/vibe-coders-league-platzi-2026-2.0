import type { Decision } from '../types';

export function buildSlackMessage(d: Decision, text: string): object {
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `🚨 Bug P0 — ${d.titulo}`.slice(0, 150) } },
      { type: 'section', fields: [
        { type: 'mrkdwn', text: `*Severidad:*\n${d.severidad}` },
        { type: 'mrkdwn', text: `*Área:*\n${d.area}` },
        { type: 'mrkdwn', text: `*Producción:*\n${d.enProduccion ? 'sí' : 'no'}` },
        { type: 'mrkdwn', text: `*Pérdida de datos:*\n${d.perdidaDatos ? 'sí' : 'no'}` },
      ] },
      { type: 'section', text: { type: 'mrkdwn', text: `*Razón:* ${d.razon}\n*Acción:* ${d.accionSugerida}` } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `Reporte: ${text.slice(0, 280)}` }] },
    ],
  };
}

export async function postSlack(webhookUrl: string, message: object, fetchImpl?: typeof fetch): Promise<void> {
  const f = fetchImpl ?? fetch;
  const res = await f(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (!res.ok) throw new Error(`Slack HTTP ${res.status}`);
}
