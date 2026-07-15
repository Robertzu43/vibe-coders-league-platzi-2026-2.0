import { countRows } from './supabase';

function mockFetch(contentRange: string | null, ok = true, status = 206): typeof fetch {
  return (async () => ({
    ok, status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-range' ? contentRange : null) },
  } as unknown as Response)) as unknown as typeof fetch;
}

test('countRows parsea el total del header content-range', async () => {
  const n = await countRows({
    url: 'https://x.supabase.co', secretKey: 'k', table: 'leads',
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch('0-6/7'),
  });
  expect(n).toBe(7);
});

test('countRows devuelve 0 cuando no hay filas', async () => {
  const n = await countRows({
    url: 'https://x.supabase.co', secretKey: 'k', table: 'leads',
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch('*/0'),
  });
  expect(n).toBe(0);
});

test('countRows lanza en HTTP de error', async () => {
  await expect(countRows({
    url: 'https://x.supabase.co', secretKey: 'k', table: 'leads',
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch(null, false, 401),
  })).rejects.toThrow('401');
});
