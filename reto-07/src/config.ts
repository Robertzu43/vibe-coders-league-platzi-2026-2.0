export const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const SHEET_TAB = 'Backlog';
export const SHEET_RANGE = `${SHEET_TAB}!A1`;
export const SHEET_HEADERS = [
  'fecha', 'titulo', 'severidad', 'prioridad', 'area',
  'enProduccion', 'afectaNucleo', 'perdidaDatos', 'razon', 'accionSugerida',
] as const;
