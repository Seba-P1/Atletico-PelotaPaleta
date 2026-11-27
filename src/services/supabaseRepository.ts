import { supabase } from '../lib/supabaseClient';
import {
  ClubConfig,
  ConsumoIndividual,
  DiaBloqueado,
  HorarioConfig,
  Jugador,
  MetodoPago,
  MovimientoCaja,
  ParejaTurno,
  ProductoCantina,
  ProductoUsadoConsumo,
  PublicacionClub,
  ResultadoPartido,
  RolAcceso,
  TorneoData,
  Turno,
} from '../types';
import {
  mapClubConfigFromDb,
  mapClubConfigToDb,
  mapConsumoFromDb,
  mapDiaBloqueadoFromDb,
  mapDiaBloqueadoToDb,
  mapHorarioFromDb,
  mapHorarioToDb,
  mapJugadorFromDb,
  mapJugadorToDb,
  mapMovimientoFromDb,
  mapMovimientoToDb,
  mapProductoFromDb,
  mapProductoToDb,
  mapPublicacionFromDb,
  mapPublicacionToDb,
  mapTorneoFromDb,
  mapTurnoFromDb,
  mapTurnoToDb,
} from '../utils/supabaseMappers';
import { generarClaveTurno } from '../utils/turnosLogic';
import {
  AccessCodesConfig,
  construirEmailRedirectUrl,
  normalizarRolStaff,
} from '../utils/authLogic';

export interface AdminUserSession {
  userId: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'cantinero';
}

export interface AuthSessionResult {
  userId: string;
  email: string;
  esAdmin: boolean;
  rolAcceso: RolAcceso;
  adminInfo: AdminUserSession | null;
  nombreMostrado: string;
  jugadorId?: number;
}

export interface PublicBootstrapData {
  clubConfig: ClubConfig;
  horarios: HorarioConfig[];
  jugadores: Jugador[];
  turnos: Record<string, Turno>;
  publicaciones: PublicacionClub[];
  diasBloqueados: Record<string, DiaBloqueado>;
}

export interface AdminBootstrapData {
  productos: ProductoCantina[];
  consumos: ConsumoIndividual[];
  movimientosCaja: MovimientoCaja[];
  torneo: TorneoData | null;
}

function getClient() {
  if (!supabase) {
    throw new Error('Supabase no está configurado en las variables de entorno.');
  }
  return supabase;
}

async function resolveSessionForUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<AuthSessionResult> {
  const client = getClient();
  const userEmail = (user.email || '').trim();

  const [adminRes, jugRes] = await Promise.all([
    client
      .from('admin_users')
      .select('user_id, email, nombre, rol')
      .eq('user_id', user.id)
      .maybeSingle(),
    userEmail
      ? client
          .from('jugadores')
          .select('id, nombre')
          .ilike('email', userEmail)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const adminRow = !adminRes.error ? adminRes.data : null;
  const jugRow = !jugRes.error ? jugRes.data : null;

  const esAdmin = Boolean(adminRow);
  const rolAcceso: RolAcceso = adminRow ? normalizarRolStaff(adminRow.rol) : 'jugador';
  const adminInfo: AdminUserSession | null = adminRow
    ? {
        userId: adminRow.user_id,
        email: adminRow.email,
        nombre: adminRow.nombre,
        rol: adminRow.rol === 'cantinero' ? 'cantinero' : 'admin',
      }
    : null;

  const metadataNombre =
    typeof user.user_metadata?.nombre_completo === 'string'
      ? user.user_metadata.nombre_completo
      : '';

  const nombreMostrado =
    jugRow?.nombre ||
    adminRow?.nombre ||
    metadataNombre ||
    (userEmail ? userEmail.split('@')[0] : 'Usuario');

  return {
    userId: user.id,
    email: userEmail || adminRow?.email || '',
    esAdmin: rolAcceso === 'super_admin',
    rolAcceso,
    adminInfo,
    nombreMostrado,
    jugadorId: jugRow?.id ? Number(jugRow.id) : undefined,
  };
}

export const supabaseRepository = {
  // --------------------------------------------------------------------------
  // AUTENTICACIÓN UNIFICADA (Jugadores + detección automática de Administrador)
  // --------------------------------------------------------------------------
  async getCurrentSession(): Promise<AuthSessionResult | null> {
    if (!supabase) return null;
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
      return null;
    }
    return resolveSessionForUser(sessionData.session.user);
  },

  async signInWithCredentials(email: string, password: string): Promise<AuthSessionResult> {
    const client = getClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error || !data.user) {
      const raw = error?.message || '';
      if (raw.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Email o contraseña incorrectos.');
      }
      if (raw.toLowerCase().includes('email not confirmed')) {
        throw new Error(
          'Tu correo todavía no fue confirmado. Revisa tu casilla e ingresa al enlace de confirmación.'
        );
      }
      throw new Error(raw || 'No se pudo iniciar sesión en Supabase.');
    }

    return resolveSessionForUser(data.user);
  },

  async signUpJugadorAuth(params: {
    email: string;
    password: string;
    nombreCompleto: string;
    dni: string;
  }): Promise<{ hasSession: boolean }> {
    const client = getClient();
    const emailRedirectTo =
      typeof window !== 'undefined' && window.location?.origin
        ? construirEmailRedirectUrl(window.location.origin)
        : undefined;

    const { data, error } = await client.auth.signUp({
      email: params.email.trim(),
      password: params.password,
      options: {
        emailRedirectTo,
        data: {
          nombre_completo: params.nombreCompleto.trim(),
          dni: params.dni.trim(),
        },
      },
    });

    if (error) {
      const raw = error.message || '';
      if (raw.toLowerCase().includes('already registered')) {
        throw new Error(
          'Ese correo ya tiene una cuenta registrada. Usa la opción "Ingresar".'
        );
      }
      if (raw.toLowerCase().includes('password')) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
      }
      throw new Error(raw || 'No se pudo crear el acceso de usuario.');
    }

    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error(
        'Ese correo ya está registrado. Ingresa con tu contraseña desde la opción "Ingresar".'
      );
    }

    return {
      hasSession: Boolean(data.session),
    };
  },

  async signOut(): Promise<void> {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  async canjearCodigoAccesoRpc(codigo: string, nombre?: string): Promise<AuthSessionResult | null> {
    const client = getClient();
    const { error } = await client.rpc('canjear_codigo_acceso', {
      p_codigo: codigo.trim(),
      p_nombre: nombre?.trim() || null,
    });
    if (error) {
      const msg = error.message || '';
      if (msg.includes('Could not find the function') || msg.includes('does not exist')) {
        throw new Error(
          'Falta ejecutar supabase/migrar-roles-eventos-metricas.sql en Supabase SQL Editor para habilitar los códigos de Comisión y Cantina.'
        );
      }
      throw new Error(msg);
    }
    return this.getCurrentSession();
  },

  // --------------------------------------------------------------------------
  // CARGA INICIAL PÚBLICA Y OPERATIVA
  // --------------------------------------------------------------------------
  async fetchPublicData(desdeFecha: string): Promise<PublicBootstrapData> {
    const client = getClient();

    const [cfgRes, horRes, jugRes, turRes, pubRes, bloqRes] = await Promise.all([
      client.from('club_config').select('*').eq('id', 1).maybeSingle(),
      client.from('horarios_config').select('*').order('orden', { ascending: true }).order('inicio', { ascending: true }),
      client.from('jugadores').select('*').order('id', { ascending: true }),
      client.from('turnos').select('*').gte('fecha', desdeFecha),
      client.from('publicaciones_club').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false }),
      client.from('dias_bloqueados').select('*').gte('fecha', desdeFecha),
    ]);

    const firstErr = cfgRes.error || horRes.error || jugRes.error || turRes.error || pubRes.error;
    if (firstErr) {
      throw new Error(firstErr.message);
    }

    const turnosMap: Record<string, Turno> = {};
    (turRes.data || []).forEach((row) => {
      const mapped = mapTurnoFromDb(row);
      turnosMap[mapped.id] = mapped;
    });

    const diasBloqueadosMap: Record<string, DiaBloqueado> = {};
    if (!bloqRes.error && Array.isArray(bloqRes.data)) {
      bloqRes.data.forEach((row) => {
        const mapped = mapDiaBloqueadoFromDb(row);
        diasBloqueadosMap[mapped.fecha] = mapped;
      });
    }

    return {
      clubConfig: mapClubConfigFromDb(cfgRes.data),
      horarios: (horRes.data || []).map(mapHorarioFromDb),
      jugadores: (jugRes.data || []).map(mapJugadorFromDb),
      turnos: turnosMap,
      publicaciones: (pubRes.data || []).map(mapPublicacionFromDb),
      diasBloqueados: diasBloqueadosMap,
    };
  },

  async fetchAdminData(esSuperAdmin = true): Promise<AdminBootstrapData> {
    const client = getClient();

    if (!esSuperAdmin) {
      // Cantinero: solo productos y consumos de cantina (nunca movimientos_caja ni reportes)
      const [prodRes, consRes] = await Promise.all([
        client.from('productos_cantina').select('*').order('categoria', { ascending: true }).order('nombre', { ascending: true }),
        client.from('consumos_individuales').select('*').order('created_at', { ascending: false }),
      ]);
      const firstErr = prodRes.error || consRes.error;
      if (firstErr) throw new Error(firstErr.message);

      return {
        productos: (prodRes.data || []).map(mapProductoFromDb),
        consumos: (consRes.data || []).map(mapConsumoFromDb),
        movimientosCaja: [],
        torneo: null,
      };
    }

    const [prodRes, consRes, cajaRes, torRes] = await Promise.all([
      client.from('productos_cantina').select('*').order('categoria', { ascending: true }).order('nombre', { ascending: true }),
      client.from('consumos_individuales').select('*').order('created_at', { ascending: false }),
      client.from('movimientos_caja').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false }),
      client.from('torneos').select('*').eq('id', 'torneo-actual').maybeSingle(),
    ]);

    const firstErr = prodRes.error || consRes.error || cajaRes.error || torRes.error;
    if (firstErr) {
      throw new Error(firstErr.message);
    }

    return {
      productos: (prodRes.data || []).map(mapProductoFromDb),
      consumos: (consRes.data || []).map(mapConsumoFromDb),
      movimientosCaja: (cajaRes.data || []).map(mapMovimientoFromDb),
      torneo: mapTorneoFromDb(torRes.data),
    };
  },

  async fetchTurnosHistorial(limite = 300): Promise<Record<string, Turno>> {
    const client = getClient();
    const { data, error } = await client
      .from('turnos')
      .select('*')
      .eq('estado', 'ocupado')
      .order('fecha', { ascending: false })
      .order('horario_id', { ascending: false })
      .limit(limite);

    if (error) throw new Error(error.message);
    const mapa: Record<string, Turno> = {};
    (data || []).forEach((row) => {
      const m = mapTurnoFromDb(row);
      mapa[m.id] = m;
    });
    return mapa;
  },

  async fetchAccessCodes(): Promise<AccessCodesConfig | null> {
    const client = getClient();
    const { data, error } = await client.from('club_access_codes').select('rol, codigo');
    if (error) return null;
    const comision = data?.find((r) => r.rol === 'admin')?.codigo || 'COMISION-CARC';
    const cantina = data?.find((r) => r.rol === 'cantinero')?.codigo || 'CANTINA-CARC';
    return { codigoComision: comision, codigoCantina: cantina };
  },

  async updateAccessCode(rol: 'admin' | 'cantinero', codigo: string): Promise<void> {
    const client = getClient();
    const { error } = await client
      .from('club_access_codes')
      .upsert({ rol, codigo: codigo.trim().toUpperCase() }, { onConflict: 'rol' });
    if (error) {
      throw new Error(
        error.message.includes('club_access_codes')
          ? 'Falta ejecutar supabase/migrar-roles-eventos-metricas.sql en Supabase SQL Editor.'
          : error.message
      );
    }
  },

  async upsertDiaBloqueado(d: DiaBloqueado): Promise<DiaBloqueado> {
    const client = getClient();
    const { data, error } = await client
      .from('dias_bloqueados')
      .upsert(mapDiaBloqueadoToDb(d), { onConflict: 'fecha' })
      .select()
      .single();
    if (error) {
      throw new Error(
        error.message.includes('dias_bloqueados')
          ? 'Falta ejecutar supabase/migrar-roles-eventos-metricas.sql en Supabase SQL Editor.'
          : error.message
      );
    }
    return mapDiaBloqueadoFromDb(data);
  },

  async fetchMisConsumosRpc(): Promise<ConsumoIndividual[]> {
    if (!supabase) return [];
    const { data, error } = await supabase.rpc('obtener_mis_consumos');
    if (error) {
      return [];
    }
    return Array.isArray(data) ? data.map(mapConsumoFromDb) : [];
  },

  // --------------------------------------------------------------------------
  // TURNOS (incluye RPC atómica reservar_turno)
  // --------------------------------------------------------------------------
  async reservarTurnoRpc(
    turno: Turno,
    pagadoAhora: boolean,
    metodoPago?: MetodoPago
  ): Promise<Turno> {
    const client = getClient();
    const { data, error } = await client.rpc('reservar_turno', {
      p_horario_id: turno.horarioId,
      p_fecha: turno.fecha,
      p_p1: turno.p1 ?? null,
      p_p2: turno.p2 ?? null,
      p_organizador_nombre: turno.organizadorNombre || '',
      p_notas: turno.notas || null,
      p_pagado: pagadoAhora,
      p_metodo_pago: pagadoAhora ? metodoPago ?? null : null,
    });

    if (error) {
      throw new Error(error.message);
    }
    return mapTurnoFromDb(data);
  },

  async liberarTurno(turnoId: string, horarioId: string, fecha: string): Promise<Turno> {
    const client = getClient();
    const libre: Turno = {
      id: turnoId || generarClaveTurno(fecha, horarioId),
      horarioId,
      fecha,
      estado: 'libre',
      p1: null,
      p2: null,
      pagado: false,
      costoTotal: 0,
    };
    const { data, error } = await client
      .from('turnos')
      .upsert(mapTurnoToDb(libre), { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapTurnoFromDb(data);
  },

  async bloquearMantenimiento(fecha: string, horarioId: string): Promise<Turno> {
    const client = getClient();
    const bloqueado: Turno = {
      id: generarClaveTurno(fecha, horarioId),
      horarioId,
      fecha,
      estado: 'mantenimiento',
      notas: 'Cancha cerrada temporalmente por mantenimiento',
      p1: null,
      p2: null,
      pagado: false,
    };
    const { data, error } = await client
      .from('turnos')
      .upsert(mapTurnoToDb(bloqueado), { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapTurnoFromDb(data);
  },

  async actualizarTurno(
    turnoId: string,
    p1: ParejaTurno,
    p2: ParejaTurno,
    organizadorNombre: string,
    notas: string,
    costoTotal?: number
  ): Promise<Turno> {
    const client = getClient();
    const { data, error } = await client
      .from('turnos')
      .update({
        p1,
        p2,
        organizador_nombre: organizadorNombre,
        notas: notas.trim() || null,
        ...(costoTotal !== undefined ? { costo_total: costoTotal } : {}),
      })
      .eq('id', turnoId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapTurnoFromDb(data);
  },

  async cobrarTurno(
    turno: Turno,
    metodo: MetodoPago,
    costo: number,
    movimientoCaja: MovimientoCaja
  ): Promise<{ turno: Turno; movimiento: MovimientoCaja | null }> {
    const client = getClient();

    // Intentar RPC atómica que funciona tanto para Comisión Directiva como para Cantinero
    const rpcRes = await client.rpc('cobrar_turno_staff', {
      p_turno_id: turno.id,
      p_metodo_pago: metodo,
    });

    if (!rpcRes.error && rpcRes.data) {
      return {
        turno: mapTurnoFromDb(rpcRes.data),
        movimiento: null,
      };
    }

    // Fallback si aún no se ejecutó la migración SQL nueva
    const { data: turnoData, error: turnoErr } = await client
      .from('turnos')
      .update({
        pagado: true,
        metodo_pago: metodo,
        costo_total: costo,
      })
      .eq('id', turno.id)
      .select()
      .single();

    if (turnoErr) throw new Error(turnoErr.message);

    const { data: movData, error: movErr } = await client
      .from('movimientos_caja')
      .insert(mapMovimientoToDb(movimientoCaja))
      .select()
      .single();

    if (movErr) {
      return {
        turno: mapTurnoFromDb(turnoData),
        movimiento: null,
      };
    }

    return {
      turno: mapTurnoFromDb(turnoData),
      movimiento: mapMovimientoFromDb(movData),
    };
  },

  async guardarResultadoTurno(turnoId: string, resultado: ResultadoPartido): Promise<Turno> {
    const client = getClient();
    const { data, error } = await client
      .from('turnos')
      .update({ resultado })
      .eq('id', turnoId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapTurnoFromDb(data);
  },

  async reiniciarDiaTurnos(fecha: string): Promise<void> {
    const client = getClient();
    const { error } = await client
      .from('turnos')
      .update({
        estado: 'libre',
        p1: null,
        p2: null,
        organizador_nombre: null,
        notas: null,
        costo_total: 0,
        pagado: false,
        metodo_pago: null,
        resultado: null,
      })
      .eq('fecha', fecha);

    if (error) throw new Error(error.message);
  },

  // --------------------------------------------------------------------------
  // HORARIOS CONFIG
  // --------------------------------------------------------------------------
  async upsertHorario(h: HorarioConfig, orden?: number): Promise<HorarioConfig> {
    const client = getClient();
    const { data, error } = await client
      .from('horarios_config')
      .upsert(mapHorarioToDb(h, orden), { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapHorarioFromDb(data);
  },

  async deleteHorario(id: string): Promise<void> {
    const client = getClient();
    const { error } = await client.from('horarios_config').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --------------------------------------------------------------------------
  // JUGADORES / PADRÓN DE PELOTARIS
  // --------------------------------------------------------------------------
  async registrarJugadorPublicoRpc(params: {
    nombrePila: string;
    apellido: string;
    dni: string;
    fechaNacimiento?: string;
    email?: string;
    telefono: string;
    localidad?: string;
    rol: Jugador['rol'];
    categoria: Jugador['categoria'];
    manoHabil: NonNullable<Jugador['manoHabil']>;
    esSocioClub: boolean;
    numeroSocio?: string;
    contactoEmergencia?: string;
    observaciones?: string;
  }): Promise<Jugador> {
    const client = getClient();
    const { data, error } = await client.rpc('registrar_jugador', {
      p_nombre_pila: params.nombrePila.trim(),
      p_apellido: params.apellido.trim(),
      p_dni: params.dni.trim(),
      p_fecha_nacimiento: params.fechaNacimiento?.trim() || null,
      p_email: params.email?.trim() || null,
      p_telefono: params.telefono.trim(),
      p_localidad: params.localidad?.trim() || 'Río Colorado',
      p_rol: params.rol,
      p_categoria: params.categoria,
      p_mano_habil: params.manoHabil || 'Derecha',
      p_es_socio_club: Boolean(params.esSocioClub),
      p_numero_socio: params.numeroSocio?.trim() || null,
      p_contacto_emergencia: params.contactoEmergencia?.trim() || null,
      p_observaciones: params.observaciones?.trim() || null,
    });

    if (error) throw new Error(error.message);
    return mapJugadorFromDb(data);
  },

  async vincularMiFichaPadronRpc(params: {
    jugadorId: number;
    dni: string;
    telefono?: string;
    fechaNacimiento?: string;
    contactoEmergencia?: string;
    observaciones?: string;
  }): Promise<Jugador> {
    const client = getClient();
    const { data, error } = await client.rpc('vincular_mi_ficha_padron', {
      p_jugador_id: params.jugadorId,
      p_dni: params.dni.trim(),
      p_telefono: params.telefono?.trim() || null,
      p_fecha_nacimiento: params.fechaNacimiento?.trim() || null,
      p_contacto_emergencia: params.contactoEmergencia?.trim() || null,
      p_observaciones: params.observaciones?.trim() || null,
    });

    if (error) {
      const msg = error.message || '';
      if (msg.includes('Could not find the function') || msg.includes('vincular_mi_ficha_padron')) {
        throw new Error(
          'Falta ejecutar el SQL de vinculación del padrón (vincular_mi_ficha_padron) en Supabase SQL Editor.'
        );
      }
      throw new Error(msg);
    }
    return mapJugadorFromDb(data);
  },

  async insertJugador(j: Omit<Jugador, 'id'>): Promise<Jugador> {
    const client = getClient();
    const { data, error } = await client
      .from('jugadores')
      .insert(mapJugadorToDb(j))
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapJugadorFromDb(data);
  },

  async insertJugadoresBatch(lista: Omit<Jugador, 'id'>[]): Promise<Jugador[]> {
    const client = getClient();
    if (lista.length === 0) return [];
    const { data, error } = await client
      .from('jugadores')
      .insert(lista.map((j) => mapJugadorToDb(j)))
      .select();

    if (error) throw new Error(error.message);
    return (data || []).map(mapJugadorFromDb);
  },

  async updateJugador(j: Jugador): Promise<Jugador> {
    const client = getClient();
    const { data, error } = await client
      .from('jugadores')
      .update(mapJugadorToDb(j))
      .eq('id', j.id)
      .select()
      .single();

    if (error) {
      if (
        error.message.includes('bloqueado_turnos') ||
        error.message.includes('ultimo_mes_pago') ||
        error.message.includes('motivo_bloqueo')
      ) {
        throw new Error(
          'Falta ejecutar supabase/migrar-mensualidad-bloqueo.sql en Supabase SQL Editor para habilitar mensualidades y bloqueo.'
        );
      }
      throw new Error(error.message);
    }
    return mapJugadorFromDb(data);
  },

  async deleteJugador(id: number): Promise<void> {
    const client = getClient();
    const { error } = await client.from('jugadores').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async cobrarCuentaCorrienteJugador(
    jugador: Jugador,
    monto: number,
    movimiento: MovimientoCaja
  ): Promise<{ jugador: Jugador; movimiento: MovimientoCaja }> {
    const client = getClient();
    const nuevoSaldo = jugador.saldoCuentaCorriente + monto;
    const { data: jugData, error: jugErr } = await client
      .from('jugadores')
      .update({ saldo_cuenta_corriente: nuevoSaldo })
      .eq('id', jugador.id)
      .select()
      .single();

    if (jugErr) throw new Error(jugErr.message);

    const { data: movData, error: movErr } = await client
      .from('movimientos_caja')
      .insert(mapMovimientoToDb(movimiento))
      .select()
      .single();

    if (movErr) throw new Error(movErr.message);

    return {
      jugador: mapJugadorFromDb(jugData),
      movimiento: mapMovimientoFromDb(movData),
    };
  },

  // --------------------------------------------------------------------------
  // CANTINA INDIVIDUAL (RPCs atómicas + borrado)
  // --------------------------------------------------------------------------
  async registrarConsumoRpc(params: {
    socioNombre: string;
    socioId?: number;
    detalle: string;
    monto: number;
    pagado: boolean;
    metodoPago?: MetodoPago;
    mesa?: string;
    productosUsados?: ProductoUsadoConsumo[];
    esInvitado?: boolean;
    observacionInvitado?: string;
  }): Promise<ConsumoIndividual> {
    const client = getClient();
    const payloadBase = {
      p_socio_nombre: params.socioNombre,
      p_socio_id: params.esInvitado ? null : params.socioId ?? null,
      p_detalle: params.detalle,
      p_monto: params.monto,
      p_pagado: params.pagado,
      p_metodo_pago: params.pagado ? params.metodoPago ?? null : null,
      p_mesa: params.mesa || null,
      p_productos_usados: params.productosUsados || [],
      p_es_invitado: Boolean(params.esInvitado),
      p_observacion_invitado: params.observacionInvitado?.trim() || null,
    };

    const { data, error } = await client.rpc('registrar_consumo_cantina', payloadBase);

    if (error && error.message.includes('registrar_consumo_cantina') && !params.esInvitado) {
      // Fallback para DB antes de correr migración de invitados
      const legacyRes = await client.rpc('registrar_consumo_cantina', {
        p_socio_nombre: params.socioNombre,
        p_socio_id: params.socioId ?? null,
        p_detalle: params.detalle,
        p_monto: params.monto,
        p_pagado: params.pagado,
        p_metodo_pago: params.pagado ? params.metodoPago ?? null : null,
        p_mesa: params.mesa || null,
        p_productos_usados: params.productosUsados || [],
      });
      if (legacyRes.error) throw new Error(legacyRes.error.message);
      return mapConsumoFromDb(legacyRes.data);
    }

    if (error) throw new Error(error.message);
    return mapConsumoFromDb(data);
  },

  async cobrarConsumoRpc(consumoId: string, metodoPago: MetodoPago): Promise<ConsumoIndividual> {
    const client = getClient();
    const { data, error } = await client.rpc('cobrar_consumo_cantina', {
      p_consumo_id: consumoId,
      p_metodo_pago: metodoPago,
    });

    if (error) throw new Error(error.message);
    return mapConsumoFromDb(data);
  },

  async eliminarConsumo(item: ConsumoIndividual): Promise<void> {
    const client = getClient();
    const { error } = await client.from('consumos_individuales').delete().eq('id', item.id);
    if (error) throw new Error(error.message);

    if (!item.pagado && item.socioId) {
      const { data: jug } = await client
        .from('jugadores')
        .select('saldo_cuenta_corriente')
        .eq('id', item.socioId)
        .maybeSingle();

      if (jug) {
        await client
          .from('jugadores')
          .update({ saldo_cuenta_corriente: Number(jug.saldo_cuenta_corriente) + item.monto })
          .eq('id', item.socioId);
      }
    }
  },

  // --------------------------------------------------------------------------
  // PRODUCTOS CANTINA (STOCK)
  // --------------------------------------------------------------------------
  async upsertProducto(p: ProductoCantina): Promise<ProductoCantina> {
    const client = getClient();
    const { data, error } = await client
      .from('productos_cantina')
      .upsert(mapProductoToDb(p), { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapProductoFromDb(data);
  },

  async deleteProducto(id: string): Promise<void> {
    const client = getClient();
    const { error } = await client.from('productos_cantina').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --------------------------------------------------------------------------
  // CAJA DIARIA
  // --------------------------------------------------------------------------
  async insertMovimientoCaja(mov: MovimientoCaja): Promise<MovimientoCaja> {
    const client = getClient();
    const { data, error } = await client
      .from('movimientos_caja')
      .insert(mapMovimientoToDb(mov))
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapMovimientoFromDb(data);
  },

  async deleteMovimientoCaja(id: string): Promise<void> {
    const client = getClient();
    const { error } = await client.from('movimientos_caja').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --------------------------------------------------------------------------
  // CARTELERA / PUBLICACIONES & CONFIG CLUB & TORNEOS
  // --------------------------------------------------------------------------
  async upsertPublicacion(pub: PublicacionClub): Promise<PublicacionClub> {
    const client = getClient();
    const { data, error } = await client
      .from('publicaciones_club')
      .upsert(mapPublicacionToDb(pub), { onConflict: 'id' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapPublicacionFromDb(data);
  },

  async deletePublicacion(id: string): Promise<void> {
    const client = getClient();
    const { error } = await client.from('publicaciones_club').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async upsertClubConfig(cfg: ClubConfig): Promise<ClubConfig> {
    const client = getClient();
    const { data, error } = await client
      .from('club_config')
      .upsert(mapClubConfigToDb(cfg), { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      if (
        error.message.includes('hero_') ||
        error.message.includes('promos_cantina') ||
        error.message.includes('solo_turnos_en_el_dia') ||
        error.message.includes('hora_apertura_turnos')
      ) {
        throw new Error(
          'Falta ejecutar supabase/migrar-roles-eventos-metricas.sql en Supabase SQL Editor para guardar Hero, Promos y Regla de 08:00 hs.'
        );
      }
      throw new Error(error.message);
    }
    return mapClubConfigFromDb(data);
  },

  async saveTorneo(torneo: TorneoData | null): Promise<void> {
    const client = getClient();
    if (!torneo) {
      const { error } = await client.from('torneos').delete().eq('id', 'torneo-actual');
      if (error) throw new Error(error.message);
      return;
    }
    const { error } = await client.from('torneos').upsert(
      {
        id: 'torneo-actual',
        titulo: torneo.titulo,
        categoria: torneo.categoria,
        cantidad_parejas: torneo.cantidadParejas,
        data: torneo,
        activo: true,
      },
      { onConflict: 'id' }
    );
    if (error) throw new Error(error.message);
  },

  async restoreBackup(datos: {
    clubConfig?: ClubConfig;
    horarios?: HorarioConfig[];
    jugadores?: Jugador[];
    productos?: ProductoCantina[];
    publicaciones?: PublicacionClub[];
    turnos?: Record<string, Turno>;
    movimientosCaja?: MovimientoCaja[];
    torneo?: TorneoData | null;
  }): Promise<void> {
    const client = getClient();
    if (datos.clubConfig) {
      await client.from('club_config').upsert(mapClubConfigToDb(datos.clubConfig), { onConflict: 'id' });
    }
    if (datos.horarios?.length) {
      await client
        .from('horarios_config')
        .upsert(datos.horarios.map((h, i) => mapHorarioToDb(h, i + 1)), { onConflict: 'id' });
    }
    if (datos.jugadores?.length) {
      await client
        .from('jugadores')
        .upsert(datos.jugadores.map((j) => mapJugadorToDb(j)), { onConflict: 'id' });
    }
    if (datos.productos?.length) {
      await client
        .from('productos_cantina')
        .upsert(datos.productos.map(mapProductoToDb), { onConflict: 'id' });
    }
    if (datos.publicaciones?.length) {
      await client
        .from('publicaciones_club')
        .upsert(datos.publicaciones.map(mapPublicacionToDb), { onConflict: 'id' });
    }
    const turnosArr = Object.values(datos.turnos || {});
    if (turnosArr.length) {
      await client.from('turnos').upsert(turnosArr.map(mapTurnoToDb), { onConflict: 'id' });
    }
    if (datos.movimientosCaja?.length) {
      await client
        .from('movimientos_caja')
        .upsert(datos.movimientosCaja.map(mapMovimientoToDb), { onConflict: 'id' });
    }
    if (datos.torneo !== undefined) {
      await this.saveTorneo(datos.torneo);
    }
  },

  // --------------------------------------------------------------------------
  // SUPABASE REALTIME
  // --------------------------------------------------------------------------
  subscribePublicRealtime(onChange: () => void): () => void {
    if (!supabase) return () => {};
    const channel = supabase
      .channel('carc-public-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'horarios_config' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'publicaciones_club' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_config' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jugadores' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dias_bloqueados' }, onChange)
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  },

  subscribeAdminRealtime(onChange: () => void, esSuperAdmin = true): () => void {
    if (!supabase) return () => {};
    let channel = supabase
      .channel('carc-admin-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consumos_individuales' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos_cantina' }, onChange);

    if (esSuperAdmin) {
      channel = channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos_caja' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'torneos' }, onChange);
    }

    channel.subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  },
};
