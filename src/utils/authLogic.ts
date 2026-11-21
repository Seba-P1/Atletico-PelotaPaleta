import { Jugador, RolAcceso } from '../types';

export interface AccessCodesConfig {
  codigoComision: string;
  codigoCantina: string;
}

export const DEFAULT_ACCESS_CODES: AccessCodesConfig = {
  codigoComision: 'COMISION-CARC',
  codigoCantina: 'CANTINA-CARC',
};

export interface PermisosRol {
  rol: RolAcceso;
  esSuperAdmin: boolean;
  esCantinero: boolean;
  esStaff: boolean;
  puedeVerReportesYMetricas: boolean;
  puedeConfigurarYClaves: boolean;
  puedeBloquearJugadores: boolean;
  puedeEditarHeroYPromos: boolean;
  puedeEditarEventosDia: boolean;
  puedeManejarCantinaYTurnos: boolean;
  puedeGestionarTorneos: boolean;
}

export function normalizarRolStaff(dbRol?: string | null): RolAcceso {
  const r = (dbRol || '').trim().toLowerCase();
  if (r === 'admin' || r === 'super_admin') return 'super_admin';
  if (r === 'cantinero' || r === 'cantina') return 'cantinero';
  return 'jugador';
}

export function obtenerPermisosRol(rol: RolAcceso): PermisosRol {
  const esSuperAdmin = rol === 'super_admin';
  const esCantinero = rol === 'cantinero';
  const esStaff = esSuperAdmin || esCantinero;
  return {
    rol,
    esSuperAdmin,
    esCantinero,
    esStaff,
    puedeVerReportesYMetricas: esSuperAdmin,
    puedeConfigurarYClaves: esSuperAdmin,
    puedeBloquearJugadores: esSuperAdmin,
    puedeEditarHeroYPromos: esSuperAdmin,
    puedeEditarEventosDia: esSuperAdmin,
    puedeManejarCantinaYTurnos: esStaff,
    puedeGestionarTorneos: esSuperAdmin,
  };
}

export function resolverCodigoAcceso(
  codigoIngresado: string,
  codes: AccessCodesConfig = DEFAULT_ACCESS_CODES
): { valido: boolean; rol: RolAcceso; etiquetaRol?: string; error?: string } {
  const clean = (codigoIngresado || '').trim().toUpperCase();
  if (!clean) {
    return { valido: false, rol: 'jugador' };
  }

  const comision = (codes.codigoComision || DEFAULT_ACCESS_CODES.codigoComision).trim().toUpperCase();
  const cantina = (codes.codigoCantina || DEFAULT_ACCESS_CODES.codigoCantina).trim().toUpperCase();

  if (comision && clean === comision) {
    return { valido: true, rol: 'super_admin', etiquetaRol: 'Comisión Directiva (Super Admin)' };
  }

  if (cantina && clean === cantina) {
    return { valido: true, rol: 'cantinero', etiquetaRol: 'Encargado de Cantina y Turnos' };
  }

  return {
    valido: false,
    rol: 'jugador',
    error: 'El código de acceso ingresado no corresponde ni a Comisión Directiva ni a Cantina.',
  };
}

export interface LocalPlayerAccount {
  email: string;
  password: string;
  nombre: string;
  jugadorId?: number;
  rol?: RolAcceso;
}

export interface LocalSessionSnapshot {
  esAdmin: boolean;
  rol?: RolAcceso;
  email: string;
  nombre: string;
  jugadorId?: number;
}

export interface LocalAuthResolution {
  authenticated: boolean;
  esAdmin: boolean;
  rol: RolAcceso;
  nombreMostrado: string;
  email: string;
  jugadorId?: number;
  error?: string;
}

export function normalizarDni(dni: string): string {
  return (dni || '').replace(/[^0-9]/g, '');
}

export function buscarJugadorPorEmail(
  jugadores: Jugador[],
  email: string
): Jugador | undefined {
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm) return undefined;
  return jugadores.find(
    (j) => (j.email || '').trim().toLowerCase() === emailNorm
  );
}

export function buscarJugadorPorEmailYDni(
  jugadores: Jugador[],
  email: string,
  dni: string
): Jugador | undefined {
  const emailNorm = email.trim().toLowerCase();
  const dniNorm = normalizarDni(dni);
  if (!emailNorm || dniNorm.length < 6) return undefined;

  return jugadores.find((j) => {
    const jEmail = (j.email || '').trim().toLowerCase();
    const jDni = normalizarDni(j.dni || '');
    return jEmail === emailNorm && jDni === dniNorm;
  });
}

export function formatearNombreCorto(nombreCompleto: string): string {
  const limpio = (nombreCompleto || '').trim();
  if (!limpio) return 'Usuario';
  const partes = limpio.split(/\s+/);
  if (partes.length === 1) {
    return limpio.length > 16 ? `${limpio.slice(0, 15)}…` : limpio;
  }
  const corto = `${partes[0]} ${partes[1][0]}.`;
  return corto.length > 18 ? partes[0] : corto;
}

export function resolverSesionLocal(params: {
  identificador: string;
  password: string;
  adminPin: string;
  localAccounts: Record<string, LocalPlayerAccount>;
  jugadores: Jugador[];
}): LocalAuthResolution {
  const idClean = params.identificador.trim().toLowerCase();
  const passClean = params.password.trim();
  const pinClean = params.adminPin.trim();

  if (!passClean) {
    return {
      authenticated: false,
      esAdmin: false,
      rol: 'guest',
      nombreMostrado: '',
      email: idClean,
      error: 'Ingresa tu contraseña o PIN para continuar.',
    };
  }

  // 1. Verificar si corresponde a una cuenta de jugador/staff registrada localmente
  const cuentaJugador = idClean ? params.localAccounts[idClean] : undefined;
  if (cuentaJugador) {
    if (cuentaJugador.password === passClean) {
      const jugMatch = buscarJugadorPorEmail(params.jugadores, idClean);
      const rol: RolAcceso = cuentaJugador.rol === 'super_admin' || cuentaJugador.rol === 'cantinero'
        ? cuentaJugador.rol
        : 'jugador';
      return {
        authenticated: true,
        esAdmin: rol === 'super_admin',
        rol,
        nombreMostrado: jugMatch?.nombre || cuentaJugador.nombre,
        email: cuentaJugador.email,
        jugadorId: jugMatch?.id ?? cuentaJugador.jugadorId,
      };
    }
    return {
      authenticated: false,
      esAdmin: false,
      rol: 'guest',
      nombreMostrado: '',
      email: idClean,
      error: 'Contraseña incorrecta para ese correo electrónico.',
    };
  }

  // 2. Verificar acceso administrativo local (PIN válido con cuenta admin o sin cuenta de jugador)
  const esIdentificadorAdmin =
    idClean === '' ||
    idClean === 'admin' ||
    idClean === 'admin@carc.com.ar' ||
    !buscarJugadorPorEmail(params.jugadores, idClean);

  if (esIdentificadorAdmin && passClean === pinClean) {
    return {
      authenticated: true,
      esAdmin: true,
      rol: 'super_admin',
      nombreMostrado: 'Comisión Directiva',
      email: idClean || 'admin@carc.com.ar',
    };
  }

  return {
    authenticated: false,
    esAdmin: false,
    rol: 'guest',
    nombreMostrado: '',
    email: idClean,
    error: 'Email o contraseña incorrectos. Verifica tus datos o regístrate primero.',
  };
}

export interface EmailConfirmationRedirectResult {
  status: 'none' | 'confirmed' | 'error';
  mensajeError?: string;
}

export function construirEmailRedirectUrl(origin: string): string {
  const cleanOrigin = (origin || '').trim().replace(/\/+$/, '');
  if (!cleanOrigin) return '/?confirmado=1';
  return `${cleanOrigin}/?confirmado=1`;
}

export function parsearRetornoConfirmacionEmail(
  search: string,
  hash: string
): EmailConfirmationRedirectResult {
  const searchParams = new URLSearchParams((search || '').replace(/^\?/, ''));
  const hashClean = (hash || '').replace(/^#/, '');
  const hashParams = new URLSearchParams(hashClean);

  const rawError =
    searchParams.get('error_description') ||
    hashParams.get('error_description') ||
    searchParams.get('error') ||
    hashParams.get('error') ||
    searchParams.get('error_code') ||
    hashParams.get('error_code');

  if (rawError) {
    const lower = rawError.toLowerCase();
    const mensajeError =
      lower.includes('expired') || lower.includes('invalid') || lower.includes('otp_expired')
        ? 'El enlace de confirmación venció o ya fue utilizado. Probá ingresar con tu email y contraseña.'
        : 'No se pudo confirmar tu correo desde ese enlace. Probá ingresar con tu email y contraseña.';
    return { status: 'error', mensajeError };
  }

  const tipoHash = (hashParams.get('type') || searchParams.get('type') || '').toLowerCase();
  if (tipoHash === 'recovery') {
    return { status: 'none' };
  }

  const esConfirmado =
    searchParams.get('confirmado') === '1' ||
    searchParams.get('registro') === 'confirmado' ||
    searchParams.has('code') ||
    tipoHash === 'signup' ||
    hashParams.has('access_token');

  if (esConfirmado) {
    return { status: 'confirmed' };
  }

  return { status: 'none' };
}

export interface ValidacionReclamoPadron {
  valido: boolean;
  dniLimpio: string;
  error?: string;
}

export function validarReclamoFichaPadron(
  jugador: Jugador | undefined,
  dniIngresado: string
): ValidacionReclamoPadron {
  if (!jugador) {
    return {
      valido: false,
      dniLimpio: '',
      error: 'Seleccioná tu nombre de la lista del padrón.',
    };
  }

  const dniLimpio = normalizarDni(dniIngresado);
  if (dniLimpio.length < 6) {
    return {
      valido: false,
      dniLimpio,
      error: 'Ingresá tu DNI numérico sin puntos (mínimo 6 dígitos) para validar tu perfil.',
    };
  }

  const dniFicha = normalizarDni(jugador.dni || '');
  if (dniFicha.length >= 6 && dniFicha !== dniLimpio) {
    return {
      valido: false,
      dniLimpio,
      error: `El DNI ingresado no coincide con el registrado para ${jugador.nombre}. Verificalo o consultá con la Comisión Directiva.`,
    };
  }

  return { valido: true, dniLimpio };
}



