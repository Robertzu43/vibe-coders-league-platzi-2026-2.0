import { handleTriage, type Env } from './index';

function fakeEnv(over: Partial<Env> = {}): Env {
  return {
    AI: { run: async () => ({ response: 'no json' }) } as unknown as Ai,
    SLACK_WEBHOOK_URL: 'https://hooks/x', GOOGLE_CLIENT_ID: 'c', GOOGLE_CLIENT_SECRET: 's',
    GOOGLE_REFRESH_TOKEN: 'r', SHEETS_ID: 'SID', DEMO_TOKEN: 'secreto', ...over,
  } as Env;
}

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
test('envío real sin token → 403', async () => {
  const { status, json } = await handleTriage(fakeEnv(), { text: 'bug', dryRun: false }, 'now');
  expect(status).toBe(403);
  expect(json.ok).toBe(false);
});
