import { getAccessToken, sendEmail } from './gmail';

function jsonRes(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

test('getAccessToken devuelve el access_token', async () => {
  const f = (async () => jsonRes({ access_token: 'ya29.abc' })) as unknown as typeof fetch;
  expect(await getAccessToken({ clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl: f })).toBe('ya29.abc');
});

test('getAccessToken lanza si no hay token', async () => {
  const f = (async () => jsonRes({}, false, 400)) as unknown as typeof fetch;
  await expect(getAccessToken({ clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl: f }))
    .rejects.toThrow();
});

test('sendEmail reintenta una vez y luego tiene éxito', async () => {
  let sendCalls = 0;
  const f = (async (url: string) => {
    if (url.includes('oauth2')) return jsonRes({ access_token: 't' });
    sendCalls++;
    if (sendCalls === 1) return jsonRes({}, false, 500); // primer intento falla
    return jsonRes({ id: 'msg1' }); // segundo pasa
  }) as unknown as typeof fetch;

  await sendEmail({ clientId: 'c', clientSecret: 's', refreshToken: 'r', rawBase64Url: 'RAW', fetchImpl: f });
  expect(sendCalls).toBe(2);
});

test('sendEmail lanza si ambos intentos fallan', async () => {
  const f = (async (url: string) => {
    if (url.includes('oauth2')) return jsonRes({ access_token: 't' });
    return jsonRes({}, false, 500);
  }) as unknown as typeof fetch;
  await expect(sendEmail({ clientId: 'c', clientSecret: 's', refreshToken: 'r', rawBase64Url: 'RAW', fetchImpl: f }))
    .rejects.toThrow();
});
