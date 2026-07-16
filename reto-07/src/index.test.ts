import { afterEach, vi } from 'vitest';
import { handleTriage, type Env } from './index';

function fakeEnv(over: Partial<Env> = {}): Env {
  return {
    AI: { run: async () => ({ response: 'no json' }) } as unknown as Ai,
    SLACK_WEBHOOK_URL: 'https://hooks/x', GOOGLE_CLIENT_ID: 'c', GOOGLE_CLIENT_SECRET: 's',
    GOOGLE_REFRESH_TOKEN: 'r', SHEETS_ID: 'SID', ...over,
  } as Env;
}

afterEach(() => { vi.unstubAllGlobals(); });

test('dry-run por defecto: devuelve decisión + ruta sin enviar', async () => {
  const { status, json } = await handleTriage(fakeEnv(), { text: 'El botón se ve gris' }, '2026-07-16T00:00:00Z');
  expect(status).toBe(200);
  expect(json.dryRun).toBe(true);
  expect(json.route).toBe('registrar');
  expect(json.decision.fuente).toBe('reglas');
});
test('text vacío → 400', async () => {
  const { status } = await handleTriage(fakeEnv(), { text: '   ' }, 'now');
  expect(status).toBe(400);
});
test('envío real (dryRun:false) reporta al destino, sin token', async () => {
  // Mock del fetch global que usan slack.ts/sheets.ts en el path real.
  vi.stubGlobal('fetch', (async (url: string) => {
    if (String(url).includes('oauth2.googleapis.com')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'ya29.x' }) } as unknown as Response;
    }
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
  }) as unknown as typeof fetch);
  // "El botón se ve gris" → reglas → backlog → registrar → Google Sheet
  const { status, json } = await handleTriage(fakeEnv(), { text: 'El botón se ve gris', dryRun: false }, '2026-07-16T00:00:00Z');
  expect(status).toBe(200);
  expect(json.ok).toBe(true);
  expect(json.dryRun).toBe(false);
  expect(json.route).toBe('registrar');
  expect(json.destino).toBe('sheet');
});
