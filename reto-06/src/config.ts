// Config no-secreta. Los scriptName se confirman contra `wrangler deployments list` / dashboard.
export const LANDINGS = ['parla', 'altura', 'radar-digital', 'golazo'] as const;
export const ALERTS = { errorRateAlert: 0.05, trafficDropAlert: -30 } as const;
export const TIMEZONE = 'America/Bogota';
