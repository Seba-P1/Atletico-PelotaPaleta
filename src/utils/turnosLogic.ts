import { Turno, ParejaTurno } from '../types';

export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(monto);
}

export function calcularJugadoresOcupados(
  turnos: Record<string, Turno>,
  excluirTurnoId: string | null = null
): Set<string> {
  const ocupados = new Set<string>();

  Object.entries(turnos).forEach(([id, turno]) => {
    if (excluirTurnoId && id === excluirTurnoId) return;
    if (turno.estado === 'ocupado') {
      if (turno.p1) {
        if (turno.p1.delantero?.trim()) ocupados.add(turno.p1.delantero.trim());
        if (turno.p1.zaguero?.trim()) ocupados.add(turno.p1.zaguero.trim());
      }
      if (turno.p2) {
        if (turno.p2.delantero?.trim()) ocupados.add(turno.p2.delantero.trim());
        if (turno.p2.zaguero?.trim()) ocupados.add(turno.p2.zaguero.trim());
      }
    }
  });

  return ocupados;
}

export interface ValidacionReserva {
  valido: boolean;
  error?: string;
}

export function validarReserva(
  p1: ParejaTurno,
  p2: ParejaTurno,
  organizadorNombre: string
): ValidacionReserva {
  const jugadores = [p1.delantero, p1.zaguero, p2.delantero, p2.zaguero]
    .map((n) => (n || '').trim())
    .filter(Boolean);

  if (jugadores.length === 0) {
    return { valido: false, error: 'Selecciona al menos 1 pelotari para reservar el turno.' };
  }

  const unicos = new Set(jugadores.map((j) => j.toLowerCase()));
  if (unicos.size < jugadores.length) {
    return { valido: false, error: 'No se puede repetir el mismo jugador en el mismo turno.' };
  }

  const orgLimpio = (organizadorNombre || '').trim();
  if (
    orgLimpio &&
    orgLimpio.toLowerCase() !== 'a confirmar' &&
    !unicos.has(orgLimpio.toLowerCase())
  ) {
    return { valido: false, error: 'El organizador del turno debe ser uno de los jugadores convocados.' };
  }

  return { valido: true };
}

export function calcularEstadisticasOcupacion(turnos: Record<string, Turno>) {
  const lista = Object.values(turnos);
  const total = lista.length;
  const ocupados = lista.filter(t => t.estado === 'ocupado').length;
  const libres = lista.filter(t => t.estado === 'libre').length;
  const mantenimiento = lista.filter(t => t.estado === 'mantenimiento' || t.estado === 'bloqueado').length;
  const tasaOcupacion = total > 0 ? Math.round((ocupados / total) * 100) : 0;

  return { total, ocupados, libres, mantenimiento, tasaOcupacion };
}

export function generarMensajeWhatsAppTurno(turno: Turno, etiquetaHorario: string, fechaStr: string): string {
  const p1 = turno.p1;
  const p2 = turno.p2;
  const p1Txt = p1 ? `🎾 *Pareja 1*: ${p1.delantero || 'A confirmar'} (D) y ${p1.zaguero || 'A confirmar'} (Z)` : '';
  const p2Txt = p2 ? `🎾 *Pareja 2*: ${p2.delantero || 'A confirmar'} (D) y ${p2.zaguero || 'A confirmar'} (Z)` : '';
  const org = turno.organizadorNombre ? `👤 *Organiza*: ${turno.organizadorNombre}` : '';
  const notas = turno.notas ? `📝 *Notas*: ${turno.notas}` : '';
  const costo = turno.costoTotal ? `💰 *Valor*: ${formatearMoneda(turno.costoTotal)} ${turno.pagado ? '(PAGADO ✅)' : '(A abonar en cantina)'}` : '';

  return encodeURIComponent(
`🏛️ *CLUB ATLÉTICO RÍO COLORADO*
🎾 *Trinquete de Pelota Paleta*

📅 *Fecha*: ${fechaStr}
⏰ *Horario*: ${etiquetaHorario}
${org}

${p1Txt}
${p2Txt}
${costo}
${notas}

🍻 ¡Los esperamos en el buffet para el tercer tiempo!`
  );
}

export function filtrarHorariosVisibles(horarios: any[], esAdmin: boolean): any[] {
  if (esAdmin) return horarios;
  return horarios.filter(h => h.activo !== false);
}

export function generarClaveTurno(fecha: string, horarioId: string): string {
  return `${fecha}__${horarioId}`;
}

export function normalizarTurnosLegacy(
  rawTurnos: Record<string, Turno>,
  fechaDefault: string
): Record<string, Turno> {
  const normalizados: Record<string, Turno> = {};
  Object.entries(rawTurnos || {}).forEach(([clave, turno]) => {
    const fecha = turno.fecha || fechaDefault;
    const horarioId = turno.horarioId || (clave.includes('__') ? clave.split('__')[1] : clave);
    const claveReal = generarClaveTurno(fecha, horarioId);
    normalizados[claveReal] = {
      ...turno,
      id: claveReal,
      horarioId,
      fecha,
    };
  });
  return normalizados;
}

export function obtenerTurnosDeFecha(
  turnosGlobales: Record<string, Turno>,
  fecha: string
): Record<string, Turno> {
  const delDia: Record<string, Turno> = {};
  Object.values(turnosGlobales).forEach((t) => {
    if (t.fecha === fecha) {
      delDia[t.horarioId] = t;
    }
  });
  return delDia;
}

export function calcularOcupacionFecha(
  turnosDelDia: Record<string, Turno>,
  horariosActivos: { id: string }[]
) {
  const total = horariosActivos.length;
  let ocupados = 0;
  let mantenimiento = 0;

  horariosActivos.forEach((h) => {
    const t = turnosDelDia[h.id];
    if (!t) return;
    if (t.estado === 'ocupado') ocupados++;
    else if (t.estado === 'mantenimiento' || t.estado === 'bloqueado') mantenimiento++;
  });

  const libres = Math.max(0, total - ocupados - mantenimiento);
  const tasaOcupacion = total > 0 ? Math.round((ocupados / total) * 100) : 0;

  return { total, ocupados, libres, mantenimiento, tasaOcupacion };
}

export interface DiaCalendario {
  fecha: string;
  diaSemana: string;
  numeroDia: string;
  mesCorto: string;
  etiqueta: string;
  esHoy: boolean;
}

export function generarProximosDias(cantidad: number, baseFecha?: string): DiaCalendario[] {
  const dias: DiaCalendario[] = [];
  const hoyStr = baseFecha || new Date().toISOString().split('T')[0];
  const baseDate = new Date(hoyStr + 'T12:00:00');
  const total = Math.max(1, Math.min(30, cantidad));

  for (let i = 0; i < total; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const fecha = d.toISOString().split('T')[0];
    const diaSemana = d
      .toLocaleDateString('es-AR', { weekday: 'short' })
      .replace('.', '')
      .toUpperCase();
    const numeroDia = String(d.getDate()).padStart(2, '0');
    const mesCorto = d
      .toLocaleDateString('es-AR', { month: 'short' })
      .replace('.', '');

    dias.push({
      fecha,
      diaSemana: i === 0 ? 'HOY' : i === 1 ? 'MAÑ' : diaSemana,
      numeroDia,
      mesCorto,
      etiqueta: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${diaSemana} ${numeroDia}/${d.getMonth() + 1}`,
      esHoy: i === 0,
    });
  }

  return dias;
}

export interface FechaHoraArgentina {
  fechaIso: string;
  hora: number;
  minuto: number;
  horaFormateada: string;
}

export function obtenerFechaHoraArgentina(ahora: Date = new Date()): FechaHoraArgentina {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(ahora);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  let hourNum = Number(get('hour'));
  if (hourNum === 24) hourNum = 0;
  const minuteNum = Number(get('minute'));

  return {
    fechaIso: `${year}-${month}-${day}`,
    hora: hourNum,
    minuto: minuteNum,
    horaFormateada: `${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}`,
  };
}

export interface EvaluacionBloqueoDia {
  bloqueado: boolean;
  motivo: string;
  actualizadoPor?: string;
}

export function evaluarBloqueoDia(
  fechaSeleccionada: string,
  diasBloqueados: Record<string, { bloqueado: boolean; motivo: string; actualizadoPor?: string }>
): EvaluacionBloqueoDia {
  const reg = diasBloqueados?.[fechaSeleccionada];
  if (reg?.bloqueado) {
    return {
      bloqueado: true,
      motivo: reg.motivo?.trim() || 'Jornada bloqueada por evento especial del club.',
      actualizadoPor: reg.actualizadoPor,
    };
  }
  return { bloqueado: false, motivo: '' };
}

export interface EvaluacionVentanaReserva {
  habilitado: boolean;
  motivo?: string;
  esHoy: boolean;
  antesDeApertura: boolean;
  esDiaBloqueado: boolean;
  horaApertura: number;
  fechaHoyAr: string;
  horaActualAr: string;
}

export function evaluarVentanaReserva(params: {
  fechaSeleccionada: string;
  soloTurnosEnElDia?: boolean;
  horaAperturaTurnos?: number;
  diasBloqueados?: Record<string, { bloqueado: boolean; motivo: string; actualizadoPor?: string }>;
  esStaff?: boolean;
  ahora?: Date;
}): EvaluacionVentanaReserva {
  const {
    fechaSeleccionada,
    soloTurnosEnElDia = true,
    horaAperturaTurnos = 8,
    diasBloqueados = {},
    esStaff = false,
    ahora = new Date(),
  } = params;

  const { fechaIso: fechaHoyAr, hora, horaFormateada } = obtenerFechaHoraArgentina(ahora);
  const esHoy = fechaSeleccionada === fechaHoyAr;
  const horaApertura = Math.max(0, Math.min(23, Number(horaAperturaTurnos ?? 8)));
  const antesDeApertura = hora < horaApertura;
  const bloqueoDia = evaluarBloqueoDia(fechaSeleccionada, diasBloqueados);

  if (bloqueoDia.bloqueado && !esStaff) {
    return {
      habilitado: false,
      motivo: `Turnos suspendidos por evento especial: ${bloqueoDia.motivo}`,
      esHoy,
      antesDeApertura,
      esDiaBloqueado: true,
      horaApertura,
      fechaHoyAr,
      horaActualAr: horaFormateada,
    };
  }

  if (soloTurnosEnElDia && !esStaff) {
    if (!esHoy) {
      return {
        habilitado: false,
        motivo: `Las reservas públicas se habilitan únicamente en el día (${fechaHoyAr}) a partir de las ${String(horaApertura).padStart(2, '0')}:00 hs.`,
        esHoy,
        antesDeApertura,
        esDiaBloqueado: bloqueoDia.bloqueado,
        horaApertura,
        fechaHoyAr,
        horaActualAr: horaFormateada,
      };
    }

    if (antesDeApertura) {
      return {
        habilitado: false,
        motivo: `La reserva de turnos del día se habilita a las ${String(horaApertura).padStart(2, '0')}:00 hs (hora actual ${horaFormateada} hs).`,
        esHoy,
        antesDeApertura: true,
        esDiaBloqueado: bloqueoDia.bloqueado,
        horaApertura,
        fechaHoyAr,
        horaActualAr: horaFormateada,
      };
    }
  }

  return {
    habilitado: true,
    esHoy,
    antesDeApertura,
    esDiaBloqueado: bloqueoDia.bloqueado,
    horaApertura,
    fechaHoyAr,
    horaActualAr: horaFormateada,
  };
}

export function formatearObservacionInvitado(nombreInvitado: string, observacion?: string): string {
  const n = (nombreInvitado || '').trim() || 'Invitado';
  const obs = (observacion || '').trim();
  return obs ? `Invitado: ${n} (${obs})` : `Invitado: ${n} (No registrado)`;
}

export function combinarNotasInvitado(notasBase: string, observacionesInvitados: string[]): string {
  const cleanNotas = (notasBase || '').trim();
  const cleanInv = observacionesInvitados.map((s) => s.trim()).filter(Boolean);
  if (cleanInv.length === 0) return cleanNotas;
  const bloqueInv = `[Servicio de Invitado] ${cleanInv.join(' | ')}`;
  if (!cleanNotas) return bloqueInv;
  if (cleanNotas.includes(bloqueInv)) return cleanNotas;
  return `${cleanNotas}\n${bloqueInv}`;
}

