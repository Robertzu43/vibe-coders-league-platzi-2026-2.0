import type { ReportModel } from '../types';

export type AiRunner = (model: string, inputs: unknown) => Promise<{ response?: string }>;

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export function ruleSummary(r: ReportModel): string {
  const parts: string[] = [];
  const delta = r.requestsDeltaPct;
  parts.push(
    `La liga recibió ${r.totalRequests.toLocaleString('es')} requests esta semana` +
      (delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta.toFixed(0)}% vs. la anterior).` : '.'),
  );
  if (r.topLanding) parts.push(`La landing con más tráfico fue ${r.topLanding}.`);
  parts.push(`Conversiones: ${r.conversions.leads} leads y ${r.conversions.preorders} pre-órdenes.`);
  if (r.alerts.length) parts.push(`Alertas: ${r.alerts.join('; ')}.`);
  return parts.join(' ');
}

export function buildPrompt(r: ReportModel): string {
  return JSON.stringify({
    totalRequests: r.totalRequests,
    requestsDeltaPct: r.requestsDeltaPct,
    topLanding: r.topLanding,
    landings: r.landings.map((l) => ({
      name: l.scriptName, requests: l.requests,
      errorRatePct: +(l.errorRate * 100).toFixed(1), deltaPct: l.deltaPct,
    })),
    conversions: r.conversions,
    alerts: r.alerts,
  });
}

export async function summarize(r: ReportModel, ai?: AiRunner): Promise<string> {
  if (!ai) return ruleSummary(r);
  try {
    const out = await ai(MODEL, {
      messages: [
        {
          role: 'system',
          content:
            'Eres un analista de producto. Resume en 3-4 frases ejecutivas en español, ' +
            'tono claro y directo. Usa SOLO los números provistos; no inventes cifras.',
        },
        { role: 'user', content: buildPrompt(r) },
      ],
      temperature: 0.2,
    });
    const text = (out?.response ?? '').trim();
    return text.length > 0 ? text : ruleSummary(r);
  } catch {
    return ruleSummary(r);
  }
}
