import type { Decision } from '../types';
import { SHEET_RANGE } from '../config';

export async function getAccessToken(o: {
  clientId: string; clientSecret: string; refreshToken: string; fetchImpl?: typeof fetch;
}): Promise<string> {
  const f = o.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: o.clientId, client_secret: o.clientSecret,
    refresh_token: o.refreshToken, grant_type: 'refresh_token',
  });
  const res = await f('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!res.ok) throw new Error(`OAuth token HTTP ${res.status}`);
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error('OAuth: sin access_token');
  return j.access_token;
}

export function rowFromDecision(d: Decision, fecha: string): string[] {
  return [
    fecha, d.titulo, d.severidad, d.prioridad, d.area,
    String(d.enProduccion), String(d.afectaNucleo), String(d.perdidaDatos), d.razon, d.accionSugerida,
  ];
}

export async function appendRow(o: {
  sheetId: string; accessToken: string; row: string[]; range?: string; fetchImpl?: typeof fetch;
}): Promise<void> {
  const f = o.fetchImpl ?? fetch;
  const range = o.range ?? SHEET_RANGE;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${o.sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const res = await f(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${o.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [o.row] }),
  });
  if (!res.ok) throw new Error(`Sheets append HTTP ${res.status}`);
}
