import React, { useEffect } from 'react';
import {
  CheckCircle2,
  MailCheck,
  AlertTriangle,
  ShieldCheck,
  LogIn,
  X,
  Coffee,
} from 'lucide-react';
import { ClubConfig, RolAcceso } from '../types';

export interface ConfirmacionRegistroState {
  estado: 'confirmado' | 'pendiente' | 'error';
  nombre?: string;
  email?: string;
  rolAcceso?: RolAcceso;
  usuarioAutenticado?: boolean;
  tieneCodigoPendiente?: boolean;
  mensajeError?: string;
}

interface ConfirmacionRegistroModalProps {
  datos: ConfirmacionRegistroState;
  clubConfig: ClubConfig;
  onIrAIngresar: () => void;
  onIrAPanelStaff?: (vista: 'admin' | 'cantina') => void;
  onCerrar: () => void;
}

export const ConfirmacionRegistroModal: React.FC<ConfirmacionRegistroModalProps> = ({
  datos,
  clubConfig,
  onIrAIngresar,
  onIrAPanelStaff,
  onCerrar,
}) => {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCerrar]);

  const esConfirmado = datos.estado === 'confirmado';
  const esPendiente = datos.estado === 'pendiente';
  const esError = datos.estado === 'error';

  const etiquetaRol =
    datos.rolAcceso === 'super_admin'
      ? 'Comisión Directiva (Super Admin)'
      : datos.rolAcceso === 'cantinero'
      ? 'Encargado de Cantina y Turnos'
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmacion-registro-titulo"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 my-auto"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                esError
                  ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                  : esPendiente
                  ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {esError ? (
                <AlertTriangle className="w-5 h-5" />
              ) : esPendiente ? (
                <MailCheck className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {clubConfig.nombreClub} · Pelota Paleta
              </div>
              <h3
                id="confirmacion-registro-titulo"
                className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-display leading-snug"
              >
                {esError
                  ? 'No se pudo confirmar el enlace'
                  : esPendiente
                  ? '¡Ficha registrada! Confirmá tu email'
                  : '¡Email confirmado! Gracias por registrarte'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar aviso de registro"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {esConfirmado && (
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200">
              {datos.nombre && datos.nombre !== 'Socio Pelotari' ? (
                <span>
                  ¡Bienvenido/a <strong>{datos.nombre}</strong>! Tu cuenta de pelotari quedó{' '}
                  <strong>confirmada y registrada correctamente</strong> en {clubConfig.nombreClub}.
                </span>
              ) : (
                <span>
                  Tu correo electrónico fue confirmado y tu cuenta quedó{' '}
                  <strong>registrada correctamente</strong> en {clubConfig.nombreClub}.
                </span>
              )}
            </div>

            {etiquetaRol && (
              <div className="p-3 rounded-xl bg-slate-900 dark:bg-emerald-950/70 text-white border border-slate-800 dark:border-emerald-700 flex items-center gap-2.5">
                {datos.rolAcceso === 'cantinero' ? (
                  <Coffee className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div className="text-xs">
                  <div className="font-extrabold">Acceso habilitado automáticamente</div>
                  <div className="text-[11px] text-emerald-300">{etiquetaRol}</div>
                </div>
              </div>
            )}

            {!datos.usuarioAutenticado && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Si abriste el enlace desde otro dispositivo o navegador, hacé clic en{' '}
                <strong>Ingresar</strong> con tu email y contraseña para iniciar sesión.
              </p>
            )}
          </div>
        )}

        {esPendiente && (
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 space-y-1.5">
              <p>
                {datos.nombre ? (
                  <>
                    <strong>{datos.nombre}</strong>, tus datos ya quedaron guardados en el padrón.
                  </>
                ) : (
                  <>Tus datos ya quedaron guardados en el padrón.</>
                )}
              </p>
              <p>
                Te enviamos un correo a{' '}
                <strong className="break-all">{datos.email || 'tu casilla'}</strong>. Hacé clic en el
                botón de confirmación para activar tu cuenta y volver automáticamente al club.
              </p>
            </div>

            {datos.tieneCodigoPendiente && (
              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-start gap-2 text-[11px]">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Tu código institucional quedó guardado: apenas confirmes tu correo o inicies sesión,
                  se activará tu panel automáticamente.
                </span>
              </div>
            )}
          </div>
        )}

        {esError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
            {datos.mensajeError ||
              'El enlace de confirmación venció o ya fue utilizado. Probá ingresar con tu email y contraseña.'}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {((esConfirmado && !datos.usuarioAutenticado) || esError) && (
            <button
              type="button"
              onClick={() => {
                onCerrar();
                onIrAIngresar();
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Ir a Ingresar</span>
            </button>
          )}

          {esConfirmado && datos.rolAcceso === 'super_admin' && onIrAPanelStaff && (
            <button
              type="button"
              onClick={() => {
                onCerrar();
                onIrAPanelStaff('admin');
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ir al Panel Comisión</span>
            </button>
          )}

          {esConfirmado && datos.rolAcceso === 'cantinero' && onIrAPanelStaff && (
            <button
              type="button"
              onClick={() => {
                onCerrar();
                onIrAPanelStaff('cantina');
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Ir a Cantina</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCerrar}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            {esConfirmado ? 'Empezar a usar la app' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );
};
