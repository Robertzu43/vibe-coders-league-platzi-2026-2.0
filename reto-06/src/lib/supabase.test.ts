import { fetchConversions } from './supabase';

function mockFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () => ({ ok, status, json: async () => body } as unknown as Response)) as unknown as typeof fetch;
}

test('fetchConversions parsea leads/preorders del RPC', async () => {
  const c = await fetchConversions({
    url: 'https://x.supabase.co', key: 'k',
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch([{ leads: 4, preorders: 2 }]),
  });
  expect(c).toEqual({ leads: 4, preorders: 2 });
});

test('fetchConversions maneja respuesta vacía como ceros', async () => {
  const c = await fetchConversions({
    url: 'https://x.supabase.co', key: 'k',
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch([]),
  });
  expect(c).toEqual({ leads: 0, preorders: 0 });
});

test('fetchConversions lanza en HTTP de error', async () => {
  await expect(fetchConversions({
    url: 'https://x.supabase.co', key: 'k',
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch(null, false, 401),
  })).rejects.toThrow('401');
});
