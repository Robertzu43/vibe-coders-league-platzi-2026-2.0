import type {
  LandingTraffic, LandingReport, ReportModel, Windows, Conversions,
} from '../types';

function deltaPct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

export function buildReport(input: {
  window: Windows;
  currentTraffic: LandingTraffic[];
  previousTraffic: LandingTraffic[];
  currentConversions: Conversions;
  previousConversions: Conversions;
  degraded: { traffic: boolean; conversions: boolean };
  errorRateAlert?: number;   // default 0.05
  trafficDropAlert?: number; // default -30
}): ReportModel {
  const errThreshold = input.errorRateAlert ?? 0.05;
  const dropThreshold = input.trafficDropAlert ?? -30;
  const prevByName = new Map(input.previousTraffic.map((t) => [t.scriptName, t]));

  const landings: LandingReport[] = input.currentTraffic.map((t) => {
    const requestsPrev = prevByName.get(t.scriptName)?.requests ?? 0;
    const errorRate = t.requests > 0 ? t.errors / t.requests : 0;
    return {
      scriptName: t.scriptName,
      requests: t.requests,
      errors: t.errors,
      errorRate,
      cpuP50: t.cpuP50,
      requestsPrev,
      deltaPct: deltaPct(t.requests, requestsPrev),
    };
  });

  const totalRequests = landings.reduce((a, l) => a + l.requests, 0);
  const totalErrors = landings.reduce((a, l) => a + l.errors, 0);
  const totalPrev = input.previousTraffic.reduce((a, l) => a + l.requests, 0);
  const topLanding = landings.length
    ? landings.reduce((a, b) => (b.requests > a.requests ? b : a)).scriptName
    : null;

  const alerts: string[] = [];
  for (const l of landings) {
    if (l.errorRate > errThreshold) {
      alerts.push(`${l.scriptName}: tasa de error ${(l.errorRate * 100).toFixed(1)}%`);
    }
    if (l.deltaPct !== null && l.deltaPct < dropThreshold) {
      alerts.push(`${l.scriptName}: tráfico ${l.deltaPct.toFixed(0)}% vs. semana previa`);
    }
  }

  return {
    window: input.window,
    landings,
    totalRequests,
    totalErrors,
    topLanding,
    requestsDeltaPct: deltaPct(totalRequests, totalPrev),
    conversions: {
      leads: input.currentConversions.leads,
      leadsPrev: input.previousConversions.leads,
      leadsDeltaPct: deltaPct(input.currentConversions.leads, input.previousConversions.leads),
      preorders: input.currentConversions.preorders,
      preordersPrev: input.previousConversions.preorders,
      preordersDeltaPct: deltaPct(input.currentConversions.preorders, input.previousConversions.preorders),
    },
    alerts,
    degraded: input.degraded,
  };
}
