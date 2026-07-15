import type { Window } from '../types';

// Usa la SECRET KEY (service_role) server-side: la RLS de las tablas es insert-only
// y bloquea lecturas anónimas. Cuenta filas creadas dentro de la ventana.
export async function countRows(opts: {
  url: string;
  secretKey: string;
  table: string;
  window: Window;
  createdColumn?: string; // default 'created_at'
  fetchImpl?: typeof fetch;
}): Promise<number> {
  const f = opts.fetchImpl ?? fetch;
  const col = opts.createdColumn ?? 'created_at';
  const q = `${opts.url}/rest/v1/${opts.table}` +
    `?select=id&${col}=gte.${encodeURIComponent(opts.window.startISO)}` +
    `&${col}=lt.${encodeURIComponent(opts.window.endISO)}`;
  const res = await f(q, {
    method: 'GET',
    headers: {
      apikey: opts.secretKey,
      Authorization: `Bearer ${opts.secretKey}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!res.ok && res.status !== 206) throw new Error(`Supabase HTTP ${res.status}`);
  const cr = res.headers.get('content-range'); // "0-6/7" o "*/0"
  const total = cr?.split('/')?.[1];
  return total ? parseInt(total, 10) : 0;
}
