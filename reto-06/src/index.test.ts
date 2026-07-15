import { vi } from 'vitest';
import { checkTrigger, runReport, type Env } from './index';

vi.mock('./lib/cloudflare', () => ({ fetchTraffic: vi.fn(async () => { throw new Error('cf down'); }) }));
vi.mock('./lib/supabase', () => ({ countRows: vi.fn(async () => 0) }));
const sendEmail = vi.fn(async (..._a: unknown[]) => {});
vi.mock('./lib/gmail', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

test('checkTrigger acepta el token por query param', () => {
  const url = new URL('https://x/__run?token=secreto');
  expect(checkTrigger(url, new Headers(), 'secreto')).toBe(true);
});

test('checkTrigger acepta el token por header', () => {
  const url = new URL('https://x/__run');
  expect(checkTrigger(url, new Headers({ 'x-trigger-token': 'secreto' }), 'secreto')).toBe(true);
});

test('checkTrigger rechaza token incorrecto o ausente', () => {
  const url = new URL('https://x/__run');
  expect(checkTrigger(url, new Headers(), 'secreto')).toBe(false);
  expect(checkTrigger(new URL('https://x/__run?token=malo'), new Headers(), 'secreto')).toBe(false);
});

test('runReport envía el correo aunque falle una fuente (degradado)', async () => {
  const env = {
    AI: { run: async () => ({ response: '' }) },
    CF_ACCOUNT_ID: 'a', REPORT_TO: 'x@y.com', CF_ANALYTICS_TOKEN: 't',
    SUPABASE_URL: 'https://s.co', SUPABASE_SECRET_KEY: 'k',
    GMAIL_CLIENT_ID: 'c', GMAIL_CLIENT_SECRET: 's', GMAIL_REFRESH_TOKEN: 'r', TRIGGER_TOKEN: 'z',
  } as unknown as Env;
  const out = await runReport(env, Date.parse('2026-07-17T22:00:00.000Z'));
  expect(sendEmail).toHaveBeenCalledOnce();
  expect(out.subject).toContain('Pulso');
});
