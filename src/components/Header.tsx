import React from 'react';
import logoCarcImg from '../assets/images/club_logo_carc_1794003931452.jpg';
import { PWAInstallButton } from './PWAInstallButton';
import { formatearNombreCorto } from '../utils/authLogic';
import { RolAcceso } from '../types';
import {
  CalendarDays,
  ReceiptText,
  Trophy,
  SlidersHorizontal,
  ShieldCheck,
  Coffee,
  Sun,
  Moon,
  LogOut,
  LogIn,
  UserPlus,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

interface HeaderProps {
  vistaActiva: 'turnos' | 'cantina' | 'admin' | 'torneo';
  setVistaActiva: (vista: 'turnos' | 'cantina' | 'admin' | 'torneo') => void;
  rolAcceso: RolAcceso;
  usuarioAutenticado: boolean;
  onAbrirIngresar: () => void;
  onAbrirPerfil?: () => void;
  tieneAlertaPerfil?: boolean;
  onCerrarSesion: () => void;
  onSolicitarRegistroJugador?: () => void;
  nombreUsuario: string;
  tema: 'light' | 'dark';
  onToggleTema: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  vistaActiva,
  setVistaActiva,
  rolAcceso,
  usuarioAutenticado,
  onAbrirIngresar,
  onAbrirPerfil,
  tieneAlertaPerfil = false,
  onCerrarSesion,
  onSolicitarRegistroJugador,
  nombreUsuario,
  tema,
  onToggleTema,
}) => {
  const esSuperAdmin = rolAcceso === 'super_admin';
  const esCantinero = rolAcceso === 'cantinero';
  const esStaff = esSuperAdmin || esCantinero;

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-6 lg:px-8 py-1.5 md:py-2.5 transition-colors shadow-xs w-full max-w-full overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        {/* Top Bar: Brand + Quick Actions */}
        <div className="flex items-center justify-between gap-2 w-full min-w-0 min-h-[40px] md:min-h-0">
          {/* Brand Wordmark & Club Crest */}
          <div className="flex items-center gap-2 shrink min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-600/30 flex items-center justify-center overflow-hidden shadow-xs shrink-0">
              <img
                src={logoCarcImg || '/images/logo-carc.jpg'}
                alt="Logo CARC Pelota Paleta"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icon.svg';
                }}
              />
            </div>
            <button
              onClick={() => setVistaActiva('turnos')}
              className="text-left group cursor-pointer focus:outline-hidden min-w-0 truncate"
            >
              <div className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-900 dark:text-white font-display group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate">
                CARC TRINQUETE
              </div>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-semibold truncate">
                Club Atlético Río Colorado
              </div>
            </button>
          </div>

          {/* Desktop Navigation (visible on md and up) */}
          <nav className="hidden md:flex items-center gap-1.5 lg:gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setVistaActiva('turnos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                vistaActiva === 'turnos'
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Turnero de Cancha</span>
            </button>

            {esStaff && (
              <button
                onClick={() => setVistaActiva('cantina')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  vistaActiva === 'cantina'
                    ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50'
                    : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60'
                }`}
              >
                <ReceiptText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Cantina & Buffet</span>
              </button>
            )}

            {esSuperAdmin && (
              <>
                <button
                  onClick={() => setVistaActiva('torneo')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    vistaActiva === 'torneo'
                      ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50'
                      : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Gestor de Torneos</span>
                </button>

                <button
                  onClick={() => setVistaActiva('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                    vistaActiva === 'admin'
                      ? 'text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-100/70 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 shadow-xs'
                      : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Panel Comisión</span>
                </button>
              </>
            )}
          </nav>

          {/* Controls: Theme, PWA, Ingresar / Registrarme o Sesión activa */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={onToggleTema}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title={tema === 'light' ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
              aria-label="Alternar tema claro y oscuro"
            >
              {tema === 'light' ? (
                <Moon className="w-4 h-4 text-slate-600" />
              ) : (
                <Sun className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            <PWAInstallButton />

            {!usuarioAutenticado && !esStaff && (
              <>
                <button
                  type="button"
                  onClick={onAbrirIngresar}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-600/35 dark:border-emerald-700/60 shadow-xs transition cursor-pointer whitespace-nowrap"
                  title="Ingresar con tu cuenta registrada"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Ingresar</span>
                </button>

                {onSolicitarRegistroJugador && (
                  <button
                    type="button"
                    onClick={onSolicitarRegistroJugador}
                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer whitespace-nowrap"
                    title="Registrarme como pelotari en el padrón oficial"
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    <span>Registrarme</span>
                  </button>
                )}
              </>
            )}

            {(usuarioAutenticado || esStaff) && (
              <div className="flex items-center gap-1.5">
                {esStaff ? (
                  <>
                    <div className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {esSuperAdmin ? (
                        <>
                          <ShieldCheck className="w-3 h-3" />
                          <span>Comisión</span>
                        </>
                      ) : (
                        <>
                          <Coffee className="w-3 h-3" />
                          <span>Cantina</span>
                        </>
                      )}
                    </div>
                    {onAbrirPerfil && (
                      <button
                        type="button"
                        onClick={onAbrirPerfil}
                        className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                        title="Ver mi perfil de pelotari"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Mi Perfil</span>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onAbrirPerfil}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold max-w-[165px] transition cursor-pointer ${
                      tieneAlertaPerfil
                        ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/70 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                    }`}
                    title="Abrir mi perfil, mensualidad y estado en cantina"
                  >
                    {tieneAlertaPerfil ? (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span className="truncate">{formatearNombreCorto(nombreUsuario)}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onCerrarSesion}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

