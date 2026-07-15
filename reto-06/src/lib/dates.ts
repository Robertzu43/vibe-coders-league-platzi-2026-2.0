import type { Windows, Window } from '../types';

const DAY = 86_400_000;

export function computeWindows(now: number): Windows {
  const end = new Date(now);
  const currentStart = new Date(now - 7 * DAY);
  const prevStart = new Date(now - 14 * DAY);
  return {
    current: { startISO: currentStart.toISOString(), endISO: end.toISOString() },
    previous: { startISO: prevStart.toISOString(), endISO: currentStart.toISOString() },
  };
}

export function formatRange(w: Window): string {
  return `${w.startISO.slice(0, 10)} → ${w.endISO.slice(0, 10)}`;
}
