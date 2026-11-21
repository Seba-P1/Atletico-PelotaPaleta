import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularJugadoresOcupados,
  validarReserva,
  calcularEstadisticasOcupacion,
  filtrarHorariosVisibles,
  generarClaveTurno,
  normalizarTurnosLegacy,
  obtenerTurnosDeFecha,
  calcularOcupacionFecha,
  generarProximosDias
} from './turnosLogic';
import {
  calcularTotalComanda,
  actualizarStockPorVenta,
  calcularBalanceCaja,
  calcularResumenConsumos,
  descontarStockConsumoIndividual,
  aplicarDeltaCuentaCorriente,
  filtrarMovimientosPorFecha
} from './cantinaLogic';
import { construirZonasYPartidos, registrarResultadoPartido } from './torneoLogic';
import {
  construirEmailRedirectUrl,
  parsearRetornoConfirmacionEmail,
  validarReclamoFichaPadron,
} from './authLogic';
import { Turno, ProductoCantina, ItemPedido, MovimientoCaja, ParejaTorneo, TorneoData, Jugador } from '../types';

test('validarReserva rechaza parejas incompletas', () => {
  const p1 = { nombre: 'P1', delantero: 'Facundo Andreasen', zaguero: '' };
  const p2 = { nombre: 'P2', delantero: 'Gabriel Villegas', zaguero: 'Alfredo Villegas' };
  const res = validarReserva(p1, p2, 'Facundo Andreasen');
  assert.equal(res.valido, false);
});

test('validarReserva rechaza jugadores repetidos en el mismo turno', () => {
  const p1 = { nombre: 'P1', delantero: 'Facundo Andreasen', zaguero: 'Santiago Andreasen' };
  const p2 = { nombre: 'P2', delantero: 'Facundo Andreasen', zaguero: 'Alfredo Villegas' };
  const res = validarReserva(p1, p2, 'Facundo Andreasen');
  assert.equal(res.valido, false);
  assert.match(res.error || '', /repetir el mismo jugador/);
});

test('validarReserva aprueba 4 jugadores distintos con organizador participante', () => {
  const p1 = { nombre: 'P1', delantero: 'Facundo Andreasen', zaguero: 'Santiago Andreasen' };
  const p2 = { nombre: 'P2', delantero: 'Gabriel Villegas', zaguero: 'Alfredo Villegas' };
  const res = validarReserva(p1, p2, 'Facundo Andreasen');
  assert.equal(res.valido, true);
});

test('calcularJugadoresOcupados extrae delanteros y zagueros de turnos ocupados', () => {
  const turnos: Record<string, Turno> = {
    '18-19': {
      id: '18-19',
      horarioId: '18-19',
      fecha: '2026-11-06',
      estado: 'ocupado',
      p1: { nombre: 'P1', delantero: 'Carlos Dorato', zaguero: 'Mateo Billorou' },
      p2: { nombre: 'P2', delantero: 'Nicolás Berruezo', zaguero: 'Agustín Ross' }
    },
    '19-20': {
      id: '19-20',
      horarioId: '19-20',
      fecha: '2026-11-06',
      estado: 'libre'
    }
  };

  const ocupados = calcularJugadoresOcupados(turnos);
  assert.equal(ocupados.has('Carlos Dorato'), true);
  assert.equal(ocupados.has('Mateo Billorou'), true);
  assert.equal(ocupados.has('Nicolás Berruezo'), true);
  assert.equal(ocupados.has('Agustín Ross'), true);
  assert.equal(ocupados.has('Facundo Andreasen'), false);
});

test('calcularEstadisticasOcupacion calcula porcentajes correctamente', () => {
  const turnos: Record<string, Turno> = {
    '1': { id: '1', horarioId: '1', fecha: '2026-11-06', estado: 'ocupado' },
    '2': { id: '2', horarioId: '2', fecha: '2026-11-06', estado: 'libre' },
    '3': { id: '3', horarioId: '3', fecha: '2026-11-06', estado: 'libre' },
    '4': { id: '4', horarioId: '4', fecha: '2026-11-06', estado: 'mantenimiento' }
  };
  const stats = calcularEstadisticasOcupacion(turnos);
  assert.equal(stats.total, 4);
  assert.equal(stats.ocupados, 1);
  assert.equal(stats.libres, 2);
  assert.equal(stats.mantenimiento, 1);
  assert.equal(stats.tasaOcupacion, 25);
});

test('multi-dia: normaliza turnos legacy, filtra por fecha y calcula ocupacion por horarios activos', () => {
  const legacy: Record<string, Turno> = {
    '18-19': { id: '18-19', horarioId: '18-19', fecha: '2026-11-18', estado: 'ocupado' },
    '2026-11-19__19-20': { id: '2026-11-19__19-20', horarioId: '19-20', fecha: '2026-11-19', estado: 'mantenimiento' },
  };

  const normalizados = normalizarTurnosLegacy(legacy, '2026-11-18');
  assert.ok(normalizados[generarClaveTurno('2026-11-18', '18-19')]);
  assert.ok(normalizados['2026-11-19__19-20']);

  const hoy = obtenerTurnosDeFecha(normalizados, '2026-11-18');
  const manana = obtenerTurnosDeFecha(normalizados, '2026-11-19');

  assert.equal(hoy['18-19']?.estado, 'ocupado');
  assert.equal(hoy['19-20'], undefined);
  assert.equal(manana['19-20']?.estado, 'mantenimiento');

  const occ = calcularOcupacionFecha(hoy, [{ id: '18-19' }, { id: '19-20' }, { id: '20-21' }]);
  assert.equal(occ.ocupados, 1);
  assert.equal(occ.libres, 2);
  assert.equal(occ.tasaOcupacion, 33);

  const dias = generarProximosDias(5, '2026-11-18');
  assert.equal(dias.length, 5);
  assert.equal(dias[0].fecha, '2026-11-18');
  assert.equal(dias[0].diaSemana, 'HOY');
  assert.equal(dias[1].fecha, '2026-11-19');
});

test('calcularTotalComanda suma correctamente precios por cantidades', () => {
  const items: ItemPedido[] = [
    { productoId: '1', nombre: 'Quilmes', precio: 4500, cantidad: 2, subtotal: 9000 },
    { productoId: '2', nombre: 'Empanada', precio: 1800, cantidad: 3, subtotal: 5400 }
  ];
  assert.equal(calcularTotalComanda(items), 14400);
});

test('actualizarStockPorVenta descuenta stock y emite alerta si baja del mínimo', () => {
  const inventario: ProductoCantina[] = [
    { id: 'p1', nombre: 'Pelota Paleta', categoria: 'pelota_paleta', precio: 6000, costo: 4000, stock: 5, stockMinimo: 3, unidad: 'Pelota' }
  ];
  const venta: ItemPedido[] = [
    { productoId: 'p1', nombre: 'Pelota Paleta', precio: 6000, cantidad: 3, subtotal: 18000 }
  ];
  const resultado = actualizarStockPorVenta(inventario, venta);
  assert.equal(resultado.inventarioActualizado[0].stock, 2);
  assert.equal(resultado.alertasStockBajo.length, 1);
});

test('descontarStockConsumoIndividual y aplicarDeltaCuentaCorriente sincronizan stock y saldo', () => {
  const inventario: ProductoCantina[] = [
    { id: 'beb-01', nombre: 'Quilmes 1L', categoria: 'bebidas', precio: 4500, costo: 2800, stock: 10, stockMinimo: 4, unidad: 'Botella' }
  ];
  const resStock = descontarStockConsumoIndividual(inventario, [
    { productoId: 'beb-01', nombre: 'Quilmes 1L', cantidad: 2, precio: 4500 }
  ]);
  assert.equal(resStock.inventarioActualizado[0].stock, 8);

  const jugadores: Jugador[] = [
    { id: 1, nombre: 'Facundo Andreasen', rol: 'Delantero', categoria: '1ra', telefono: '', saldoCuentaCorriente: 0, activo: true }
  ];
  const conDeuda = aplicarDeltaCuentaCorriente(jugadores, 1, 'Facundo Andreasen', -9000);
  assert.equal(conDeuda[0].saldoCuentaCorriente, -9000);
  const saldado = aplicarDeltaCuentaCorriente(conDeuda, 1, 'Facundo Andreasen', 9000);
  assert.equal(saldado[0].saldoCuentaCorriente, 0);
});

test('calcularBalanceCaja segrega ingresos, egresos, efectivo y digital y filtra por fecha', () => {
  const movimientos: MovimientoCaja[] = [
    { id: '1', fecha: '2026-11-06', hora: '10:00', tipo: 'ingreso', categoria: 'cantina', descripcion: 'Venta', monto: 10000, metodoPago: 'efectivo' },
    { id: '2', fecha: '2026-11-06', hora: '11:00', tipo: 'ingreso', categoria: 'cancha', descripcion: 'Turno', monto: 12000, metodoPago: 'transferencia' },
    { id: '3', fecha: '2026-11-07', hora: '12:00', tipo: 'egreso', categoria: 'proveedor', descripcion: 'Hielo', monto: 4000, metodoPago: 'efectivo' }
  ];
  const bal = calcularBalanceCaja(movimientos);
  assert.equal(bal.totalIngresos, 22000);
  assert.equal(bal.totalEgresos, 4000);
  assert.equal(bal.balanceNeto, 18000);
  assert.equal(bal.efectivoCaja, 6000);
  assert.equal(bal.digitalCaja, 12000);

  const soloDia6 = filtrarMovimientosPorFecha(movimientos, '2026-11-06');
  assert.equal(soloDia6.length, 2);
});

test('torneoLogic genera estructura de zonas y registra resultados', () => {
  const parejas: ParejaTorneo[] = [
    { id: 1, nombre: 'P1', delantero: 'D1', zaguero: 'Z1', partidosJugados: 0, partidosGanados: 0, puntos: 0, tantosAFavor: 0, tantosEnContra: 0, difTantos: 0 },
    { id: 2, nombre: 'P2', delantero: 'D2', zaguero: 'Z2', partidosJugados: 0, partidosGanados: 0, puntos: 0, tantosAFavor: 0, tantosEnContra: 0, difTantos: 0 },
    { id: 3, nombre: 'P3', delantero: 'D3', zaguero: 'Z3', partidosJugados: 0, partidosGanados: 0, puntos: 0, tantosAFavor: 0, tantosEnContra: 0, difTantos: 0 },
    { id: 4, nombre: 'P4', delantero: 'D4', zaguero: 'Z4', partidosJugados: 0, partidosGanados: 0, puntos: 0, tantosAFavor: 0, tantosEnContra: 0, difTantos: 0 }
  ];

  const zonas = construirZonasYPartidos(parejas);
  assert.equal(zonas.length, 1);
  assert.equal(zonas[0].partidos.length, 6);

  const torneoInicial: TorneoData = {
    titulo: 'Torneo CARC',
    categoria: '1ra',
    cantidadParejas: 4,
    parejas,
    zonas,
    playoffs: []
  };

  const partidoId = zonas[0].partidos[0].id;
  const actualizado = registrarResultadoPartido(torneoInicial, partidoId, 25, 20);

  const p1Actualizada = actualizado.parejas.find(p => p.id === zonas[0].partidos[0].p1Id);
  const p2Actualizada = actualizado.parejas.find(p => p.id === zonas[0].partidos[0].p2Id);

  assert.equal(p1Actualizada?.puntos, 2);
  assert.equal(p1Actualizada?.difTantos, 5);
  assert.equal(p2Actualizada?.puntos, 1);
  assert.equal(p2Actualizada?.difTantos, -5);
});

test('filtrarHorariosVisibles oculta turnos inactivos a usuarios pero los muestra al admin', () => {
  const horarios = [
    { id: '1', etiqueta: '18:00', activo: true },
    { id: '2', etiqueta: '19:00', activo: false },
    { id: '3', etiqueta: '20:00', activo: true }
  ];
  const paraUsuarios = filtrarHorariosVisibles(horarios, false);
  const paraAdmin = filtrarHorariosVisibles(horarios, true);

  assert.equal(paraUsuarios.length, 2);
  assert.equal(paraAdmin.length, 3);
});

import {
  mapClubConfigFromDb,
  mapClubConfigToDb,
  mapHorarioFromDb,
  mapHorarioToDb,
  mapJugadorFromDb,
  mapJugadorToDb,
  mapTurnoFromDb,
  mapTurnoToDb,
  mapConsumoFromDb,
  mapMovimientoFromDb,
  mapMovimientoToDb
} from './supabaseMappers';

test('calcularResumenConsumos calcula totales pendientes y cobrados por persona', () => {
  const consumos = [
    { id: '1', fecha: '2026-11-10', hora: '19:00', socioNombre: 'Facundo Andreasen', detalle: 'Quilmes', monto: 4500, pagado: false },
    { id: '2', fecha: '2026-11-10', hora: '19:15', socioNombre: 'Santiago Andreasen', detalle: 'Gatorade', monto: 2800, pagado: false },
    { id: '3', fecha: '2026-11-10', hora: '19:30', socioNombre: 'Carlos Dorato', detalle: 'Lomo', monto: 8900, pagado: true }
  ];
  const resumen = calcularResumenConsumos(consumos as any);
  assert.equal(resumen.totalPendiente, 7300);
  assert.equal(resumen.totalCobrado, 8900);
  assert.equal(resumen.cantidadPendientes, 2);
  assert.equal(resumen.cantidadCobrados, 1);
});

test('supabaseMappers convierte snake_case <-> camelCase correctamente', () => {
  const cfgDb = mapClubConfigToDb({
    nombreClub: 'CARC',
    aliasTransferencia: 'CARC.RC',
    titularCuenta: 'Subcomisión',
    telefonoContacto: '2931',
    diasAnticipacionReserva: 10,
    modoMesasActivo: true
  });
  assert.equal(cfgDb.alias_transferencia, 'CARC.RC');
  assert.equal(cfgDb.modo_mesas_activo, true);
  const cfgFront = mapClubConfigFromDb(cfgDb);
  assert.equal(cfgFront.nombreClub, 'CARC');
  assert.equal(cfgFront.diasAnticipacionReserva, 10);

  const horDb = mapHorarioToDb({
    id: '19-20',
    inicio: '19:00',
    fin: '20:00',
    etiqueta: '19:00 a 20:00 hs',
    precioCancha: 10000,
    precioLuz: 2000,
    activo: true
  }, 6);
  assert.equal(horDb.precio_cancha, 10000);
  assert.equal(horDb.orden, 6);
  const horFront = mapHorarioFromDb(horDb);
  assert.equal(horFront.precioLuz, 2000);
  assert.equal(horFront.activo, true);

  const jugDb = mapJugadorToDb({
    nombre: 'Juan Pablo Pérez',
    nombrePila: 'Juan Pablo',
    apellido: 'Pérez',
    dni: '34567890',
    fechaNacimiento: '1990-04-12',
    email: 'juanpablo@carc.com',
    telefono: '2931445566',
    localidad: 'Río Colorado',
    rol: 'Delantero',
    categoria: '1ra',
    manoHabil: 'Zurda',
    esSocioClub: true,
    numeroSocio: '1042',
    contactoEmergencia: 'María Gómez - 2931551122',
    observaciones: 'Disponible desde las 19hs',
    saldoCuentaCorriente: -4500,
    activo: true,
    partidosJugados: 31
  });
  assert.equal(jugDb.nombre_pila, 'Juan Pablo');
  assert.equal(jugDb.dni, '34567890');
  assert.equal(jugDb.fecha_nacimiento, '1990-04-12');
  assert.equal(jugDb.mano_habil, 'Zurda');
  assert.equal(jugDb.es_socio_club, true);
  assert.equal(jugDb.numero_socio, '1042');
  assert.equal(jugDb.contacto_emergencia, 'María Gómez - 2931551122');

  const jugFront = mapJugadorFromDb({
    id: 5,
    ...jugDb
  });
  assert.equal(jugFront.saldoCuentaCorriente, -4500);
  assert.equal(jugFront.partidosJugados, 31);
  assert.equal(jugFront.nombrePila, 'Juan Pablo');
  assert.equal(jugFront.apellido, 'Pérez');
  assert.equal(jugFront.dni, '34567890');
  assert.equal(jugFront.manoHabil, 'Zurda');
  assert.equal(jugFront.esSocioClub, true);
  assert.equal(jugFront.contactoEmergencia, 'María Gómez - 2931551122');

  const turnoDb = mapTurnoToDb({
    id: '2026-11-18__19-20',
    horarioId: '19-20',
    fecha: '2026-11-18',
    estado: 'ocupado',
    organizadorNombre: 'Facundo Andreasen',
    costoTotal: 12000,
    pagado: true,
    metodoPago: 'transferencia'
  });
  assert.equal(turnoDb.horario_id, '19-20');
  assert.equal(turnoDb.costo_total, 12000);
  const turnoFront = mapTurnoFromDb(turnoDb);
  assert.equal(turnoFront.metodoPago, 'transferencia');

  const consFront = mapConsumoFromDb({
    id: 'cons-1',
    fecha: '2026-11-18T00:00:00Z',
    hora: '21:10',
    socio_nombre: 'Carlos Dorato',
    socio_id: 7,
    detalle: 'Quilmes 1L',
    monto: '4500',
    pagado: false
  });
  assert.equal(consFront.fecha, '2026-11-18');
  assert.equal(consFront.monto, 4500);

  const movDb = mapMovimientoToDb({
    id: 'mov-1',
    fecha: '2026-11-18',
    hora: '21:15',
    tipo: 'ingreso',
    categoria: 'cantina',
    descripcion: 'Cobro Cantina',
    monto: 4500,
    metodoPago: 'efectivo',
    comandaId: 'cons-1'
  });
  assert.equal(movDb.consumo_id, 'cons-1');
  const movFront = mapMovimientoFromDb(movDb);
  assert.equal(movFront.comandaId, 'cons-1');
});

import {
  buscarJugadorPorEmail,
  buscarJugadorPorEmailYDni,
  formatearNombreCorto,
  resolverSesionLocal,
} from './authLogic';

test('authLogic: resolverSesionLocal concede admin automáticamente con credenciales admin y niega admin a jugadores', () => {
  const jugadores: Jugador[] = [
    {
      id: 10,
      nombre: 'Juan Pérez',
      email: 'juan@carc.com',
      dni: '34567890',
      rol: 'Delantero',
      categoria: '2da',
      telefono: '2931445566',
      saldoCuentaCorriente: 0,
      activo: true,
    },
  ];
  const localAccounts = {
    'juan@carc.com': {
      email: 'juan@carc.com',
      password: '1942', // incluso si un jugador usara la misma clave, jamás recibe rol admin
      nombre: 'Juan Pérez',
      jugadorId: 10,
    },
  };

  // Jugador común ingresa con su cuenta -> esAdmin debe ser false
  const resJugador = resolverSesionLocal({
    identificador: 'JUAN@CARC.COM',
    password: '1942',
    adminPin: '1942',
    localAccounts,
    jugadores,
  });
  assert.equal(resJugador.authenticated, true);
  assert.equal(resJugador.esAdmin, false);
  assert.equal(resJugador.nombreMostrado, 'Juan Pérez');
  assert.equal(resJugador.jugadorId, 10);

  // Contraseña incorrecta para jugador -> rechazado
  const resBadPass = resolverSesionLocal({
    identificador: 'juan@carc.com',
    password: 'wrong',
    adminPin: '1942',
    localAccounts,
    jugadores,
  });
  assert.equal(resBadPass.authenticated, false);
  assert.equal(resBadPass.esAdmin, false);

  // Cuenta admin (PIN local) -> concede esAdmin automáticamente
  const resAdmin = resolverSesionLocal({
    identificador: 'admin@carc.com.ar',
    password: '1942',
    adminPin: '1942',
    localAccounts,
    jugadores,
  });
  assert.equal(resAdmin.authenticated, true);
  assert.equal(resAdmin.esAdmin, true);
  assert.equal(resAdmin.nombreMostrado, 'Comisión Directiva');

  // Búsqueda por Email y DNI para activar contraseña
  assert.equal(buscarJugadorPorEmail(jugadores, 'Juan@carc.com')?.id, 10);
  assert.equal(buscarJugadorPorEmailYDni(jugadores, 'juan@carc.com', '34.567.890')?.id, 10);
  assert.equal(buscarJugadorPorEmailYDni(jugadores, 'juan@carc.com', '99999999'), undefined);
  assert.equal(formatearNombreCorto('Juan Pablo Pérez'), 'Juan P.');
});

import {
  calcularMesAnterior,
  evaluarEstadoFinancieroJugador,
  evaluarJugadoresParaReserva,
  formatearPeriodoMes,
  resolverUltimoMesAlMarcarNoPago,
} from './billingLogic';

test('billingLogic: periodo mensual hasta el día 10 y preaviso faltando 3 días (días 7, 8, 9 y 10)', () => {
  const jugadorBase: Jugador = {
    id: 1,
    nombre: 'Carlos Dorato',
    rol: 'Delantero',
    categoria: '1ra',
    telefono: '2931000000',
    esSocioClub: true,
    saldoCuentaCorriente: 0,
    ultimoMesPago: '2026-10',
    bloqueadoTurnos: false,
    activo: true,
  };

  // Día 6 de Noviembre: todavía faltan 4 días -> NO dispara el cartel de 3 días
  const dia6 = evaluarEstadoFinancieroJugador(jugadorBase, { fechaReferenciaIso: '2026-11-06' });
  assert.equal(dia6.mensualidadPaga, false);
  assert.equal(dia6.mostrarAvisoPorVencer, false);
  assert.equal(dia6.mensualidadVencida, false);
  assert.equal(dia6.diasParaVencimiento, 4);

  // Día 7 de Noviembre: faltan 3 días -> dispara cartel de "por vencer"
  const dia7 = evaluarEstadoFinancieroJugador(jugadorBase, { fechaReferenciaIso: '2026-11-07' });
  assert.equal(dia7.mostrarAvisoPorVencer, true);
  assert.equal(dia7.mensualidadVencida, false);
  assert.equal(dia7.diasParaVencimiento, 3);
  assert.match(dia7.mensajeMensualidad || '', /faltan 3 días/i);

  // Día 10 de Noviembre: vence hoy
  const dia10 = evaluarEstadoFinancieroJugador(jugadorBase, { fechaReferenciaIso: '2026-11-10' });
  assert.equal(dia10.mostrarAvisoPorVencer, true);
  assert.equal(dia10.diasParaVencimiento, 0);
  assert.match(dia10.mensajeMensualidad || '', /vence hoy/i);

  // Día 11 de Noviembre sin pago: vencida
  const dia11 = evaluarEstadoFinancieroJugador(jugadorBase, { fechaReferenciaIso: '2026-11-11' });
  assert.equal(dia11.mensualidadVencida, true);
  assert.equal(dia11.mostrarAvisoPorVencer, false);
  assert.equal(dia11.estadoMensualidad, 'vencida');
  assert.match(dia11.mensajeMensualidad || '', /venció el día 10/i);

  // Si pagó Noviembre ('2026-11'), está al día aunque sea día 15
  const pagado: Jugador = { ...jugadorBase, ultimoMesPago: '2026-11' };
  const dia15Pago = evaluarEstadoFinancieroJugador(pagado, { fechaReferenciaIso: '2026-11-15' });
  assert.equal(dia15Pago.mensualidadPaga, true);
  assert.equal(dia15Pago.estadoMensualidad, 'al_dia');
  assert.equal(dia15Pago.requiereAtencion, false);
  assert.equal(formatearPeriodoMes('2026-11'), 'Noviembre 2026');
});

test('billingLogic: deuda de cantina y bloqueo discrecional de la Comisión al reservar turno', () => {
  const jugadores: Jugador[] = [
    {
      id: 1,
      nombre: 'Lucas Gómez',
      rol: 'Delantero',
      categoria: '2da',
      telefono: '2931111111',
      esSocioClub: true,
      saldoCuentaCorriente: -4500, // Debe cantina
      ultimoMesPago: '2026-10', // Mensualidad vencida el 10 de Nov
      bloqueadoTurnos: false, // La Comisión decidió NO bloquearlo todavía (solo informar)
      activo: true,
    },
    {
      id: 2,
      nombre: 'Martín Ruiz',
      rol: 'Zaguero',
      categoria: '2da',
      telefono: '2931222222',
      esSocioClub: true,
      saldoCuentaCorriente: 0,
      ultimoMesPago: '2026-10',
      bloqueadoTurnos: true, // La Comisión SÍ activó el toggle de bloqueo
      motivoBloqueo: 'Cuota vencida',
      activo: true,
    },
    {
      id: 3,
      nombre: 'Pedro Díaz',
      rol: 'Delantero',
      categoria: '2da',
      telefono: '2931333333',
      esSocioClub: true,
      saldoCuentaCorriente: 0,
      ultimoMesPago: '2026-11',
      bloqueadoTurnos: false,
      activo: true,
    },
  ];

  // Reserva con Lucas (debe pero NO está bloqueado): puede reservar, con advertencia informativa
  const evalInformacion = evaluarJugadoresParaReserva(
    ['Lucas Gómez', 'Pedro Díaz'],
    jugadores,
    { fechaReferenciaIso: '2026-11-14' }
  );
  assert.equal(evalInformacion.puedeReservar, true);
  assert.equal(evalInformacion.bloqueados.length, 0);
  assert.equal(evalInformacion.advertencias.length, 1);
  assert.equal(evalInformacion.advertencias[0].tieneDeudaCantina, true);
  assert.equal(evalInformacion.advertencias[0].estado.deudaCantina, 4500);
  assert.equal(evalInformacion.advertencias[0].tieneAvisoMensualidad, true);

  // Reserva con Martín (bloqueado manualmente por Comisión): no puede reservar
  const evalBloqueado = evaluarJugadoresParaReserva(
    ['Lucas Gómez', 'Martín Ruiz'],
    jugadores,
    { fechaReferenciaIso: '2026-11-14' }
  );
  assert.equal(evalBloqueado.puedeReservar, false);
  assert.equal(evalBloqueado.bloqueados.length, 1);
  assert.equal(evalBloqueado.bloqueados[0].nombre, 'Martín Ruiz');

  // Mappers conservan bloqueado_turnos, ultimo_mes_pago y motivo_bloqueo
  const dbRow = mapJugadorToDb(jugadores[1]);
  assert.equal(dbRow.bloqueado_turnos, true);
  assert.equal(dbRow.ultimo_mes_pago, '2026-10');
  assert.equal(dbRow.motivo_bloqueo, 'Cuota vencida');
  const frontRow = mapJugadorFromDb({ id: 2, ...dbRow });
  assert.equal(frontRow.bloqueadoTurnos, true);
  assert.equal(frontRow.ultimoMesPago, '2026-10');
  assert.equal(frontRow.motivoBloqueo, 'Cuota vencida');
});

test('billingLogic: calcularMesAnterior y revertir pago de mensualidad a NO PAGO', () => {
  assert.equal(calcularMesAnterior('2026-11'), '2026-10');
  assert.equal(calcularMesAnterior('2026-01'), '2025-12');

  assert.equal(resolverUltimoMesAlMarcarNoPago('2026-11', '2026-11'), '2026-10');
  assert.equal(resolverUltimoMesAlMarcarNoPago('2026-12', '2026-11'), '2026-10');
  assert.equal(resolverUltimoMesAlMarcarNoPago('2026-09', '2026-11'), '2026-09');
  assert.equal(resolverUltimoMesAlMarcarNoPago(undefined, '2026-11'), undefined);

  const jugadorPago: Jugador = {
    id: 9,
    nombre: 'Sofía P.',
    rol: 'Delantero',
    categoria: '2da',
    telefono: '2931000001',
    esSocioClub: true,
    saldoCuentaCorriente: 0,
    ultimoMesPago: '2026-11',
    activo: true,
  };
  const revertido: Jugador = {
    ...jugadorPago,
    ultimoMesPago: resolverUltimoMesAlMarcarNoPago(jugadorPago.ultimoMesPago, '2026-11'),
  };
  const estado = evaluarEstadoFinancieroJugador(revertido, { fechaReferenciaIso: '2026-11-12' });
  assert.equal(estado.mensualidadPaga, false);
  assert.equal(estado.estadoMensualidad, 'vencida');
});

import {
  obtenerFechaHoraArgentina,
  evaluarVentanaReserva,
  evaluarBloqueoDia,
  formatearObservacionInvitado,
  combinarNotasInvitado,
} from './turnosLogic';
import {
  DEFAULT_ACCESS_CODES,
  normalizarRolStaff,
  obtenerPermisosRol,
  resolverCodigoAcceso,
} from './authLogic';
import { calcularMetricasDiarias, filtrarHistorialTurnos } from './metricsLogic';
import { parsearPadronImportado } from './importLogic';
import { ConsumoIndividual, HorarioConfig } from '../types';

test('turnosLogic: regla de reserva en el día desde las 08:00 hs AR y bloqueo total de jornada', () => {
  // 2026-11-19 07:30 hora Argentina = 10:30 UTC
  const antesDeLas8 = new Date('2026-11-19T10:30:00Z');
  const arAntes = obtenerFechaHoraArgentina(antesDeLas8);
  assert.equal(arAntes.fechaIso, '2026-11-19');
  assert.equal(arAntes.hora, 7);

  const resAntes = evaluarVentanaReserva({
    fechaSeleccionada: '2026-11-19',
    soloTurnosEnElDia: true,
    horaAperturaTurnos: 8,
    esStaff: false,
    ahora: antesDeLas8,
  });
  assert.equal(resAntes.habilitado, false);
  assert.equal(resAntes.antesDeApertura, true);
  assert.match(resAntes.motivo || '', /08:00 hs/);

  // 2026-11-19 08:05 hora Argentina = 11:05 UTC -> habilitado hoy
  const despuesDeLas8 = new Date('2026-11-19T11:05:00Z');
  const resHoy = evaluarVentanaReserva({
    fechaSeleccionada: '2026-11-19',
    soloTurnosEnElDia: true,
    horaAperturaTurnos: 8,
    esStaff: false,
    ahora: despuesDeLas8,
  });
  assert.equal(resHoy.habilitado, true);

  // Mañana para usuario común -> bloqueado si soloTurnosEnElDia = true
  const resManana = evaluarVentanaReserva({
    fechaSeleccionada: '2026-11-20',
    soloTurnosEnElDia: true,
    horaAperturaTurnos: 8,
    esStaff: false,
    ahora: despuesDeLas8,
  });
  assert.equal(resManana.habilitado, false);
  assert.equal(resManana.esHoy, false);

  // Staff puede operar siempre
  const resStaff = evaluarVentanaReserva({
    fechaSeleccionada: '2026-11-20',
    soloTurnosEnElDia: true,
    horaAperturaTurnos: 8,
    esStaff: true,
    ahora: antesDeLas8,
  });
  assert.equal(resStaff.habilitado, true);

  // Día bloqueado por evento especial
  const bloqueos = {
    '2026-11-19': { bloqueado: true, motivo: 'Torneo Nacional Sub-23' },
  };
  assert.equal(evaluarBloqueoDia('2026-11-19', bloqueos).bloqueado, true);
  const resBloq = evaluarVentanaReserva({
    fechaSeleccionada: '2026-11-19',
    diasBloqueados: bloqueos,
    esStaff: false,
    ahora: despuesDeLas8,
  });
  assert.equal(resBloq.habilitado, false);
  assert.equal(resBloq.esDiaBloqueado, true);
  assert.match(resBloq.motivo || '', /Torneo Nacional Sub-23/);

  const nota = combinarNotasInvitado('Partido amistoso', [
    formatearObservacionInvitado('Lucas Inv', 'Abona en efectivo'),
  ]);
  assert.match(nota, /\[Servicio de Invitado\]/);
  assert.match(nota, /Lucas Inv/);
});

test('authLogic: códigos específicos diferencian Comisión Directiva (super_admin) de Cantina (cantinero)', () => {
  assert.equal(normalizarRolStaff('admin'), 'super_admin');
  assert.equal(normalizarRolStaff('cantinero'), 'cantinero');
  assert.equal(normalizarRolStaff('otro'), 'jugador');

  const resComision = resolverCodigoAcceso('comision-carc', DEFAULT_ACCESS_CODES);
  assert.equal(resComision.valido, true);
  assert.equal(resComision.rol, 'super_admin');

  const resCantina = resolverCodigoAcceso('CANTINA-CARC', DEFAULT_ACCESS_CODES);
  assert.equal(resCantina.valido, true);
  assert.equal(resCantina.rol, 'cantinero');

  const resInvalido = resolverCodigoAcceso('CUALQUIERA', DEFAULT_ACCESS_CODES);
  assert.equal(resInvalido.valido, false);
  assert.equal(resInvalido.rol, 'jugador');

  const pSuper = obtenerPermisosRol('super_admin');
  assert.equal(pSuper.puedeVerReportesYMetricas, true);
  assert.equal(pSuper.puedeBloquearJugadores, true);
  assert.equal(pSuper.puedeConfigurarYClaves, true);
  assert.equal(pSuper.puedeEditarHeroYPromos, true);
  assert.equal(pSuper.puedeManejarCantinaYTurnos, true);

  // Cantinero aislado: solo cantina y turnos, cero métricas, cero claves, cero bloqueos
  const pCantina = obtenerPermisosRol('cantinero');
  assert.equal(pCantina.esStaff, true);
  assert.equal(pCantina.puedeManejarCantinaYTurnos, true);
  assert.equal(pCantina.puedeVerReportesYMetricas, false);
  assert.equal(pCantina.puedeBloquearJugadores, false);
  assert.equal(pCantina.puedeConfigurarYClaves, false);
  assert.equal(pCantina.puedeEditarHeroYPromos, false);
  assert.equal(pCantina.puedeEditarEventosDia, false);
  assert.equal(pCantina.puedeGestionarTorneos, false);
});

test('metricsLogic: calcula recaudación diaria por categoría, método (Efectivo vs Alias MP) y auditoría de operadora', () => {
  const horarios: HorarioConfig[] = [
    { id: '18-19', inicio: '18:00', fin: '19:00', etiqueta: '18:00 a 19:00 hs', precioCancha: 10000, precioLuz: 2000, activo: true },
    { id: '19-20', inicio: '19:00', fin: '20:00', etiqueta: '19:00 a 20:00 hs', precioCancha: 10000, precioLuz: 2000, activo: true },
  ];
  const turnos: Record<string, Turno> = {
    '2026-11-19__18-19': {
      id: '2026-11-19__18-19',
      horarioId: '18-19',
      fecha: '2026-11-19',
      estado: 'ocupado',
      p1: { nombre: 'P1', delantero: 'Juan A', zaguero: 'Pedro B' },
      p2: { nombre: 'P2', delantero: 'Luis C', zaguero: 'Diego D' },
      organizadorNombre: 'Juan A',
      costoTotal: 12000,
      pagado: true,
      metodoPago: 'transferencia',
      registradoPor: 'Cantinera Ana',
    },
    '2026-11-18__19-20': {
      id: '2026-11-18__19-20',
      horarioId: '19-20',
      fecha: '2026-11-18',
      estado: 'ocupado',
      p1: { nombre: 'P1', delantero: 'Mario X', zaguero: 'Carlos Y' },
      p2: { nombre: 'P2', delantero: 'Nico Z', zaguero: 'Tomi W' },
      organizadorNombre: 'Mario X',
      costoTotal: 12000,
      pagado: false,
    },
  };
  const consumos: ConsumoIndividual[] = [
    {
      id: 'c1',
      fecha: '2026-11-19',
      hora: '19:20',
      socioNombre: 'Invitado Martín',
      esInvitado: true,
      observacionInvitado: 'Amigo de Juan, abonó cerveza',
      detalle: '1x Quilmes 1L',
      monto: 4500,
      pagado: true,
      metodoPago: 'efectivo',
      registradoPor: 'Cantinera Ana',
    },
    {
      id: 'c2',
      fecha: '2026-11-19',
      hora: '20:00',
      socioNombre: 'Pedro B',
      esInvitado: false,
      detalle: '1x Gatorade',
      monto: 2800,
      pagado: false,
      registradoPor: 'Cantinera Ana',
    },
  ];
  const movimientos: MovimientoCaja[] = [
    {
      id: 'm1',
      fecha: '2026-11-19',
      hora: '18:10',
      tipo: 'ingreso',
      categoria: 'cancha',
      descripcion: 'Turno 18-19',
      monto: 12000,
      metodoPago: 'transferencia',
      turnoId: '2026-11-19__18-19',
      registradoPor: 'Cantinera Ana',
    },
    {
      id: 'm2',
      fecha: '2026-11-19',
      hora: '19:20',
      tipo: 'ingreso',
      categoria: 'cantina',
      descripcion: 'Quilmes',
      monto: 4500,
      metodoPago: 'efectivo',
      comandaId: 'c1',
      registradoPor: 'Cantinera Ana',
    },
    {
      id: 'm3',
      fecha: '2026-11-19',
      hora: '19:40',
      tipo: 'ingreso',
      categoria: 'cuota_socio',
      descripcion: 'Mensualidad Seguro',
      monto: 15000,
      metodoPago: 'transferencia',
      registradoPor: 'Comisión Directiva',
    },
  ];

  const m = calcularMetricasDiarias({
    fecha: '2026-11-19',
    turnos,
    consumos,
    movimientosCaja: movimientos,
    horarios,
  });

  assert.equal(m.turnos.transferencia, 12000);
  assert.equal(m.cantina.efectivo, 4500);
  assert.equal(m.cantina.pendienteOCtaCte, 2800);
  assert.equal(m.cantina.invitadosCantidad, 1);
  assert.equal(m.mensualidades.transferencia, 15000);
  assert.equal(m.porMetodo.efectivo, 4500);
  assert.equal(m.porMetodo.transferencia, 27000);
  assert.equal(m.ingresosTotales, 31500);
  assert.ok(m.resumenPorOperador.some((op) => op.operador === 'Cantinera Ana'));

  const hist = filtrarHistorialTurnos(turnos, horarios, { busqueda: 'Mario' });
  assert.equal(hist.length, 1);
  assert.equal(hist[0].fecha, '2026-11-18');
});

test('importLogic: parsea planilla de jugadores (base de Ariel) y detecta duplicados por DNI', () => {
  const existentes: Jugador[] = [
    {
      id: 1,
      nombre: 'Juan Pérez',
      dni: '30111222',
      rol: 'Delantero',
      categoria: '1ra',
      telefono: '2931000000',
      saldoCuentaCorriente: 0,
      activo: true,
    },
  ];

  const csv = [
    'Nombre;Apellido;DNI;Fecha Nacimiento;Telefono;Localidad;Email;Rol;Categoria;Contacto Emergencia;Obra Social',
    'Juan;Pérez;30.111.222;12/05/1985;2931440000;Río Colorado;juan@mail.com;Delantero;1ra;Ana 2931;OSDE',
    'Lucas;Martínez;35999888;1991-08-20;2931554433;La Adela;lucas@mail.com;Zaguero;2da;María 2931667788;Swiss Medical',
  ].join('\n');

  const res = parsearPadronImportado(csv, existentes);
  assert.equal(res.duplicados.length, 1);
  assert.equal(res.validos.length, 1);
  assert.equal(res.validos[0].nombre, 'Lucas Martínez');
  assert.equal(res.validos[0].dni, '35999888');
  assert.equal(res.validos[0].fechaNacimiento, '1991-08-20');
  assert.equal(res.validos[0].rol, 'Zaguero');
  assert.equal(res.validos[0].categoria, '2da');
  assert.equal(res.validos[0].localidad, 'La Adela');
});

test('metricsLogic: evita doble conteo en movimientos cantina sin comandaId que replican consumos y en otrosIngresos', () => {
  const horarios: HorarioConfig[] = [
    { id: '19-20', inicio: '19:00', fin: '20:00', etiqueta: '19:00 a 20:00', precioCancha: 10000, precioLuz: 2000, activo: true },
  ];
  const turnos: Record<string, Turno> = {
    '2026-11-19__19-20': {
      id: '2026-11-19__19-20',
      horarioId: '19-20',
      fecha: '2026-11-19',
      estado: 'ocupado',
      organizadorNombre: 'Juan Pérez',
      costoTotal: 12000,
      pagado: true,
      metodoPago: 'transferencia',
      registradoPor: 'Cantinera',
    },
  };
  const consumos: ConsumoIndividual[] = [
    {
      id: 'c1',
      fecha: '2026-11-19',
      hora: '19:30',
      socioNombre: 'Roberto Invitado',
      esInvitado: true,
      detalle: '2x Quilmes',
      monto: 5500,
      pagado: true,
      metodoPago: 'efectivo',
      registradoPor: 'Cantinera',
    },
    {
      id: 'c2',
      fecha: '2026-11-19',
      hora: '20:00',
      socioNombre: 'Lucas Martínez',
      esInvitado: false,
      detalle: '1x Agua',
      monto: 4500,
      pagado: true,
      metodoPago: 'transferencia',
      registradoPor: 'Cantinera',
    },
  ];
  const movimientos: MovimientoCaja[] = [
    {
      id: 'm1',
      fecha: '2026-11-19',
      hora: '19:10',
      tipo: 'ingreso',
      categoria: 'cancha',
      descripcion: 'Turno 19-20',
      monto: 12000,
      metodoPago: 'transferencia',
      turnoId: '2026-11-19__19-20',
      registradoPor: 'Cantinera',
    },
    // Movimientos sin comandaId que replican c1 y c2 (ej. fila legacy / cobro sin consumo_id)
    {
      id: 'm2',
      fecha: '2026-11-19',
      hora: '19:30',
      tipo: 'ingreso',
      categoria: 'cantina',
      descripcion: 'Cantina (Invitado): Roberto Invitado (2x Quilmes)',
      monto: 5500,
      metodoPago: 'efectivo',
      registradoPor: 'Cantinera',
    },
    {
      id: 'm3',
      fecha: '2026-11-19',
      hora: '20:00',
      tipo: 'ingreso',
      categoria: 'cantina',
      descripcion: 'Cobro consumo pendiente: Lucas Martínez (1x Agua)',
      monto: 4500,
      metodoPago: 'transferencia',
      registradoPor: 'Cantinera',
    },
    // Ingreso rápido sin consumo asociado: SÍ debe sumarse
    {
      id: 'm4',
      fecha: '2026-11-19',
      hora: '20:30',
      tipo: 'ingreso',
      categoria: 'cantina',
      descripcion: 'Venta mostrador anónima',
      monto: 1000,
      metodoPago: 'efectivo',
      registradoPor: 'Cantinera',
    },
    // Otro ingreso en efectivo: no debe duplicarse en ingresosTotales
    {
      id: 'm5',
      fecha: '2026-11-19',
      hora: '21:00',
      tipo: 'ingreso',
      categoria: 'otro',
      descripcion: 'Inscripción torneo',
      monto: 3000,
      metodoPago: 'efectivo',
      registradoPor: 'Comisión',
    },
  ];

  const m = calcularMetricasDiarias({
    fecha: '2026-11-19',
    turnos,
    consumos,
    movimientosCaja: movimientos,
    horarios,
  });

  assert.equal(m.cantina.efectivo, 6500);
  assert.equal(m.cantina.transferencia, 4500);
  assert.equal(m.cantina.total, 11000);
  assert.equal(m.turnos.transferencia, 12000);
  assert.equal(m.otrosIngresos, 3000);
  assert.equal(m.porMetodo.efectivo, 9500);
  assert.equal(m.porMetodo.transferencia, 16500);
  assert.equal(m.ingresosTotales, 26000);
  const opCantinera = m.resumenPorOperador.find((o) => o.operador === 'Cantinera');
  assert.equal(opCantinera?.accionesCantina, 3);
  assert.equal(opCantinera?.accionesTurnos, 1);
});

test('authLogic: construirEmailRedirectUrl y parsearRetornoConfirmacionEmail detectan confirmación, error y recuperación', () => {
  assert.equal(
    construirEmailRedirectUrl('https://carc-pelota.netlify.app/'),
    'https://carc-pelota.netlify.app/?confirmado=1'
  );
  assert.equal(construirEmailRedirectUrl(''), '/?confirmado=1');

  assert.equal(parsearRetornoConfirmacionEmail('?confirmado=1', '').status, 'confirmed');
  assert.equal(parsearRetornoConfirmacionEmail('?code=abc-123', '').status, 'confirmed');
  assert.equal(
    parsearRetornoConfirmacionEmail('', '#access_token=jwt&type=signup').status,
    'confirmed'
  );

  // Recuperación de contraseña no debe abrir modal de registro confirmado
  assert.equal(
    parsearRetornoConfirmacionEmail('', '#access_token=jwt&type=recovery').status,
    'none'
  );

  // URL limpia no dispara nada
  assert.equal(parsearRetornoConfirmacionEmail('', '').status, 'none');

  // Error de link expirado devuelve mensaje amigable en español
  const errRes = parsearRetornoConfirmacionEmail(
    '?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    ''
  );
  assert.equal(errRes.status, 'error');
  assert.match(errRes.mensajeError || '', /venció/i);
});

test('authLogic: validarReclamoFichaPadron valida coincidencia exacta, normalización y rechazos', () => {
  const jugadorConDni: Jugador = {
    id: 101,
    nombre: 'Ariel Gorjón',
    dni: '30.111.222',
    telefono: '2931-111111',
    categoria: '1ra',
    rol: 'Delantero',
    saldoCuentaCorriente: 0,
    activo: true,
    partidosJugados: 12,
  };

  // Coincidencia válida con formato con puntos o sin puntos
  const ok1 = validarReclamoFichaPadron(jugadorConDni, '30111222');
  assert.equal(ok1.valido, true);
  assert.equal(ok1.dniLimpio, '30111222');

  const ok2 = validarReclamoFichaPadron(jugadorConDni, ' 30.111.222 ');
  assert.equal(ok2.valido, true);
  assert.equal(ok2.dniLimpio, '30111222');

  // Jugador en el padrón sin DNI cargado: acepta cualquier DNI válido (>= 6 dígitos)
  const jugadorSinDni: Jugador = {
    id: 102,
    nombre: 'Pelotari Nuevo Padrón',
    dni: '',
    telefono: '2931-222222',
    categoria: '2da',
    rol: 'Zaguero',
    saldoCuentaCorriente: 0,
    activo: true,
    partidosJugados: 0,
  };
  const okSinDni = validarReclamoFichaPadron(jugadorSinDni, '40.999.888');
  assert.equal(okSinDni.valido, true);
  assert.equal(okSinDni.dniLimpio, '40999888');

  // Rechazo cuando no coincide con el DNI registrado
  const falloDni = validarReclamoFichaPadron(jugadorConDni, '30999999');
  assert.equal(falloDni.valido, false);
  assert.match(falloDni.error || '', /no coincide/i);

  // Rechazo por DNI demasiado corto (< 6 dígitos)
  const falloCorto = validarReclamoFichaPadron(jugadorConDni, '12345');
  assert.equal(falloCorto.valido, false);
  assert.match(falloCorto.error || '', /mínimo 6 dígitos/i);

  // Rechazo cuando falta jugador
  const falloSinJugador = validarReclamoFichaPadron(undefined, '30111222');
  assert.equal(falloSinJugador.valido, false);
  assert.match(falloSinJugador.error || '', /lista del padrón/i);
});





