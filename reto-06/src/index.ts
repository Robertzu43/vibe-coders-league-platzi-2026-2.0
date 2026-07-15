import { computeWindows, formatRange } from './lib/dates';
import { fetchTraffic } from './lib/cloudflare';
import { countRows } from './lib/supabase';
import { buildReport } from './lib/report';
import { summarize } from './lib/summarize';
import { renderHtml, renderText, buildMime, base64UrlEncode } from './lib/render';
import { sendEmail } from './lib/gmail';
import { LANDINGS, TABLES, ALERTS } from './config';
import type { Conversions, LandingTraffic } from './types';

export interface Env {
  AI: Ai;
  CF_ACCOUNT_ID: string;
  REPORT_TO: string;
  CF_ANALYTICS_TOKEN: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  TRIGGER_TOKEN: string;
}

export function checkTrigger(url: URL, headers: Headers, expected: string): boolean {
  const token = url.searchParams.get('token') || headers.get('x-trigger-token');
  return !!expected && token === expected;
}

export async function runReport(env: Env, now: number): Promise<{ subject: string; summary: string }> {
  const windows = computeWindows(now);

  // Fuente 1: tráfico (aislada; degrada si falla)
  let currentTraffic: LandingTraffic[] = [];
  let previousTraffic: LandingTraffic[] = [];
  let degradedTraffic = false;
  try {
    const base = { accountId: env.CF_ACCOUNT_ID, token: env.CF_ANALYTICS_TOKEN, scripts: LANDINGS };
    [currentTraffic, previousTraffic] = await Promise.all([
      fetchTraffic({ ...base, window: windows.current }),
      fetchTraffic({ ...base, window: windows.previous }),
    ]);
  } catch (e) {
    console.error('traffic error', e);
    degradedTraffic = true;
  }

  // Fuente 2: conversiones (aislada; degrada si falla)
  let currentConversions: Conversions = { leads: 0, preorders: 0 };
  let previousConversions: Conversions = { leads: 0, preorders: 0 };
  let degradedConversions = false;
  try {
    const base = { url: env.SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY };
    const [cLeads, cPre, pLeads, pPre] = await Promise.all([
      countRows({ ...base, table: TABLES.leads, window: windows.current }),
      countRows({ ...base, table: TABLES.preorders, window: windows.current }),
      countRows({ ...base, table: TABLES.leads, window: windows.previous }),
      countRows({ ...base, table: TABLES.preorders, window: windows.previous }),
    ]);
    currentConversions = { leads: cLeads, preorders: cPre };
    previousConversions = { leads: pLeads, preorders: pPre };
  } catch (e) {
    console.error('conversions error', e);
    degradedConversions = true;
  }

  const model = buildReport({
    window: windows,
    currentTraffic, previousTraffic,
    currentConversions, previousConversions,
    degraded: { traffic: degradedTraffic, conversions: degradedConversions },
    errorRateAlert: ALERTS.errorRateAlert,
    trafficDropAlert: ALERTS.trafficDropAlert,
  });

  const summary = await summarize(model, (m, i) => env.AI.run(m as any, i as any) as any);
  const subject = `Pulso de la liga · ${formatRange(windows.current)}`;
  const html = renderHtml(model, summary);
  const text = renderText(model, summary);
  const raw = base64UrlEncode(buildMime({ to: env.REPORT_TO, subject, html, text }));

  await sendEmail({
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
    rawBase64Url: raw,
  });

  return { subject, summary };
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runReport(env, Date.now()));
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/__run') {
      if (!checkTrigger(url, request.headers, env.TRIGGER_TOKEN)) {
        return new Response('forbidden', { status: 403 });
      }
      try {
        const out = await runReport(env, Date.now());
        return Response.json({ ok: true, ...out });
      } catch (e) {
        return Response.json({ ok: false, error: String(e) }, { status: 500 });
      }
    }
    return new Response('Pulso — reporte automático de la liga. Ver README.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
