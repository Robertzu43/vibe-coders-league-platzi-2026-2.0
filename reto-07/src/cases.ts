export interface ExampleCase { text: string; esperado: 'urgente' | 'registrar'; nota: string; }

export const CASES: ExampleCase[] = [
  { text: 'El checkout tira error 500 al pagar en producción, ningún usuario puede completar la compra.', esperado: 'urgente', nota: 'prod + núcleo' },
  { text: 'Al editar un registro se borran los datos de otros registros. Se está perdiendo información.', esperado: 'urgente', nota: 'pérdida de datos' },
  { text: 'El botón de ayuda se ve gris y desalineado en móvil.', esperado: 'registrar', nota: 'cosmético' },
  { text: 'La app falla solo en mi entorno local con Node 18, en dev.', esperado: 'registrar', nota: 'no-prod' },
  { text: 'Estaría bueno poder exportar el reporte a CSV.', esperado: 'registrar', nota: 'feature' },
];
