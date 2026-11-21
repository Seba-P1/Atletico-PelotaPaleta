import {
  Jugador,
  HorarioConfig,
  ProductoCantina,
  Turno,
  ComandaCantina,
  MovimientoCaja,
  ConsumoIndividual,
  PublicacionClub,
  TorneoData,
  ClubConfig,
} from '../types';
import {
  JUGADORES_INICIALES,
  HORARIOS_INICIALES,
  PRODUCTOS_CANTINA_INICIALES,
  TURNOS_HOY_INICIALES,
  COMANDAS_INICIALES,
  MOVIMIENTOS_CAJA_INICIALES,
  CONSUMOS_INDIVIDUALES_INICIALES,
  PUBLICACIONES_INICIALES,
} from '../data/seedData';
import { normalizarTurnosLegacy } from '../utils/turnosLogic';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { LocalPlayerAccount, LocalSessionSnapshot } from '../utils/authLogic';

export const STORAGE_KEYS = {
  TEMA: 'carc_tema',
  ES_ADMIN: 'carc_es_admin',
  ADMIN_PIN: 'carc_admin_pin',
  ACCESS_CODES: 'carc_access_codes_v1',
  LOCAL_AUTH: 'carc_local_auth_v1',
  LOCAL_SESSION: 'carc_local_session_v1',
  PENDING_ACCESS_CODE: 'carc_pending_access_code_v1',
  CLUB_CONFIG: 'carc_club_config_v3',
  MODO_MESAS: 'carc_modo_mesas',
  DIAS_BLOQUEADOS: 'carc_dias_bloqueados_v1',
  PUBLICACIONES: 'carc_publicaciones_v3',
  TURNOS: 'carc_turnos_v3',
  JUGADORES: 'carc_jugadores_v3',
  HORARIOS: 'carc_horarios_v3',
  CONSUMOS: 'carc_consumos_ind_v3',
  PRODUCTOS: 'carc_productos_v3',
  COMANDAS: 'carc_comandas_v3',
  CAJA: 'carc_caja_v3',
  TORNEO: 'carc_torneo_v3',
} as const;

export const DEFAULT_CLUB_CONFIG: ClubConfig = {
  modoMesasActivo: false,
  nombreClub: 'Club Atlético Río Colorado',
  aliasTransferencia: 'CARC.TRINQUETE.RC',
  titularCuenta: 'Club Atlético Río Colorado - Subcomisión Paleta',
  telefonoContacto: '+54 9 2931 000000',
  diasAnticipacionReserva: 7,
  montoMensualidad: 15000,
  diaVencimientoMensualidad: 10,
  soloTurnosEnElDia: true,
  horaAperturaTurnos: 8,
  heroBadge: 'Trinquete Oficial · Río Colorado',
  heroTitulo: 'Cancha de Pelota Paleta CARC',
  heroSubtitulo:
    'Reservá tu turno en el día desde las 08:00 hs, consultá las promociones de la cantina y mantené tu seguro y mensualidad al día.',
  heroImagenUrl: '',
  promosCantina: [
    {
      id: 'promo-tercer-tiempo',
      titulo: 'Combo Tercer Tiempo',
      descripcion: '2 Lomos completos + 1 Quilmes 1L o Gaseosa 1.5L para compartir post partido.',
      precio: '$21.000',
      categoria: 'combo',
      activo: true,
    },
    {
      id: 'promo-hidratacion',
      titulo: 'Pack Hidratación Partido',
      descripcion: '2 Gatorade + 1 Agua mineral fría listos al bajar de la cancha.',
      precio: '$7.500',
      categoria: 'bebida',
      activo: true,
    },
  ],
};

export interface AppSnapshotState {
  turnos: Record<string, Turno>;
  jugadores: Jugador[];
  horarios: HorarioConfig[];
  productos: ProductoCantina[];
  consumos: ConsumoIndividual[];
  comandas: ComandaCantina[];
  movimientosCaja: MovimientoCaja[];
  publicaciones: PublicacionClub[];
  torneo: TorneoData | null;
  clubConfig: ClubConfig;
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Capa de persistencia desacoplada.
 * Actualmente persiste en localStorage; preparada para reemplazar por llamadas
 * a Supabase en `guia-puesta-a-punto.md` sin modificar los componentes visuales.
 */
export const storageService = {
  getBackendMode(): 'local' | 'supabase' {
    return isSupabaseConfigured() ? 'supabase' : 'local';
  },

  loadClubConfig(): ClubConfig {
    const saved = safeParseJson<Partial<ClubConfig> | null>(
      localStorage.getItem(STORAGE_KEYS.CLUB_CONFIG),
      null
    );
    const legacyModoMesas = localStorage.getItem(STORAGE_KEYS.MODO_MESAS) === 'true';
    return {
      ...DEFAULT_CLUB_CONFIG,
      modoMesasActivo: legacyModoMesas,
      ...(saved || {}),
    };
  },

  saveClubConfig(config: ClubConfig): void {
    localStorage.setItem(STORAGE_KEYS.CLUB_CONFIG, JSON.stringify(config));
    localStorage.setItem(STORAGE_KEYS.MODO_MESAS, String(config.modoMesasActivo));
  },

  loadDiasBloqueados(): Record<string, import('../types').DiaBloqueado> {
    return safeParseJson(localStorage.getItem(STORAGE_KEYS.DIAS_BLOQUEADOS), {});
  },

  saveDiasBloqueados(dias: Record<string, import('../types').DiaBloqueado>): void {
    localStorage.setItem(STORAGE_KEYS.DIAS_BLOQUEADOS, JSON.stringify(dias));
  },

  loadAccessCodes(): import('../utils/authLogic').AccessCodesConfig {
    const saved = safeParseJson<Partial<import('../utils/authLogic').AccessCodesConfig> | null>(
      localStorage.getItem(STORAGE_KEYS.ACCESS_CODES),
      null
    );
    return {
      codigoComision: saved?.codigoComision || 'COMISION-CARC',
      codigoCantina: saved?.codigoCantina || 'CANTINA-CARC',
    };
  },

  saveAccessCodes(codes: import('../utils/authLogic').AccessCodesConfig): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_CODES, JSON.stringify(codes));
  },

  loadTurnos(fechaHoy: string): Record<string, Turno> {
    const raw = safeParseJson<Record<string, Turno>>(
      localStorage.getItem(STORAGE_KEYS.TURNOS),
      TURNOS_HOY_INICIALES
    );
    return normalizarTurnosLegacy(raw, fechaHoy);
  },

  saveTurnos(turnos: Record<string, Turno>): void {
    localStorage.setItem(STORAGE_KEYS.TURNOS, JSON.stringify(turnos));
  },

  loadJugadores(): Jugador[] {
    return safeParseJson(localStorage.getItem(STORAGE_KEYS.JUGADORES), JUGADORES_INICIALES);
  },

  saveJugadores(jugadores: Jugador[]): void {
    localStorage.setItem(STORAGE_KEYS.JUGADORES, JSON.stringify(jugadores));
  },

  loadHorarios(): HorarioConfig[] {
    return safeParseJson(localStorage.getItem(STORAGE_KEYS.HORARIOS), HORARIOS_INICIALES);
  },

  saveHorarios(horarios: HorarioConfig[]): void {
    localStorage.setItem(STORAGE_KEYS.HORARIOS, JSON.stringify(horarios));
  },

  loadConsumos(): ConsumoIndividual[] {
    return safeParseJson(localStorage.getItem(STORAGE_KEYS.CONSUMOS), CONSUMOS_INDIVIDUALES_INICIALES);
  },

  saveConsumos(consumos: ConsumoIndividual[]): void {
    localStorage.setItem(STORAGE_KEYS.CONSUMOS, JSON.stringify(consumos));
  },

  loadProductos(): ProductoCantina[] {
    return safeParseJson(localStorage.getItem(STORAGE_KEYS.PRODUCTOS), PRODUCTOS_CANTINA_INICIALES);
  },

  saveProductos(productos: ProductoCantina[]): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTOS, JSON.stringify(productos));
  },

  loadComandas(): ComandaCantina[] {
    return safeParseJson(localStorage.getItem(STORAGE_KEYS.COMANDAS), COMANDAS_INICIALES);
  },

  saveComandas(comandas: ComandaCantina[]): void {
    localStorage.setItem(STORAGE_KEYS.COMANDAS, JSON.stringify(comandas));
  },

  loadMovimientosCaja(): MovimientoCaja[] {
    return safeParseJson(localStorage.getItem(STORAGE_KEYS.CAJA), MOVIMIENTOS_CAJA_INICIALES);
  },

  saveMovimientosCaja(movimientos: MovimientoCaja[]): void {
    localStorage.setItem(STORAGE_KEYS.CAJA, JSON.stringify(movimientos));
  },

  loadPublicaciones(): PublicacionClub[] {
    return safeParseJson(localStorage.getItem(STORAGE_KEYS.PUBLICACIONES), PUBLICACIONES_INICIALES);
  },

  savePublicaciones(publicaciones: PublicacionClub[]): void {
    localStorage.setItem(STORAGE_KEYS.PUBLICACIONES, JSON.stringify(publicaciones));
  },

  loadTorneo(): TorneoData | null {
    return safeParseJson<TorneoData | null>(localStorage.getItem(STORAGE_KEYS.TORNEO), null);
  },

  saveTorneo(torneo: TorneoData | null): void {
    if (!torneo) {
      localStorage.removeItem(STORAGE_KEYS.TORNEO);
    } else {
      localStorage.setItem(STORAGE_KEYS.TORNEO, JSON.stringify(torneo));
    }
  },

  loadLocalAccounts(): Record<string, LocalPlayerAccount> {
    return safeParseJson<Record<string, LocalPlayerAccount>>(
      localStorage.getItem(STORAGE_KEYS.LOCAL_AUTH),
      {}
    );
  },

  saveLocalAccount(account: LocalPlayerAccount): void {
    const emailNorm = account.email.trim().toLowerCase();
    if (!emailNorm) return;
    const current = this.loadLocalAccounts();
    current[emailNorm] = { ...account, email: emailNorm };
    localStorage.setItem(STORAGE_KEYS.LOCAL_AUTH, JSON.stringify(current));
  },

  loadLocalSession(): LocalSessionSnapshot | null {
    return safeParseJson<LocalSessionSnapshot | null>(
      localStorage.getItem(STORAGE_KEYS.LOCAL_SESSION),
      null
    );
  },

  saveLocalSession(session: LocalSessionSnapshot | null): void {
    if (!session) {
      localStorage.removeItem(STORAGE_KEYS.LOCAL_SESSION);
    } else {
      localStorage.setItem(STORAGE_KEYS.LOCAL_SESSION, JSON.stringify(session));
    }
  },

  savePendingAccessCode(email: string, codigo: string): void {
    const emailNorm = email.trim().toLowerCase();
    const codigoNorm = codigo.trim().toUpperCase();
    if (!emailNorm || !codigoNorm) return;
    localStorage.setItem(
      STORAGE_KEYS.PENDING_ACCESS_CODE,
      JSON.stringify({ email: emailNorm, codigo: codigoNorm })
    );
  },

  loadPendingAccessCode(email?: string | null): string | null {
    const saved = safeParseJson<{ email?: string; codigo?: string } | null>(
      localStorage.getItem(STORAGE_KEYS.PENDING_ACCESS_CODE),
      null
    );
    if (!saved?.codigo) return null;
    if (email && saved.email && saved.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
      return null;
    }
    return saved.codigo;
  },

  clearPendingAccessCode(): void {
    localStorage.removeItem(STORAGE_KEYS.PENDING_ACCESS_CODE);
  },
};

