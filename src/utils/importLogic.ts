import { CategoriaJugador, Jugador, ManoHabil, RolJugador } from '../types';
import { normalizarDni } from './authLogic';

export interface ResultadoImportacionPadron {
  validos: Omit<Jugador, 'id'>[];
  duplicados: Array<{ fila: number; nombre: string; motivo: string }>;
  errores: Array<{ fila: number; linea: string; motivo: string }>;
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

function normalizarFechaNacimiento(raw: string): string | undefined {
  const clean = (raw || '').trim();
  if (!clean) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  const ddmmyyyy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const d = ddmmyyyy[1].padStart(2, '0');
    const m = ddmmyyyy[2].padStart(2, '0');
    const y = ddmmyyyy[3];
    return `${y}-${m}-${d}`;
  }
  return undefined;
}

function normalizarRol(raw: string): RolJugador {
  const r = (raw || '').toLowerCase();
  if (r.includes('zagu')) return 'Zaguero';
  if (r.includes('amb')) return 'Ambos';
  return 'Delantero';
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
  const lineas = (texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const validos: Omit<Jugador, 'id'>[] = [];
  const duplicados: ResultadoImportacionPadron['duplicados'] = [];
  const errores: ResultadoImportacionPadron['errores'] = [];

  if (lineas.length === 0) return { validos, duplicados, errores };

  const sep = detectarSeparador(lineas[0]);
  const primeraCols = splitCsvLine(lineas[0], sep).map(normalizarHeader);
  const tieneEncabezado = primeraCols.some((c) =>
    ['nombre', 'apellido', 'dni', 'documento', 'telefono', 'celular', 'email', 'correo', 'fecha'].some((k) => c.includes(k))
  );

  const colIndex = (aliases: string[], fallback: number): number => {
    if (!tieneEncabezado) return fallback;
    return primeraCols.findIndex((h) => aliases.some((a) => h === a || h.includes(a)));
  };

  const idxNombre = colIndex(['nombre completo', 'jugador', 'nombre y apellido', 'nombre'], 0);
  const idxApellido = tieneEncabezado ? colIndex(['apellido'], -1) : 1;
  const idxDni = colIndex(['dni', 'documento', 'cuil'], tieneEncabezado ? -1 : 2);
  const idxNac = colIndex(['nacimiento', 'fecha nac', 'f nac', 'fnac'], tieneEncabezado ? -1 : 3);
  const idxTel = colIndex(['telefono', 'celular', 'whatsapp', 'tel'], tieneEncabezado ? -1 : 4);
  const idxLoc = colIndex(['localidad', 'ciudad'], tieneEncabezado ? -1 : 5);
  const idxEmail = colIndex(['email', 'correo', 'mail'], tieneEncabezado ? -1 : 6);
  const idxRol = colIndex(['rol', 'posicion', 'puesto'], -1);
  const idxCat = colIndex(['categoria', 'cat'], -1);
  const idxMano = colIndex(['mano'], -1);
  const idxSocio = colIndex(['es socio', 'socio club'], -1);
  const idxNroSocio = colIndex(['numero socio', 'nro socio', 'n socio'], -1);
  const idxEmerg = colIndex(['emergencia', 'contacto emergencia'], -1);
  const idxObs = colIndex(['obra social', 'seguro', 'observacion', 'notas'], -1);

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

    const get = (idx: number) => (idx >= 0 && idx < cols.length ? cols[idx].trim() : '');

    let nombrePila = get(idxNombre);
    let apellido = get(idxApellido);

    // Si viene columna única "Nombre Completo" sin columna Apellido
    if (!apellido && nombrePila.includes(' ')) {
      const partes = nombrePila.split(/\s+/);
      nombrePila = partes.slice(0, -1).join(' ');
      apellido = partes[partes.length - 1];
    }

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

    validos.push({
      nombre: nombreCompleto,
      nombrePila: nombrePila || nombreCompleto,
      apellido: apellido || '',
      dni: dniClean || dniRaw || undefined,
      fechaNacimiento,
      email: email || undefined,
      telefono,
      localidad,
      rol: normalizarRol(get(idxRol)),
      categoria: normalizarCategoria(get(idxCat)),
      manoHabil: normalizarMano(get(idxMano)),
      esSocioClub: idxSocio >= 0 ? normalizarSocio(get(idxSocio)) : true,
      numeroSocio: get(idxNroSocio) || undefined,
      contactoEmergencia: get(idxEmerg) || undefined,
      observaciones: get(idxObs) || 'Importado de planilla / seguro club',
      saldoCuentaCorriente: 0,
      activo: true,
      partidosJugados: 0,
    });
  }

  return { validos, duplicados, errores };
}
