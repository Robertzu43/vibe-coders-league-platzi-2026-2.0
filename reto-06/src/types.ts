export interface Window { startISO: string; endISO: string; }
export interface Windows { current: Window; previous: Window; }

export interface LandingTraffic {
  scriptName: string;
  requests: number;
  errors: number;
  subrequests: number;
  cpuP50: number;
  cpuP99: number;
}

export interface Conversions { leads: number; preorders: number; }

export interface LandingReport {
  scriptName: string;
  requests: number;
  errors: number;
  errorRate: number;
  cpuP50: number;
  requestsPrev: number;
  deltaPct: number | null;
}

export interface ConversionReport {
  leads: number; leadsPrev: number; leadsDeltaPct: number | null;
  preorders: number; preordersPrev: number; preordersDeltaPct: number | null;
}

export interface ReportModel {
  window: Windows;
  landings: LandingReport[];
  totalRequests: number;
  totalErrors: number;
  topLanding: string | null;
  requestsDeltaPct: number | null;
  conversions: ConversionReport;
  alerts: string[];
  degraded: { traffic: boolean; conversions: boolean };
}
