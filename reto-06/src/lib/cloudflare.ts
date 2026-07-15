import type { LandingTraffic, Window } from '../types';

const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

const QUERY = `query($tag: String!, $start: Time!, $end: Time!, $scripts: [String!]!) {
  viewer { accounts(filter: { accountTag: $tag }) {
    workersInvocationsAdaptive(limit: 100, filter: { datetime_geq: $start, datetime_leq: $end, scriptName_in: $scripts }) {
      dimensions { scriptName }
      sum { requests errors subrequests }
      quantiles { cpuTimeP50 cpuTimeP99 }
    }
  } }
}`;

export async function fetchTraffic(opts: {
  accountId: string;
  token: string;
  scripts: readonly string[];
  window: Window;
  fetchImpl?: typeof fetch;
}): Promise<LandingTraffic[]> {
  const f = opts.fetchImpl ?? fetch;
  const res = await f(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { tag: opts.accountId, start: opts.window.startISO, end: opts.window.endISO, scripts: opts.scripts },
    }),
  });
  if (!res.ok) throw new Error(`Cloudflare GraphQL HTTP ${res.status}`);
  const json = (await res.json()) as any;
  if (json.errors?.length) throw new Error(`Cloudflare GraphQL: ${JSON.stringify(json.errors)}`);
  const groups = json.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? [];
  return groups.map((g: any): LandingTraffic => ({
    scriptName: g.dimensions.scriptName,
    requests: g.sum?.requests ?? 0,
    errors: g.sum?.errors ?? 0,
    subrequests: g.sum?.subrequests ?? 0,
    cpuP50: g.quantiles?.cpuTimeP50 ?? 0,
    cpuP99: g.quantiles?.cpuTimeP99 ?? 0,
  }));
}
