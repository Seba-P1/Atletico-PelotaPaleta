import { ClubConfig, Jugador } from '../types';

export const DIA_VENCIMIENTO_DEFAULT = 10;
export const DIAS_PREAVISO_DEFAULT = 3;

export type EstadoMensualidad = 'al_dia' | 'por_vencer' | 'vencida' | 'no_aplica';

export interface EstadoFinancieroJugador {
  mesActual: string; // YYYY-MM
  nombreMesActual: string; // ej: "Noviembre"
  diaDelMes: number;
  diaVencimiento: number;
  mensualidadPaga: boolean;
  ultimoMesPago?: string;
  estadoMensualidad: EstadoMensualidad;
  diasParaVencimiento: number; // 0 = vence hoy día 10, >0 = faltan N días, <0 = vencido hace |N| días
  mostrarAvisoPorVencer: boolean; // True cuando faltan <= 3 días (días 7, 8, 9 y 10) y no está paga
  mensualidadVencida: boolean; // True cuando pasó el día 10 y no está paga
  mensajeMensualidad: string | null;
  deudaCantina: number; // Monto positivo adeudado cuando saldoCuentaCorriente < 0
  saldoAFavorCantina: number;
  bloqueadoTurnos: boolean;
  motivoBloqueo?: string;
  requiereAtencion: boolean; // Por vencer, vencida, deuda cantina > 0 o bloqueado
}

const NOMBRES_MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function obtenerFechaLocalIso(fecha: Date = new Date()): string {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function obtenerMesAnioDesdeFecha(fechaIso?: string): {
  mesActual: string;
  nombreMes: string;
  diaDelMes: number;
} {
  const iso = fechaIso && /^\d{4}-\d{2}-\d{2}/.test(fechaIso)
    ? fechaIso.slice(0, 10)
    : obtenerFechaLocalIso();

  const [yStr, mStr, dStr] = iso.split('-');
  const monthIdx = Math.max(0, Math.min(11, Number(mStr) - 1));
  const diaDelMes = Number(dStr) || 1;

  return {
    mesActual: `${yStr}-${mStr}`,
    nombreMes: NOMBRES_MESES_ES[monthIdx] || mStr,
    diaDelMes,
  };
}

export function formatearPeriodoMes(mesStr?: string): string {
  if (!mesStr || !/^\d{4}-\d{2}$/.test(mesStr)) return 'Sin registrar';
  const [yStr, mStr] = mesStr.split('-');
  const idx = Number(mStr) - 1;
  const nombre = NOMBRES_MESES_ES[idx] || mStr;
  return `${nombre} ${yStr}`;
}

export function calcularMesAnterior(mesStr: string): string {
  if (!/^\d{4}-\d{2}$/.test(mesStr)) return mesStr;
  const [yNum, mNum] = mesStr.split('-').map(Number);
  if (mNum <= 1) {
    return `${yNum - 1}-12`;
  }
  return `${yNum}-${String(mNum - 1).padStart(2, '0')}`;
}

export function resolverUltimoMesAlMarcarNoPago(
  ultimoMesPagoActual: string | undefined,
  mesActual: string
): string | undefined {
  if (!ultimoMesPagoActual || ultimoMesPagoActual < mesActual) {
    return ultimoMesPagoActual;
  }
  return calcularMesAnterior(mesActual);
}

/**
 * Evalúa la situación mensual (vencimiento día 10, preaviso 3 días antes),
 * la deuda de cantina y el bloqueo manual de la Comisión Directiva para un jugador.
 */
export function evaluarEstadoFinancieroJugador(
  jugador: Jugador,
  options?: {
    fechaReferenciaIso?: string;
    clubConfig?: Partial<ClubConfig>;
    diasPreaviso?: number;
  }
): EstadoFinancieroJugador {
  const { mesActual, nombreMes, diaDelMes } = obtenerMesAnioDesdeFecha(
    options?.fechaReferenciaIso
  );
  const diaVencimiento =
    options?.clubConfig?.diaVencimientoMensualidad && options.clubConfig.diaVencimientoMensualidad > 0
      ? options.clubConfig.diaVencimientoMensualidad
      : DIA_VENCIMIENTO_DEFAULT;
  const diasPreaviso = options?.diasPreaviso ?? DIAS_PREAVISO_DEFAULT;

  const saldo = Number(jugador.saldoCuentaCorriente ?? 0);
  const deudaCantina = saldo < 0 ? Math.abs(saldo) : 0;
  const saldoAFavorCantina = saldo > 0 ? saldo : 0;
  const bloqueadoTurnos = Boolean(jugador.bloqueadoTurnos);

  // Si está marcado explícitamente como invitado (esSocioClub === false), no exige mensualidad de socio,
  // aunque igual informamos su deuda de cantina o bloqueo si la Comisión lo aplicó.
  const pagaMensualidad = jugador.esSocioClub !== false;
  const ultimoMesPago = jugador.ultimoMesPago;
  const mensualidadPaga = !pagaMensualidad
    ? true
    : Boolean(ultimoMesPago && ultimoMesPago >= mesActual);

  const diasParaVencimiento = diaVencimiento - diaDelMes;

  let estadoMensualidad: EstadoMensualidad = 'al_dia';
  let mostrarAvisoPorVencer = false;
  let mensualidadVencida = false;
  let mensajeMensualidad: string | null = null;

  if (!pagaMensualidad) {
    estadoMensualidad = 'no_aplica';
  } else if (mensualidadPaga) {
    estadoMensualidad = 'al_dia';
  } else if (diasParaVencimiento < 0) {
    estadoMensualidad = 'vencida';
    mensualidadVencida = true;
    mensajeMensualidad = `Tu mensualidad de ${nombreMes} venció el día ${diaVencimiento}. Regularizá tu pago en administración.`;
  } else if (diasParaVencimiento <= diasPreaviso) {
    estadoMensualidad = 'por_vencer';
    mostrarAvisoPorVencer = true;
    if (diasParaVencimiento === 0) {
      mensajeMensualidad = `Tu mensualidad de ${nombreMes} vence hoy (día ${diaVencimiento}).`;
    } else if (diasParaVencimiento === 1) {
      mensajeMensualidad = `Tu mensualidad de ${nombreMes} está por vencer: falta 1 día (vence el ${diaVencimiento}).`;
    } else {
      mensajeMensualidad = `Tu mensualidad de ${nombreMes} está por vencer: faltan ${diasParaVencimiento} días (vence el ${diaVencimiento}).`;
    }
  } else {
    // Días 1 al 6 cuando el mes actual aún no se abonó: dentro del período mensual (no urgente aún)
    estadoMensualidad = 'por_vencer';
    mostrarAvisoPorVencer = false;
    mensajeMensualidad = `Mensualidad de ${nombreMes} pendiente de pago (tenés tiempo hasta el día ${diaVencimiento}).`;
  }

  const requiereAtencion =
    bloqueadoTurnos ||
    deudaCantina > 0 ||
    mensualidadVencida ||
    mostrarAvisoPorVencer;

  return {
    mesActual,
    nombreMesActual: nombreMes,
    diaDelMes,
    diaVencimiento,
    mensualidadPaga,
    ultimoMesPago,
    estadoMensualidad,
    diasParaVencimiento,
    mostrarAvisoPorVencer,
    mensualidadVencida,
    mensajeMensualidad,
    deudaCantina,
    saldoAFavorCantina,
    bloqueadoTurnos,
    motivoBloqueo: jugador.motivoBloqueo,
    requiereAtencion,
  };
}

export interface EvaluacionParticipanteReserva {
  jugador: Jugador;
  estado: EstadoFinancieroJugador;
  tieneAvisoMensualidad: boolean;
  tieneDeudaCantina: boolean;
}

export interface EvaluacionReservaResult {
  bloqueados: Jugador[];
  advertencias: EvaluacionParticipanteReserva[];
  puedeReservar: boolean;
}

/**
 * Evalúa a todos los jugadores que participan de una nueva reserva (más el jugador logueado si existe)
 * para:
 * 1) Impedir la reserva si algún participante fue bloqueado manualmente por la Comisión Directiva.
 * 2) Mostrar un mensaje informativo si alguien debe cantina, tiene la mensualidad vencida o por vencer.
 */
export function evaluarJugadoresParaReserva(
  jugadoresParticipantesNombres: string[],
  todosLosJugadores: Jugador[],
  options?: {
    jugadorLogueado?: Jugador | null;
    fechaReferenciaIso?: string;
    clubConfig?: Partial<ClubConfig>;
  }
): EvaluacionReservaResult {
  const evaluadosPorId = new Map<number, Jugador>();

  if (options?.jugadorLogueado) {
    evaluadosPorId.set(options.jugadorLogueado.id, options.jugadorLogueado);
  }

  for (const nombreRaw of jugadoresParticipantesNombres) {
    const nombreNorm = nombreRaw.trim().toLowerCase();
    if (!nombreNorm) continue;
    const match = todosLosJugadores.find(
      (j) => j.nombre.trim().toLowerCase() === nombreNorm
    );
    if (match) {
      evaluadosPorId.set(match.id, match);
    }
  }

  const bloqueados: Jugador[] = [];
  const advertencias: EvaluacionParticipanteReserva[] = [];

  for (const jugador of evaluadosPorId.values()) {
    const estado = evaluarEstadoFinancieroJugador(jugador, {
      fechaReferenciaIso: options?.fechaReferenciaIso,
      clubConfig: options?.clubConfig,
    });

    if (estado.bloqueadoTurnos) {
      bloqueados.push(jugador);
    }

    const tieneAvisoMensualidad =
      !estado.mensualidadPaga &&
      (estado.mensualidadVencida || estado.mostrarAvisoPorVencer);
    const tieneDeudaCantina = estado.deudaCantina > 0;

    if (tieneAvisoMensualidad || tieneDeudaCantina) {
      advertencias.push({
        jugador,
        estado,
        tieneAvisoMensualidad,
        tieneDeudaCantina,
      });
    }
  }

  return {
    bloqueados,
    advertencias,
    puedeReservar: bloqueados.length === 0,
  };
}
