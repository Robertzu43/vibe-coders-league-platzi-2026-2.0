const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

export async function getAccessToken(opts: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const f = opts.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    refresh_token: opts.refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await f(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`OAuth token HTTP ${res.status}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('OAuth: sin access_token');
  return json.access_token;
}

async function sendRaw(accessToken: string, rawBase64Url: string, f: typeof fetch): Promise<void> {
  const res = await f(SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: rawBase64Url }),
  });
  if (!res.ok) throw new Error(`Gmail send HTTP ${res.status}`);
}

export async function sendEmail(opts: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rawBase64Url: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const f = opts.fetchImpl ?? fetch;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const token = await getAccessToken(opts);
      await sendRaw(token, opts.rawBase64Url, f);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
