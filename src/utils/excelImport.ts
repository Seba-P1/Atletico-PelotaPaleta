import * as XLSX from 'xlsx';

function formatearCeldaFecha(fecha: Date): string {
  if (isNaN(fecha.getTime())) return '';
  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const d = String(fecha.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function limpiarValorCelda(celda: unknown): string {
  if (celda === null || celda === undefined) return '';
  if (celda instanceof Date) {
    return formatearCeldaFecha(celda);
  }
  const str = String(celda);
  return str.replace(/[\r\n\t]+/g, ' ').trim();
}

/**
 * Lee un archivo de planilla (.xlsx, .xls, .csv, .tsv, .txt) y lo convierte a formato TSV plano (texto separado por tabs).
 * En caso de Excel, extrae la primera hoja, respeta fechas en formato UTC YYYY-MM-DD y descarta filas vacías.
 */
export async function leerArchivoPlanillaATexto(file: File): Promise<string> {
  const nombre = (file.name || '').toLowerCase();
  const tipo = (file.type || '').toLowerCase();

  const esExcel =
    nombre.endsWith('.xlsx') ||
    nombre.endsWith('.xls') ||
    tipo.includes('spreadsheetml') ||
    tipo.includes('ms-excel') ||
    tipo === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    tipo === 'application/vnd.ms-excel';

  if (esExcel) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const primeraHojaNombre = workbook.SheetNames[0];
    if (!primeraHojaNombre) return '';

    const sheet = workbook.Sheets[primeraHojaNombre];
    if (!sheet) return '';

    const filas = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: true,
      defval: '',
    });

    const lineasTsv: string[] = [];
    for (const fila of filas) {
      if (!Array.isArray(fila)) continue;
      const celdasLimpias = fila.map(limpiarValorCelda);
      const tieneContenido = celdasLimpias.some((c) => c.length > 0);
      if (tieneContenido) {
        lineasTsv.push(celdasLimpias.join('\t'));
      }
    }
    return lineasTsv.join('\n');
  }

  return await file.text();
}
