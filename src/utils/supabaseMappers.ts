import {
  ClubConfig,
  ConsumoIndividual,
  DiaBloqueado,
  HorarioConfig,
  Jugador,
  MovimientoCaja,
  ProductoCantina,
  PromoCantina,
  PublicacionClub,
  TorneoData,
  Turno,
} from '../types';
import { DEFAULT_CLUB_CONFIG } from '../services/storageService';
import { generarClaveTurno } from './turnosLogic';

export function mapClubConfigFromDb(row: any): ClubConfig {
  if (!row) return { ...DEFAULT_CLUB_CONFIG };
  return {
    nombreClub: row.nombre_club || DEFAULT_CLUB_CONFIG.nombreClub,
    aliasTransferencia: row.alias_transferencia ?? DEFAULT_CLUB_CONFIG.aliasTransferencia,
    titularCuenta: row.titular_cuenta ?? DEFAULT_CLUB_CONFIG.titularCuenta,
    telefonoContacto: row.telefono_contacto ?? DEFAULT_CLUB_CONFIG.telefonoContacto,
    diasAnticipacionReserva: Number(row.dias_anticipacion_reserva ?? DEFAULT_CLUB_CONFIG.diasAnticipacionReserva),
    modoMesasActivo: Boolean(row.modo_mesas_activo),
    montoMensualidad:
      row.monto_mensualidad !== undefined && row.monto_mensualidad !== null
        ? Number(row.monto_mensualidad)
        : DEFAULT_CLUB_CONFIG.montoMensualidad,
    diaVencimientoMensualidad:
      row.dia_vencimiento_mensualidad !== undefined && row.dia_vencimiento_mensualidad !== null
        ? Number(row.dia_vencimiento_mensualidad)
        : DEFAULT_CLUB_CONFIG.diaVencimientoMensualidad,
    soloTurnosEnElDia:
      row.solo_turnos_en_el_dia !== undefined && row.solo_turnos_en_el_dia !== null
        ? Boolean(row.solo_turnos_en_el_dia)
        : DEFAULT_CLUB_CONFIG.soloTurnosEnElDia,
    horaAperturaTurnos:
      row.hora_apertura_turnos !== undefined && row.hora_apertura_turnos !== null
        ? Number(row.hora_apertura_turnos)
        : DEFAULT_CLUB_CONFIG.horaAperturaTurnos,
    heroBadge: row.hero_badge ?? DEFAULT_CLUB_CONFIG.heroBadge,
    heroTitulo: row.hero_titulo ?? DEFAULT_CLUB_CONFIG.heroTitulo,
    heroSubtitulo: row.hero_subtitulo ?? DEFAULT_CLUB_CONFIG.heroSubtitulo,
    heroImagenUrl: row.hero_imagen_url ?? DEFAULT_CLUB_CONFIG.heroImagenUrl,
    promosCantina: Array.isArray(row.promos_cantina)
      ? (row.promos_cantina as PromoCantina[])
      : DEFAULT_CLUB_CONFIG.promosCantina,
  };
}

export function mapClubConfigToDb(config: ClubConfig) {
  return {
    id: 1,
    nombre_club: config.nombreClub,
    alias_transferencia: config.aliasTransferencia,
    titular_cuenta: config.titularCuenta,
    telefono_contacto: config.telefonoContacto,
    dias_anticipacion_reserva: config.diasAnticipacionReserva,
    modo_mesas_activo: config.modoMesasActivo,
    monto_mensualidad: Number(config.montoMensualidad ?? DEFAULT_CLUB_CONFIG.montoMensualidad ?? 0),
    dia_vencimiento_mensualidad: Number(
      config.diaVencimientoMensualidad ?? DEFAULT_CLUB_CONFIG.diaVencimientoMensualidad ?? 10
    ),
    solo_turnos_en_el_dia: config.soloTurnosEnElDia !== false,
    hora_apertura_turnos: Number(config.horaAperturaTurnos ?? 8),
    hero_badge: config.heroBadge?.trim() || null,
    hero_titulo: config.heroTitulo?.trim() || null,
    hero_subtitulo: config.heroSubtitulo?.trim() || null,
    hero_imagen_url: config.heroImagenUrl?.trim() || null,
    promos_cantina: Array.isArray(config.promosCantina) ? config.promosCantina : [],
  };
}

export function mapDiaBloqueadoFromDb(row: any): DiaBloqueado {
  return {
    fecha: String(row.fecha).split('T')[0],
    bloqueado: Boolean(row.bloqueado),
    motivo: row.motivo || 'Jornada cerrada por evento especial',
    actualizadoPor: row.actualizado_por ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

export function mapDiaBloqueadoToDb(d: DiaBloqueado) {
  return {
    fecha: d.fecha,
    bloqueado: Boolean(d.bloqueado),
    motivo: d.motivo.trim() || 'Jornada cerrada por evento especial',
    actualizado_por: d.actualizadoPor ?? null,
  };
}

export function mapHorarioFromDb(row: any): HorarioConfig {
  return {
    id: String(row.id),
    inicio: row.inicio || '',
    fin: row.fin || '',
    etiqueta: row.etiqueta || '',
    precioCancha: Number(row.precio_cancha ?? 0),
    precioLuz: Number(row.precio_luz ?? 0),
    activo: row.activo !== false,
  };
}

export function mapHorarioToDb(h: HorarioConfig, orden?: number) {
  return {
    id: h.id,
    inicio: h.inicio,
    fin: h.fin,
    etiqueta: h.etiqueta,
    precio_cancha: h.precioCancha,
    precio_luz: h.precioLuz,
    activo: h.activo !== false,
    ...(orden !== undefined ? { orden } : {}),
  };
}

export function mapJugadorFromDb(row: any): Jugador {
  return {
    id: Number(row.id),
    nombre: row.nombre || [row.nombre_pila, row.apellido].filter(Boolean).join(' ').trim(),
    nombrePila: row.nombre_pila ?? undefined,
    apellido: row.apellido ?? undefined,
    dni: row.dni ?? undefined,
    fechaNacimiento: row.fecha_nacimiento ? String(row.fecha_nacimiento).split('T')[0] : undefined,
    email: row.email ?? undefined,
    rol: row.rol,
    categoria: row.categoria,
    manoHabil: row.mano_habil ?? 'Derecha',
    telefono: row.telefono || '',
    localidad: row.localidad ?? undefined,
    esSocioClub: row.es_socio_club !== undefined && row.es_socio_club !== null ? Boolean(row.es_socio_club) : true,
    numeroSocio: row.numero_socio ?? undefined,
    contactoEmergencia: row.contacto_emergencia ?? undefined,
    observaciones: row.observaciones ?? undefined,
    saldoCuentaCorriente: Number(row.saldo_cuenta_corriente ?? 0),
    ultimoMesPago: row.ultimo_mes_pago ?? undefined,
    bloqueadoTurnos: Boolean(row.bloqueado_turnos),
    motivoBloqueo: row.motivo_bloqueo ?? undefined,
    activo: row.activo !== false,
    partidosJugados: Number(row.partidos_jugados ?? 0),
  };
}

export function mapJugadorToDb(j: Omit<Jugador, 'id'> & { id?: number }) {
  const nombreCompleto = (
    j.nombre ||
    [j.nombrePila, j.apellido].filter(Boolean).join(' ')
  ).trim();

  return {
    ...(j.id !== undefined ? { id: j.id } : {}),
    nombre: nombreCompleto,
    nombre_pila: j.nombrePila?.trim() || null,
    apellido: j.apellido?.trim() || null,
    dni: j.dni?.trim() || null,
    fecha_nacimiento: j.fechaNacimiento?.trim() || null,
    email: j.email?.trim() || null,
    rol: j.rol,
    categoria: j.categoria,
    mano_habil: j.manoHabil || 'Derecha',
    telefono: j.telefono || '',
    localidad: j.localidad?.trim() || 'Río Colorado',
    es_socio_club: j.esSocioClub !== false,
    numero_socio: j.numeroSocio?.trim() || null,
    contacto_emergencia: j.contactoEmergencia?.trim() || null,
    observaciones: j.observaciones?.trim() || null,
    saldo_cuenta_corriente: Number(j.saldoCuentaCorriente ?? 0),
    ultimo_mes_pago: j.ultimoMesPago?.trim() || null,
    bloqueado_turnos: Boolean(j.bloqueadoTurnos),
    motivo_bloqueo: j.motivoBloqueo?.trim() || null,
    activo: j.activo !== false,
    partidos_jugados: Number(j.partidosJugados ?? 0),
  };
}

export function mapTurnoFromDb(row: any): Turno {
  const fecha = String(row.fecha).split('T')[0];
  const horarioId = String(row.horario_id);
  const id = row.id ? String(row.id) : generarClaveTurno(fecha, horarioId);

  return {
    id,
    horarioId,
    fecha,
    estado: row.estado || 'libre',
    p1: row.p1 ?? null,
    p2: row.p2 ?? null,
    organizadorNombre: row.organizador_nombre ?? undefined,
    organizadorRol: row.organizador_rol ?? undefined,
    notas: row.notas ?? undefined,
    costoTotal: row.costo_total !== null && row.costo_total !== undefined ? Number(row.costo_total) : undefined,
    pagado: Boolean(row.pagado),
    metodoPago: row.metodo_pago ?? undefined,
    fechaReserva: row.fecha_reserva ?? undefined,
    resultado: row.resultado ?? undefined,
    comandaCantinaId: row.comanda_cantina_id ?? undefined,
    registradoPor: row.registrado_por ?? undefined,
  };
}

export function mapTurnoToDb(t: Turno) {
  const id = t.id || generarClaveTurno(t.fecha, t.horarioId);
  return {
    id,
    horario_id: t.horarioId,
    fecha: t.fecha,
    estado: t.estado,
    p1: t.p1 ?? null,
    p2: t.p2 ?? null,
    organizador_nombre: t.organizadorNombre ?? null,
    organizador_rol: t.organizadorRol ?? null,
    notas: t.notas ?? null,
    costo_total: Number(t.costoTotal ?? 0),
    pagado: Boolean(t.pagado),
    metodo_pago: t.metodoPago ?? null,
    fecha_reserva: t.fechaReserva ?? new Date().toISOString(),
    resultado: t.resultado ?? null,
    comanda_cantina_id: t.comandaCantinaId ?? null,
    ...(t.registradoPor ? { registrado_por: t.registradoPor } : {}),
  };
}

export function mapProductoFromDb(row: any): ProductoCantina {
  return {
    id: String(row.id),
    nombre: row.nombre || '',
    categoria: row.categoria,
    precio: Number(row.precio ?? 0),
    costo: Number(row.costo ?? 0),
    stock: Number(row.stock ?? 0),
    stockMinimo: Number(row.stock_minimo ?? 0),
    unidad: row.unidad || 'Unidad',
    descripcion: row.descripcion ?? undefined,
  };
}

export function mapProductoToDb(p: ProductoCantina) {
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    precio: Number(p.precio ?? 0),
    costo: Number(p.costo ?? 0),
    stock: Number(p.stock ?? 0),
    stock_minimo: Number(p.stockMinimo ?? 0),
    unidad: p.unidad || 'Unidad',
    descripcion: p.descripcion ?? null,
  };
}

export function mapConsumoFromDb(row: any): ConsumoIndividual {
  return {
    id: String(row.id),
    fecha: String(row.fecha).split('T')[0],
    hora: row.hora || '',
    socioNombre: row.socio_nombre || '',
    socioId: row.socio_id !== null && row.socio_id !== undefined ? Number(row.socio_id) : undefined,
    detalle: row.detalle || '',
    monto: Number(row.monto ?? 0),
    pagado: Boolean(row.pagado),
    metodoPago: row.metodo_pago ?? undefined,
    fechaCobro: row.fecha_cobro ?? undefined,
    mesa: row.mesa ?? undefined,
    productosUsados: Array.isArray(row.productos_usados) ? row.productos_usados : undefined,
    esInvitado: Boolean(row.es_invitado),
    observacionInvitado: row.observacion_invitado ?? undefined,
    registradoPor: row.registrado_por ?? undefined,
  };
}

export function mapMovimientoFromDb(row: any): MovimientoCaja {
  return {
    id: String(row.id),
    fecha: String(row.fecha).split('T')[0],
    hora: row.hora || '',
    tipo: row.tipo,
    categoria: row.categoria,
    descripcion: row.descripcion || '',
    monto: Number(row.monto ?? 0),
    metodoPago: row.metodo_pago,
    comandaId: row.consumo_id ?? row.comanda_id ?? undefined,
    turnoId: row.turno_id ?? undefined,
    registradoPor: row.registrado_por ?? undefined,
  };
}

export function mapMovimientoToDb(m: MovimientoCaja) {
  return {
    id: m.id,
    fecha: m.fecha,
    hora: m.hora,
    tipo: m.tipo,
    categoria: m.categoria,
    descripcion: m.descripcion,
    monto: Number(m.monto ?? 0),
    metodo_pago: m.metodoPago,
    consumo_id: m.comandaId ?? null,
    turno_id: m.turnoId ?? null,
    ...(m.registradoPor ? { registrado_por: m.registradoPor } : {}),
  };
}

export function mapPublicacionFromDb(row: any): PublicacionClub {
  return {
    id: String(row.id),
    titulo: row.titulo || '',
    contenido: row.contenido || '',
    categoria: row.categoria,
    fecha: String(row.fecha).split('T')[0],
    activo: Boolean(row.activo),
    destacado: Boolean(row.destacado),
    etiquetaBadge: row.etiqueta_badge ?? undefined,
  };
}

export function mapPublicacionToDb(p: PublicacionClub) {
  return {
    id: p.id,
    titulo: p.titulo,
    contenido: p.contenido,
    categoria: p.categoria,
    fecha: p.fecha,
    activo: Boolean(p.activo),
    destacado: Boolean(p.destacado),
    etiqueta_badge: p.etiquetaBadge ?? null,
  };
}

export function mapTorneoFromDb(row: any): TorneoData | null {
  if (!row || !row.data) return null;
  return row.data as TorneoData;
}
