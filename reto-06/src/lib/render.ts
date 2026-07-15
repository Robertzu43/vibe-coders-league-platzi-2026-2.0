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

export function renderHtml(r: ReportModel, summary: string): string {
  const rows = r.landings
    .map(
      (l) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(l.scriptName)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${l.requests}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmtDelta(l.deltaPct)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${(l.errorRate * 100).toFixed(1)}%</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${l.cpuP50.toFixed(1)} µs</td>
      </tr>`,
    )
    .join('');
  const alerts = r.alerts.length
    ? `<ul style="color:#b00">${r.alerts.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>`
    : '';
  return `<!doctype html><html><body style="font-family:system-ui,Arial,sans-serif;color:#111;max-width:640px;margin:0 auto">
  <h1 style="font-size:20px">Pulso de la liga</h1>
  <p style="color:#666;margin-top:-8px">${formatRange(r.window.current)}</p>
  <p style="font-size:15px;line-height:1.5">${esc(summary)}</p>
  <h2 style="font-size:15px">Tráfico por landing</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <thead><tr>
      <th style="text-align:left;padding:6px 10px">Landing</th>
      <th style="text-align:right;padding:6px 10px">Requests</th>
      <th style="text-align:right;padding:6px 10px">WoW</th>
      <th style="text-align:right;padding:6px 10px">Error</th>
      <th style="text-align:right;padding:6px 10px">CPU p50 (µs)</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="padding:10px;color:#999">Sin datos de tráfico</td></tr>'}</tbody>
  </table>
  <p style="font-size:14px">Total: <b>${r.totalRequests}</b> requests (${fmtDelta(r.requestsDeltaPct)}) · ${r.totalErrors} errores</p>
  <h2 style="font-size:15px">Conversiones</h2>
  <p style="font-size:14px">${r.conversions.leads} leads (${fmtDelta(r.conversions.leadsDeltaPct)}) · ${r.conversions.preorders} pre-órdenes (${fmtDelta(r.conversions.preordersDeltaPct)})</p>
  ${alerts}
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
  <p style="color:#999;font-size:12px">Generado automáticamente por Pulso · reto-06 · Vibe Coders League</p>
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
