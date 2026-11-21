import React, { useEffect, useState } from 'react';
import {
  LogIn,
  X,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  UserPlus,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { ClubConfig } from '../types';

interface LoginModalProps {
  clubConfig: ClubConfig;
  supabaseConectado: boolean;
  supabaseConfigurado: boolean;
  onIniciarSesion: (emailOIdentificador: string, password: string) => Promise<void>;
  onActivarAccesoJugador: (email: string, dni: string, password: string) => Promise<void>;
  onIrARegistro: () => void;
  onIrARegistroPadron?: () => void;
  onCerrar: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  clubConfig,
  supabaseConectado,
  supabaseConfigurado,
  onIniciarSesion,
  onActivarAccesoJugador,
  onIrARegistro,
  onIrARegistroPadron,
  onCerrar,
}) => {
  const [modo, setModo] = useState<'login' | 'activar'>('login');
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [dniActivar, setDniActivar] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCerrar]);

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const idTrim = identificador.trim();
    if (supabaseConectado && !idTrim) {
      setErrorMsg('Ingresa tu correo electrónico.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Ingresa tu contraseña.');
      return;
    }

    setCargando(true);
    try {
      await onIniciarSesion(idTrim, password);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo iniciar sesión. Verifica tus datos.'
      );
    } finally {
      setCargando(false);
    }
  };

  const handleSubmitActivar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const emailTrim = identificador.trim();
    const dniLimpio = dniActivar.replace(/[^0-9]/g, '');

    if (!emailTrim || !emailTrim.includes('@')) {
      setErrorMsg('Ingresa el correo electrónico con el que estás registrado.');
      return;
    }
    if (dniLimpio.length < 6) {
      setErrorMsg('Ingresa tu DNI numérico sin puntos (mínimo 6 dígitos).');
      return;
    }
    if (password.trim().length < 6) {
      setErrorMsg('Elige una contraseña de al menos 6 caracteres.');
      return;
    }

    setCargando(true);
    try {
      await onActivarAccesoJugador(emailTrim, dniLimpio, password.trim());
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo activar el acceso.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 my-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 shrink-0">
              {modo === 'login' ? (
                <LogIn className="w-4 h-4" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3
                id="login-modal-title"
                className="text-base font-extrabold text-slate-900 dark:text-white font-display truncate"
              >
                {modo === 'login' ? 'Ingresar a tu Cuenta' : 'Activar Contraseña'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {clubConfig.nombreClub}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar modal de ingreso"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {modo === 'login'
            ? 'Ingresa con tu email y contraseña registrados. Si tu cuenta está autorizada como Comisión Directiva o Cantina, tu acceso se habilitará automáticamente.'
            : 'Si ya figurás en el padrón de pelotaris (o en la base del seguro) sin contraseña, valida tu Email y DNI para activarla.'}
        </p>

        {supabaseConfigurado && !supabaseConectado && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px]">
            Modo local activo: las tablas SQL aún no respondieron en Supabase. Puedes ingresar con tu cuenta local o PIN.
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {modo === 'login' ? (
          <form onSubmit={handleSubmitLogin} className="space-y-3.5">
            <div>
              <label
                htmlFor="login-email"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Email
              </label>
              <input
                id="login-email"
                type={supabaseConectado ? 'email' : 'text'}
                inputMode="email"
                autoComplete="email"
                autoFocus
                required={supabaseConectado}
                placeholder={supabaseConectado ? 'tu@email.com' : "tu@email.com (o 'admin')"}
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={mostrarPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder={supabaseConectado ? '••••••••' : 'Contraseña o PIN local'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPass((prev) => !prev)}
                  aria-label={mostrarPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!supabaseConectado && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Modo local: ingresa la contraseña de pelotari o el PIN de administrador.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onCerrar}
                className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {cargando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>{cargando ? 'Ingresando...' : 'Ingresar'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitActivar} className="space-y-3.5">
            <div>
              <label
                htmlFor="activar-email"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Email registrado en el padrón
              </label>
              <input
                id="activar-email"
                type="email"
                autoFocus
                required
                placeholder="tu@email.com"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="activar-dni"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                DNI (sin puntos)
              </label>
              <input
                id="activar-dni"
                type="text"
                inputMode="numeric"
                required
                placeholder="Ej: 34567890"
                value={dniActivar}
                onChange={(e) => setDniActivar(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white tabular-nums focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label
                htmlFor="activar-password"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Nueva Contraseña (mín. 6 caracteres)
              </label>
              <div className="relative">
                <input
                  id="activar-password"
                  type={mostrarPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPass((prev) => !prev)}
                  aria-label={mostrarPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setModo('login');
                }}
                className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
              <button
                type="submit"
                disabled={cargando}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                {cargando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                <span>{cargando ? 'Activando...' : 'Activar Acceso'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer cross-links */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5 text-[11px]">
          {modo === 'login' && (
            <>
              {onIrARegistroPadron && (
                <button
                  type="button"
                  onClick={() => {
                    onCerrar();
                    onIrARegistroPadron();
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition cursor-pointer flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>¿Tu nombre ya está en el padrón? <strong>Elegí tu perfil y validalo con DNI</strong></span>
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setPassword('');
                  setModo('activar');
                }}
                className="text-left text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition cursor-pointer"
              >
                ¿Ya estás en el padrón sin contraseña?{' '}
                <span className="font-bold underline">Activar con Email y DNI</span>
              </button>
            </>
          )}
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>¿Todavía no te registraste?</span>
            <button
              type="button"
              onClick={() => {
                onCerrar();
                onIrARegistro();
              }}
              className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrarme</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
