import { CategoriaJugador, Jugador, ManoHabil, RolJugador } from '../types';
import { normalizarDni } from './authLogic';

export interface ResultadoImportacionPadron {
  validos: Omit<Jugador, 'id'>[];
  duplicados: Array<{ fila: number; nombre: string; motivo: string }>;
  errores: Array<{ fila: number; linea: string; motivo: string }>;
}

/**
 * Formatea nombres y apellidos en Title Case (ej: "ABDALA" -> "Abdala", "ANDREA MARIANA" -> "Andrea Mariana").
 * Si el texto viene todo en MAYÚSCULAS o todo en minúsculas, lo convierte a Title Case colapsando espacios múltiples.
 * Si ya tiene mezcla intencional (ej: "McEnroe"), preserva la capitalización.
 */
export function formatearNombrePropio(valor: string): string {
  const limpio = (valor || '').replace(/\s+/g, ' ').trim();
  if (!limpio) return '';

  const esTodoMayus = limpio === limpio.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(limpio);
  const esTodoMinus = limpio === limpio.toLowerCase() && /[a-záéíóúñ]/.test(limpio);

  if (!esTodoMayus && !esTodoMinus) {
    return limpio;
  }

  return limpio
    .toLowerCase()
    .split(' ')
    .map((palabra) => {
      if (!palabra) return '';
      return palabra.charAt(0).toUpperCase() + palabra.slice(1);
    })
    .join(' ');
}

function detectarSeparador(primeraLinea: string): string {
  const counts = [
    { sep: '\t', n: (primeraLinea.match(/\t/g) || []).length },
    { sep: ';', n: (primeraLinea.match(/;/g) || []).length },
    { sep: ',', n: (primeraLinea.match(/,/g) || []).length },
  ].sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].sep : ',';
}

function splitCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizarHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Valida de forma estricta una fecha calendario en formatos YYYY-MM-DD, D/M/YYYY o DD/MM/YYYY.
 * Verifica año razonable (1920 a año actual), meses de 1 a 12 y días válidos según el mes (incluye bisiestos).
 * Devuelve YYYY-MM-DD o undefined si es inválida, evitando que PostgreSQL aborte el lote de importación.
 */
export function normalizarFechaNacimiento(raw: string): string | undefined {
  const clean = (raw || '').trim();
  if (!clean) return undefined;

  const anioActual = new Date().getFullYear();
  let dia: number | null = null;
  let mes: number | null = null;
  let anio: number | null = null;

  const matchYmd = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (matchYmd) {
    anio = parseInt(matchYmd[1], 10);
    mes = parseInt(matchYmd[2], 10);
    dia = parseInt(matchYmd[3], 10);
  } else {
    const matchDmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (matchDmy) {
      dia = parseInt(matchDmy[1], 10);
      mes = parseInt(matchDmy[2], 10);
      anio = parseInt(matchDmy[3], 10);
    }
  }

  if (dia === null || mes === null || anio === null) return undefined;
  if (anio < 1920 || anio > anioActual) return undefined;
  if (mes < 1 || mes > 12) return undefined;
  if (dia < 1 || dia > 31) return undefined;

  const esBisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  const diasPorMes = [31, esBisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (dia > diasPorMes[mes - 1]) return undefined;

  const yStr = String(anio);
  const mStr = String(mes).padStart(2, '0');
  const dStr = String(dia).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

function normalizarRol(raw: string): RolJugador {
  const r = (raw || '').toLowerCase();
  if (r.includes('zagu')) return 'Zaguero';
  if (r.includes('delan')) return 'Delantero';
  return 'Ambos';
}

function normalizarCategoria(raw: string): CategoriaJugador {
  const r = (raw || '').toLowerCase();
  if (r.includes('1')) return '1ra';
  if (r.includes('2')) return '2da';
  if (r.includes('3')) return '3ra';
  if (r.includes('vet') || r.includes('sen')) return 'Veteranos';
  return 'Promocional';
}

function normalizarMano(raw: string): ManoHabil {
  const r = (raw || '').toLowerCase();
  if (r.includes('zur')) return 'Zurda';
  if (r.includes('amb')) return 'Ambidiestro';
  return 'Derecha';
}

function normalizarSocio(raw: string): boolean {
  const r = (raw || '').toLowerCase().trim();
  if (!r) return true;
  return ['si', 'sí', 'true', '1', 'socio', 'activo', 'x'].includes(r);
}

export function parsearPadronImportado(
  texto: string,
  existentes: Jugador[]
): ResultadoImportacionPadron {
  const validos: Omit<Jugador, 'id'>[] = [];
  const duplicados: ResultadoImportacionPadron['duplicados'] = [];
  const errores: ResultadoImportacionPadron['errores'] = [];

  // Bloqueo obligatorio de contenido binario / XLSX sin decodificar
  const trimTexto = (texto || '').trimStart();
  const replacementCount = (texto.match(/\uFFFD/g) || []).length;
  const esBinarioNoDecodificado =
    trimTexto.startsWith('PK') ||
    texto.includes('[Content_Types].xml') ||
    texto.includes('\u0000') ||
    replacementCount > 3;

  if (esBinarioNoDecodificado) {
    return {
      validos,
      duplicados,
      errores: [
        {
          fila: 1,
          linea: 'Archivo binario no decodificado',
          motivo:
            'El texto parece un archivo Excel binario (.xlsx) leído como texto. Subilo con el botón "Subir Excel / CSV" o copiá y pegá las filas desde Excel.',
        },
      ],
    };
  }

  const lineas = (texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lineas.length === 0) return { validos, duplicados, errores };

  const sep = detectarSeparador(lineas[0]);
  const primeraCols = splitCsvLine(lineas[0], sep).map(normalizarHeader);
  const tieneEncabezado = primeraCols.some((c) =>
    ['nombre', 'apellido', 'dni', 'documento', 'telefono', 'celular', 'email', 'correo', 'fecha', 'direccion', 'domicilio'].some((k) => c.includes(k))
  );

  let colPatronSinHeaderClub = false;
  if (!tieneEncabezado) {
    const rawCols0 = splitCsvLine(lineas[0], sep).map((c) => c.trim());
    const col0EsNumeroFila = /^\d{1,4}$/.test(rawCols0[0] || '');
    const col1EsDni = /^\d{7,9}$/.test(normalizarDni(rawCols0[1] || ''));
    if (col0EsNumeroFila && col1EsDni) {
      colPatronSinHeaderClub = true;
    }
  }

  const colIndex = (aliases: string[], fallback: number): number => {
    if (!tieneEncabezado) return fallback;
    return primeraCols.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));
  };

  let idxNombre = colIndex(['nombre completo', 'jugador', 'nombre y apellido', 'nombre'], 0);
  let idxApellido = tieneEncabezado ? colIndex(['apellido'], -1) : 1;
  let idxDni = colIndex(['dni', 'documento', 'cuil'], tieneEncabezado ? -1 : 2);
  let idxNac = colIndex(['nacimiento', 'fecha nac', 'f nac', 'fnac'], tieneEncabezado ? -1 : 3);
  let idxTel = colIndex(['telefono', 'celular', 'whatsapp', 'tel'], tieneEncabezado ? -1 : 4);
  let idxLoc = colIndex(['localidad', 'ciudad'], tieneEncabezado ? -1 : 5);
  let idxEmail = colIndex(['email', 'correo', 'mail'], tieneEncabezado ? -1 : 6);
  let idxDireccion = colIndex(['direccion', 'domicilio', 'calle'], -1);
  const idxRol = colIndex(['rol', 'posicion', 'puesto'], -1);
  const idxCat = colIndex(['categoria', 'cat'], -1);
  const idxMano = colIndex(['mano'], -1);
  const idxSocio = colIndex(['es socio', 'socio club'], -1);
  const idxNroSocio = colIndex(['numero socio', 'nro socio', 'n socio'], -1);
  const idxEmerg = colIndex(['emergencia', 'contacto emergencia'], -1);
  const idxObs = colIndex(['obra social', 'seguro', 'observacion', 'notas'], -1);

  if (colPatronSinHeaderClub) {
    idxDni = 1;
    idxApellido = 2;
    idxNombre = 3;
    idxDireccion = 4;
    idxTel = 5;
    idxNac = 6;
    idxLoc = -1;
    idxEmail = -1;
  } else if (tieneEncabezado && lineas.length > 1) {
    // Si el encabezado no tenía columna inicial para # (o se omitió), pero las filas de datos empiezan con # (1, 2, 3...)
    // y DNI en la columna 1, desplazamos los índices para evitar desfasaje
    const rawFila1 = splitCsvLine(lineas[1], sep).map((c) => c.trim());
    const fila1Col0Numero = /^\d{1,4}$/.test(rawFila1[0] || '');
    const fila1Col1Dni = /^\d{7,9}$/.test(normalizarDni(rawFila1[1] || ''));
    if (fila1Col0Numero && fila1Col1Dni && idxDni === 0) {
      idxDni += 1;
      if (idxApellido >= 0) idxApellido += 1;
      if (idxNombre >= 0) idxNombre += 1;
      if (idxDireccion >= 0) idxDireccion += 1;
      if (idxTel >= 0) idxTel += 1;
      if (idxNac >= 0) idxNac += 1;
      if (idxLoc >= 0) idxLoc += 1;
      if (idxEmail >= 0) idxEmail += 1;
    }
  }

  const dnisExistentes = new Set(
    existentes.map((j) => normalizarDni(j.dni || '')).filter((d) => d.length >= 6)
  );
  const nombresExistentes = new Set(
    existentes.map((j) => j.nombre.trim().toLowerCase())
  );

  const startRow = tieneEncabezado ? 1 : 0;

  for (let i = startRow; i < lineas.length; i++) {
    const filaNum = i + 1;
    const cols = splitCsvLine(lineas[i], sep);

    const celdasConTexto = cols.map((c) => c.trim()).filter(Boolean);
    if (celdasConTexto.length === 0) {
      continue;
    }
    // Si la fila solo tiene un número de orden/fila (ej: 94) y nada más, ignorarla silenciosamente
    if (celdasConTexto.length === 1 && /^\d{1,5}$/.test(celdasConTexto[0])) {
      continue;
    }

    const tieneLetras = /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(lineas[i]);
    const tieneDniValido = cols.some((c) => normalizarDni(c).length >= 7);
    if (!tieneLetras && !tieneDniValido) {
      continue;
    }

    const get = (idx: number) => (idx >= 0 && idx < cols.length ? cols[idx].trim() : '');

    let nombrePila = get(idxNombre);
    let apellido = get(idxApellido);

    // Si viene columna única con coma "ABDALA, ANDREA MARIANA"
    if (!apellido && nombrePila.includes(',')) {
      const partes = nombrePila.split(',').map((s) => s.trim());
      if (partes[0] && partes[1]) {
        apellido = partes[0];
        nombrePila = partes[1];
      }
    } else if (!apellido && nombrePila.includes(' ')) {
      const partes = nombrePila.split(/\s+/);
      nombrePila = partes.slice(0, -1).join(' ');
      apellido = partes[partes.length - 1];
    }

    nombrePila = formatearNombrePropio(nombrePila);
    apellido = formatearNombrePropio(apellido);

    const nombreCompleto = [nombrePila, apellido].filter(Boolean).join(' ').trim();
    if (!nombreCompleto) {
      errores.push({ fila: filaNum, linea: lineas[i], motivo: 'Falta el nombre del jugador.' });
      continue;
    }

    const dniRaw = get(idxDni);
    const dniClean = normalizarDni(dniRaw);

    if (dniClean.length >= 6 && dnisExistentes.has(dniClean)) {
      duplicados.push({ fila: filaNum, nombre: nombreCompleto, motivo: `DNI ${dniClean} ya registrado` });
      continue;
    }
    if (nombresExistentes.has(nombreCompleto.toLowerCase())) {
      duplicados.push({ fila: filaNum, nombre: nombreCompleto, motivo: 'Nombre ya registrado en el padrón' });
      continue;
    }

    if (dniClean.length >= 6) dnisExistentes.add(dniClean);
    nombresExistentes.add(nombreCompleto.toLowerCase());

    const fechaNacimiento = normalizarFechaNacimiento(get(idxNac));
    const telefono = get(idxTel);
    const localidad = get(idxLoc) || 'Río Colorado';
    const email = get(idxEmail);

    const dirRaw = get(idxDireccion);
    const obsRaw = get(idxObs);
    const partesObs: string[] = [];
    if (dirRaw) {
      partesObs.push(`Dirección: ${formatearNombrePropio(dirRaw)}`);
    }
    if (obsRaw) {
      partesObs.push(obsRaw);
    }
    const observaciones = partesObs.length > 0 ? partesObs.join(' · ') : 'Importado de planilla / seguro club';

    validos.push({
      nombre: nombreCompleto,
      nombrePila: nombrePila || nombreCompleto,
      apellido: apellido || '',
      dni: dniClean || dniRaw || undefined,
      fechaNacimiento,
      email: email || undefined,
      telefono: telefono || '',
      localidad,
      rol: normalizarRol(get(idxRol)),
      categoria: normalizarCategoria(get(idxCat)),
      manoHabil: normalizarMano(get(idxMano)),
      esSocioClub: idxSocio >= 0 ? normalizarSocio(get(idxSocio)) : true,
      numeroSocio: get(idxNroSocio) || undefined,
      contactoEmergencia: get(idxEmerg) || undefined,
      observaciones,
      saldoCuentaCorriente: 0,
      activo: true,
      partidosJugados: 0,
    });
  }

  return { validos, duplicados, errores };
}
