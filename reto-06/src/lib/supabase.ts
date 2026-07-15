import type { Conversions, Window } from '../types';

// Lee los conteos vía una función SECURITY DEFINER en el schema `pulso`
// (ver db/schema.sql), usando la publishable/anon key. La RLS de las tablas
// es insert-only; la función corre como su owner y devuelve solo agregados.
export async function fetchConversions(opts: {
  url: string;
  key: string;
  window: Window;
  schema?: string; // default 'pulso'
  fetchImpl?: typeof fetch;
}): Promise<Conversions> {
  const f = opts.fetchImpl ?? fetch;
  const schema = opts.schema ?? 'pulso';
  const res = await f(`${opts.url}/rest/v1/rpc/weekly_counts`, {
    method: 'POST',
    headers: {
      apikey: opts.key,
      Authorization: `Bearer ${opts.key}`,
      'Content-Type': 'application/json',
      'Content-Profile': schema,
      'Accept-Profile': schema,
    },
    body: JSON.stringify({ win_start: opts.window.startISO, win_end: opts.window.endISO }),
  });
  if (!res.ok) throw new Error(`Supabase RPC HTTP ${res.status}`);
  const json = (await res.json()) as unknown;
  const row = Array.isArray(json) ? json[0] : json;
  const r = (row ?? {}) as { leads?: number; preorders?: number };
  return { leads: Number(r.leads ?? 0), preorders: Number(r.preorders ?? 0) };
}
