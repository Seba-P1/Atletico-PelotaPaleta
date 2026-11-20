import {
  ConsumoIndividual,
  HorarioConfig,
  MovimientoCaja,
  Turno,
} from '../types';

export interface DesgloseMetodoPago {
  efectivo: number;
  transferencia: number;
  pendienteOCtaCte: number;
  total: number;
}

export interface FilaActividadTurno {
  turnoId: string;
  fecha: string;
  horaEtiqueta: string;
  horaInicio: string;
  jugadores: string[];
  organizador: string;
  costoTotal: number;
  pagado: boolean;
  metodoPago?: string;
  registradoPor: string;
  notas?: string;
}

export interface FilaActividadCantina {
  id: string;
  fecha: string;
  hora: string;
  personaNombre: string;
  esInvitado: boolean;
  observacionInvitado?: string;
  detalle: string;
  monto: number;
  pagado: boolean;
  metodoPago?: string;
  registradoPor: string;
}

export interface MetricasDiariasResumen {
  fecha: string;
  ingresosTotales: number;
  egresosTotales: number;
  balanceNeto: number;
  porMetodo: {
    efectivo: number;
    transferencia: number;
    cuentaCorrientePendiente: number;
  };
  cantina: DesgloseMetodoPago & { cantidad: number; invitadosCantidad: number };
  turnos: DesgloseMetodoPago & { cantidadOcupados: number; cantidadPagados: number };
  mensualidades: { efectivo: number; transferencia: number; total: number; cantidad: number };
  otrosIngresos: number;
  detalleTurnosDia: FilaActividadTurno[];
  detalleCantinaDia: FilaActividadCantina[];
  movimientosDia: MovimientoCaja[];
  resumenPorOperador: Array<{
    operador: string;
    accionesTurnos: number;
    accionesCantina: number;
    totalGestionado: number;
  }>;
}

export function extraerJugadoresTurno(t: Turno): string[] {
  const lista: string[] = [];
  if (t.p1?.delantero) lista.push(t.p1.delantero.trim());
  if (t.p1?.zaguero) lista.push(t.p1.zaguero.trim());
  if (t.p2?.delantero) lista.push(t.p2.delantero.trim());
  if (t.p2?.zaguero) lista.push(t.p2.zaguero.trim());
  return lista.filter(Boolean);
}

export function calcularMetricasDiarias(params: {
  fecha: string;
  turnos: Record<string, Turno>;
  consumos: ConsumoIndividual[];
  movimientosCaja: MovimientoCaja[];
  horarios: HorarioConfig[];
}): MetricasDiariasResumen {
  const { fecha, turnos, consumos, movimientosCaja, horarios } = params;
  const horariosMap = new Map(horarios.map((h) => [h.id, h]));

  const movimientosDia = movimientosCaja.filter((m) => m.fecha === fecha);

  let egresosTotales = 0;
  let efectivoIngresosCaja = 0;
  let transferenciaIngresosCaja = 0;
  let mensualidadEfectivo = 0;
  let mensualidadTransferencia = 0;
  let mensualidadCantidad = 0;
  let otrosIngresos = 0;
  let otrosEfectivo = 0;
  let otrosTransferencia = 0;
  let otrosSinMetodoCaja = 0;

  const operadoresMap = new Map<
    string,
    { accionesTurnos: number; accionesCantina: number; totalGestionado: number }
  >();

  const registrarOperador = (
    nombreRaw: string | undefined,
    tipo: 'turno' | 'cantina' | 'otro',
    monto: number
  ) => {
    const operador = (nombreRaw || '').trim() || 'Sistema / Sin identificar';
    const curr = operadoresMap.get(operador) || {
      accionesTurnos: 0,
      accionesCantina: 0,
      totalGestionado: 0,
    };
    if (tipo === 'turno') curr.accionesTurnos += 1;
    if (tipo === 'cantina') curr.accionesCantina += 1;
    curr.totalGestionado += monto;
    operadoresMap.set(operador, curr);
  };

  movimientosDia.forEach((m) => {
    if (m.tipo === 'egreso') {
      egresosTotales += Number(m.monto || 0);
      return;
    }

    const monto = Number(m.monto || 0);
    if (m.metodoPago === 'efectivo') efectivoIngresosCaja += monto;
    else if (m.metodoPago === 'transferencia') transferenciaIngresosCaja += monto;

    if (m.categoria === 'cuota_socio') {
      mensualidadCantidad += 1;
      if (m.metodoPago === 'transferencia') mensualidadTransferencia += monto;
      else mensualidadEfectivo += monto;
      registrarOperador(m.registradoPor, 'otro', monto);
    } else if (m.categoria !== 'cancha' && m.categoria !== 'cantina') {
      otrosIngresos += monto;
      if (m.metodoPago === 'efectivo') otrosEfectivo += monto;
      else if (m.metodoPago === 'transferencia') otrosTransferencia += monto;
      else otrosSinMetodoCaja += monto;
      registrarOperador(m.registradoPor, 'otro', monto);
    }
  });

  // Turnos del día
  const turnosDiaLista = Object.values(turnos)
    .filter((t) => t.fecha === fecha && t.estado === 'ocupado')
    .sort((a, b) => {
      const ha = horariosMap.get(a.horarioId)?.inicio || a.horarioId;
      const hb = horariosMap.get(b.horarioId)?.inicio || b.horarioId;
      return ha.localeCompare(hb);
    });

  let turnosEfectivo = 0;
  let turnosTransferencia = 0;
  let turnosPendiente = 0;
  let turnosPagados = 0;

  const detalleTurnosDia: FilaActividadTurno[] = turnosDiaLista.map((t) => {
    const hor = horariosMap.get(t.horarioId);
    const costo = Number(t.costoTotal || (hor ? hor.precioCancha + hor.precioLuz : 0));
    if (t.pagado) {
      turnosPagados += 1;
      if (t.metodoPago === 'transferencia') turnosTransferencia += costo;
      else turnosEfectivo += costo;
    } else {
      turnosPendiente += costo;
    }

    registrarOperador(t.registradoPor || t.organizadorNombre, 'turno', t.pagado ? costo : 0);

    return {
      turnoId: t.id,
      fecha: t.fecha,
      horaEtiqueta: hor?.etiqueta || t.horarioId,
      horaInicio: hor?.inicio || t.horarioId,
      jugadores: extraerJugadoresTurno(t),
      organizador: t.organizadorNombre || 'Sin organizador',
      costoTotal: costo,
      pagado: Boolean(t.pagado),
      metodoPago: t.metodoPago,
      registradoPor: t.registradoPor || t.organizadorNombre || 'Autogestión / Jugador',
      notas: t.notas,
    };
  });

  // Consumos Cantina del día (filtrando los registrados hoy o cobrados hoy)
  const consumosDia = consumos
    .filter((c) => c.fecha === fecha || (c.fechaCobro && c.fechaCobro.startsWith(fecha)))
    .sort((a, b) => (b.hora || '').localeCompare(a.hora || ''));

  let cantinaEfectivo = 0;
  let cantinaTransferencia = 0;
  let cantinaPendiente = 0;
  let invitadosCantidad = 0;

  const detalleCantinaDia: FilaActividadCantina[] = consumosDia.map((c) => {
    const monto = Number(c.monto || 0);
    if (c.esInvitado) invitadosCantidad += 1;

    if (c.pagado) {
      if (c.metodoPago === 'transferencia') cantinaTransferencia += monto;
      else cantinaEfectivo += monto;
    } else {
      cantinaPendiente += monto;
    }

    registrarOperador(c.registradoPor, 'cantina', c.pagado ? monto : 0);

    return {
      id: c.id,
      fecha: c.fecha,
      hora: c.hora,
      personaNombre: c.socioNombre,
      esInvitado: Boolean(c.esInvitado),
      observacionInvitado: c.observacionInvitado,
      detalle: c.detalle,
      monto,
      pagado: Boolean(c.pagado),
      metodoPago: c.metodoPago,
      registradoPor: c.registradoPor || 'Encargado / Cantina',
    };
  });

  // Sumar solo ventas rápidas de cantina en movimientosCaja que NO correspondan a un consumo ya contado
  const idsConsumoEnMov = new Set(consumosDia.map((c) => c.id));
  const consumosPagadosSinMatch = consumosDia.filter((c) => c.pagado);
  const consumosYaEmparejados = new Set<string>();

  // Primero marcar los consumos que ya coinciden exactamente por comandaId
  movimientosDia.forEach((m) => {
    if (m.tipo === 'ingreso' && m.categoria === 'cantina' && m.comandaId && idsConsumoEnMov.has(m.comandaId)) {
      consumosYaEmparejados.add(m.comandaId);
    }
  });

  const ventasDirectasCantina = movimientosDia.filter((m) => {
    if (m.tipo !== 'ingreso' || m.categoria !== 'cantina') return false;
    if (m.comandaId && idsConsumoEnMov.has(m.comandaId)) return false;

    // Respaldo para movimientos legacy o sin consumo_id cuyo monto, método y socio/detalle ya están en consumosDia
    const descLower = (m.descripcion || '').toLowerCase();
    const montoMov = Number(m.monto || 0);
    const matchConsumo = consumosPagadosSinMatch.find((c) => {
      if (consumosYaEmparejados.has(c.id)) return false;
      const metodoConsumo = c.metodoPago || 'efectivo';
      if (Number(c.monto || 0) !== montoMov || metodoConsumo !== m.metodoPago) return false;
      const nombreLower = (c.socioNombre || '').trim().toLowerCase();
      const detalleLower = (c.detalle || '').trim().toLowerCase();
      return (
        (nombreLower.length > 0 && descLower.includes(nombreLower)) ||
        (detalleLower.length > 0 && descLower.includes(detalleLower))
      );
    });

    if (matchConsumo) {
      consumosYaEmparejados.add(matchConsumo.id);
      return false;
    }
    return true;
  });

  ventasDirectasCantina.forEach((m) => {
    const monto = Number(m.monto || 0);
    if (m.metodoPago === 'transferencia') cantinaTransferencia += monto;
    else cantinaEfectivo += monto;
    registrarOperador(m.registradoPor, 'cantina', monto);
  });

  const efectivoTotal = Math.max(
    efectivoIngresosCaja,
    turnosEfectivo + cantinaEfectivo + mensualidadEfectivo + otrosEfectivo
  );
  const transferenciaTotal = Math.max(
    transferenciaIngresosCaja,
    turnosTransferencia + cantinaTransferencia + mensualidadTransferencia + otrosTransferencia
  );
  const ingresosTotales = efectivoTotal + transferenciaTotal + otrosSinMetodoCaja;
  const balanceNeto = ingresosTotales - egresosTotales;

  const resumenPorOperador = Array.from(operadoresMap.entries())
    .map(([operador, stats]) => ({
      operador,
      ...stats,
    }))
    .sort((a, b) => b.totalGestionado - a.totalGestionado || b.accionesCantina + b.accionesTurnos - (a.accionesCantina + a.accionesTurnos));

  return {
    fecha,
    ingresosTotales,
    egresosTotales,
    balanceNeto,
    porMetodo: {
      efectivo: efectivoTotal,
      transferencia: transferenciaTotal,
      cuentaCorrientePendiente: turnosPendiente + cantinaPendiente,
    },
    cantina: {
      efectivo: cantinaEfectivo,
      transferencia: cantinaTransferencia,
      pendienteOCtaCte: cantinaPendiente,
      total: cantinaEfectivo + cantinaTransferencia,
      cantidad: detalleCantinaDia.length,
      invitadosCantidad,
    },
    turnos: {
      efectivo: turnosEfectivo,
      transferencia: turnosTransferencia,
      pendienteOCtaCte: turnosPendiente,
      total: turnosEfectivo + turnosTransferencia,
      cantidadOcupados: detalleTurnosDia.length,
      cantidadPagados: turnosPagados,
    },
    mensualidades: {
      efectivo: mensualidadEfectivo,
      transferencia: mensualidadTransferencia,
      total: mensualidadEfectivo + mensualidadTransferencia,
      cantidad: mensualidadCantidad,
    },
    otrosIngresos,
    detalleTurnosDia,
    detalleCantinaDia,
    movimientosDia,
    resumenPorOperador,
  };
}

export function filtrarHistorialTurnos(
  turnos: Record<string, Turno>,
  horarios: HorarioConfig[],
  filtros: {
    fechaDesde?: string;
    fechaHasta?: string;
    busqueda?: string;
    soloPagos?: 'todos' | 'pagados' | 'pendientes';
  }
): FilaActividadTurno[] {
  const horariosMap = new Map(horarios.map((h) => [h.id, h]));
  const q = (filtros.busqueda || '').trim().toLowerCase();

  return Object.values(turnos)
    .filter((t) => t.estado === 'ocupado')
    .filter((t) => {
      if (filtros.fechaDesde && t.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && t.fecha > filtros.fechaHasta) return false;
      if (filtros.soloPagos === 'pagados' && !t.pagado) return false;
      if (filtros.soloPagos === 'pendientes' && t.pagado) return false;
      if (q) {
        const texto = [
          t.fecha,
          t.organizadorNombre || '',
          t.registradoPor || '',
          t.notas || '',
          ...extraerJugadoresTurno(t),
        ]
          .join(' ')
          .toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      const ha = horariosMap.get(a.horarioId)?.inicio || a.horarioId;
      const hb = horariosMap.get(b.horarioId)?.inicio || b.horarioId;
      return hb.localeCompare(ha);
    })
    .map((t) => {
      const hor = horariosMap.get(t.horarioId);
      const costo = Number(t.costoTotal || (hor ? hor.precioCancha + hor.precioLuz : 0));
      return {
        turnoId: t.id,
        fecha: t.fecha,
        horaEtiqueta: hor?.etiqueta || t.horarioId,
        horaInicio: hor?.inicio || t.horarioId,
        jugadores: extraerJugadoresTurno(t),
        organizador: t.organizadorNombre || 'Sin organizador',
        costoTotal: costo,
        pagado: Boolean(t.pagado),
        metodoPago: t.metodoPago,
        registradoPor: t.registradoPor || t.organizadorNombre || 'Jugador',
        notas: t.notas,
      };
    });
}
