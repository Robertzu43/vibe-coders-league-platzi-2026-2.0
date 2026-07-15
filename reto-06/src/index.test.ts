import { checkTrigger } from './index';

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
