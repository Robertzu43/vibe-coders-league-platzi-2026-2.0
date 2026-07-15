import { fetchTraffic } from './cloudflare';

const sample = {
  data: { viewer: { accounts: [ { workersInvocationsAdaptiveGroups: [
    { dimensions: { scriptName: 'parla' }, sum: { requests: 100, errors: 2, subrequests: 5 }, quantiles: { cpuTimeP50: 3, cpuTimeP99: 12 } },
    { dimensions: { scriptName: 'golazo' }, sum: { requests: 50, errors: 0, subrequests: 1 }, quantiles: { cpuTimeP50: 2, cpuTimeP99: 9 } },
  ] } ] } },
};

function mockFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () => ({ ok, status, json: async () => body } as Response)) as unknown as typeof fetch;
}

test('fetchTraffic parsea grupos a LandingTraffic[]', async () => {
  const rows = await fetchTraffic({
    accountId: 'acc', token: 'tok', scripts: ['parla', 'golazo'],
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch(sample),
  });
  expect(rows).toEqual([
    { scriptName: 'parla', requests: 100, errors: 2, subrequests: 5, cpuP50: 3, cpuP99: 12 },
    { scriptName: 'golazo', requests: 50, errors: 0, subrequests: 1, cpuP50: 2, cpuP99: 9 },
  ]);
});

test('fetchTraffic lanza en HTTP no-ok', async () => {
  await expect(fetchTraffic({
    accountId: 'a', token: 't', scripts: [], window: { startISO: 'a', endISO: 'b' },
    fetchImpl: mockFetch({}, false, 403),
  })).rejects.toThrow('403');
});

test('fetchTraffic lanza si el payload trae errors', async () => {
  await expect(fetchTraffic({
    accountId: 'a', token: 't', scripts: [], window: { startISO: 'a', endISO: 'b' },
    fetchImpl: mockFetch({ errors: [{ message: 'bad token' }] }),
  })).rejects.toThrow(/bad token/);
});
