import type { ReportModel } from '../types';
import { formatRange } from './dates';

const BOUNDARY = 'pulso_boundary_a1b2c3d4e5';

export function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function encodeSubject(subject: string): string {
  // RFC 2047 para asunto con caracteres no-ASCII
  return `=?UTF-8?B?${b64(subject)}?=`;
}

function fmtDelta(d: number | null): string {
  if (d === null) return '—';
  return `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderText(r: ReportModel, summary: string): string {
  const lines: string[] = [];
  lines.push(`PULSO DE LA LIGA · ${formatRange(r.window.current)}`);
  lines.push('');
  lines.push(summary);
  lines.push('');
  lines.push(`Tráfico total: ${r.totalRequests} requests (${fmtDelta(r.requestsDeltaPct)}), ${r.totalErrors} errores.`);
  if (r.degraded.traffic) lines.push('(datos de tráfico no disponibles esta semana)');
  for (const l of r.landings) {
    lines.push(`- ${l.scriptName}: ${l.requests} req (${fmtDelta(l.deltaPct)}), error ${(l.errorRate * 100).toFixed(1)}%, CPU ${l.cpuP50.toFixed(1)}µs`);
  }
  lines.push('');
  lines.push(`Conversiones: ${r.conversions.leads} leads (${fmtDelta(r.conversions.leadsDeltaPct)}), ${r.conversions.preorders} pre-órdenes (${fmtDelta(r.conversions.preordersDeltaPct)}).`);
  if (r.degraded.conversions) lines.push('(datos de conversiones no disponibles esta semana)');
  if (r.alerts.length) { lines.push(''); lines.push('Alertas:'); r.alerts.forEach((a) => lines.push(`- ${a}`)); }
  return lines.join('\n');
}

// Paleta email-safe: una hue de acento (indigo) para magnitud, inks neutros,
// verde/rojo de status SOLO para deltas/errores (siempre con flecha + signo).
const ACCENT = '#4f46e5';
const INK = '#111827';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const TRACK = '#eef2ff';
const GOOD = '#15803d';
const BAD = '#dc2626';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function deltaHtml(d: number | null): string {
  if (d === null) return `<span style="color:${MUTED}">—</span>`;
  if (d > 0) return `<span style="color:${GOOD}">&#9650; ${d.toFixed(0)}%</span>`;
  if (d < 0) return `<span style="color:${BAD}">&#9660; ${Math.abs(d).toFixed(0)}%</span>`;
  return `<span style="color:${MUTED}">0%</span>`;
}

function statTile(label: string, value: string, delta: number | null): string {
  return `<td width="33.33%" style="padding:0 4px;vertical-align:top">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid ${BORDER};border-radius:10px;background:#ffffff">
      <tr><td style="padding:14px 14px 12px">
        <div style="font:600 11px ${FONT};letter-spacing:.06em;text-transform:uppercase;color:${MUTED}">${esc(label)}</div>
        <div style="font:700 26px ${FONT};color:${INK};padding:4px 0 2px">${esc(value)}</div>
        <div style="font:400 12px ${FONT}">${deltaHtml(delta)} <span style="color:${MUTED}">vs. sem. previa</span></div>
      </td></tr>
    </table>
  </td>`;
}

function landingRow(l: ReportModel['landings'][number], maxReq: number, isTop: boolean): string {
  const pct = Math.max(2, Math.round((l.requests / maxReq) * 100));
  const cpuMs = (l.cpuP50 / 1000).toFixed(1);
  const errPct = (l.errorRate * 100).toFixed(1);
  const badge = isTop
    ? ` <span style="font:600 10px ${FONT};color:${ACCENT};background:${TRACK};border-radius:999px;padding:2px 7px;letter-spacing:.03em">&#9733; L&Iacute;DER</span>`
    : '';
  const errStyle = l.errorRate > 0 ? `color:${BAD};font-weight:600` : `color:${MUTED}`;
  return `<tr><td style="padding:12px 0;border-bottom:1px solid ${BORDER}">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="font:600 14px ${FONT};color:${INK}">${esc(l.scriptName)}${badge}</td>
      <td align="right" style="font:700 15px ${FONT};color:${INK}">${l.requests}<span style="font:400 12px ${FONT};color:${MUTED}"> req</span></td>
    </tr></table>
    <div style="background:${TRACK};border-radius:5px;height:8px;margin:8px 0 7px;font-size:0;line-height:0">
      <div style="background:${ACCENT};width:${pct}%;height:8px;border-radius:5px;font-size:0;line-height:0">&nbsp;</div>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      <td style="font:400 12px ${FONT};color:${MUTED}">WoW ${deltaHtml(l.deltaPct)}</td>
      <td align="center" style="font:400 12px ${FONT};${errStyle}">error ${errPct}%</td>
      <td align="right" style="font:400 12px ${FONT};color:${MUTED}">CPU p50 ${cpuMs} ms</td>
    </tr></table>
  </td></tr>`;
}

export function renderHtml(r: ReportModel, summary: string): string {
  const maxReq = Math.max(1, ...r.landings.map((l) => l.requests));
  const rows = r.landings.length
    ? r.landings.map((l) => landingRow(l, maxReq, l.scriptName === r.topLanding)).join('')
    : `<tr><td style="padding:16px 0;font:400 14px ${FONT};color:${MUTED}">Sin datos de tráfico esta semana.</td></tr>`;

  const degradedTraffic = r.degraded.traffic
    ? `<div style="font:400 12px ${FONT};color:${MUTED};padding:6px 0">Datos de tráfico no disponibles esta semana.</div>`
    : '';
  const degradedConv = r.degraded.conversions
    ? `<div style="font:400 12px ${FONT};color:${MUTED};padding:6px 0">Datos de conversiones no disponibles esta semana.</div>`
    : '';

  const alerts = r.alerts.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:18px 0 0;background:#fef2f2;border-left:4px solid ${BAD};border-radius:6px">
        <tr><td style="padding:12px 14px">
          <div style="font:700 12px ${FONT};letter-spacing:.04em;text-transform:uppercase;color:${BAD};padding-bottom:4px">&#9888; Alertas</div>
          ${r.alerts.map((a) => `<div style="font:400 13px ${FONT};color:#7f1d1d;padding:2px 0">${esc(a)}</div>`).join('')}
        </td></tr>
      </table>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f4f6">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${BORDER}">
    <!-- header -->
    <tr><td style="background:${ACCENT};padding:22px 24px">
      <div style="font:700 22px ${FONT};color:#ffffff">&#9917; Pulso de la liga</div>
      <div style="font:400 13px ${FONT};color:#c7d2fe;padding-top:3px">Resultados de la semana &middot; ${formatRange(r.window.current)}</div>
    </td></tr>
    <!-- summary callout -->
    <tr><td style="padding:20px 24px 4px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${TRACK};border-radius:10px">
        <tr><td style="padding:14px 16px;font:400 15px/1.55 ${FONT};color:#1e293b">${esc(summary)}</td></tr>
      </table>
    </td></tr>
    <!-- KPI tiles -->
    <tr><td style="padding:16px 20px 4px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        ${statTile('Requests', String(r.totalRequests), r.requestsDeltaPct)}
        ${statTile('Leads', String(r.conversions.leads), r.conversions.leadsDeltaPct)}
        ${statTile('Pre-órdenes', String(r.conversions.preorders), r.conversions.preordersDeltaPct)}
      </tr></table>
      ${degradedConv}
    </td></tr>
    <!-- traffic -->
    <tr><td style="padding:18px 24px 4px">
      <div style="font:700 13px ${FONT};letter-spacing:.04em;text-transform:uppercase;color:${MUTED};padding-bottom:2px">Tráfico por landing</div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
      <div style="font:400 13px ${FONT};color:${MUTED};padding:12px 0 0">Total: <b style="color:${INK}">${r.totalRequests}</b> requests &middot; ${r.totalErrors} errores</div>
      ${degradedTraffic}
    </td></tr>
    <!-- alerts -->
    <tr><td style="padding:0 24px">${alerts}</td></tr>
    <!-- footer -->
    <tr><td style="padding:20px 24px 24px">
      <div style="border-top:1px solid ${BORDER};padding-top:14px;font:400 11px ${FONT};color:#9ca3af">
        Generado automáticamente por <b style="color:${MUTED}">Pulso</b> &middot; reto-06 &middot; Vibe Coders League
      </div>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

export function buildMime(opts: { to: string; subject: string; html: string; text: string }): string {
  // Sin header `From:` a propósito: Gmail `users/me/messages/send` fija el remitente
  // a la cuenta autenticada. NO agregar un From manual.
  return [
    `To: ${opts.to}`,
    `Subject: ${encodeSubject(opts.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${BOUNDARY}"`,
    '',
    `--${BOUNDARY}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    opts.text,
    '',
    `--${BOUNDARY}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    opts.html,
    '',
    `--${BOUNDARY}--`,
    '',
  ].join('\r\n');
}
