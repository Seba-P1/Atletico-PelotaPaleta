import React from 'react';
import { RolAcceso } from '../types';
import {
  CalendarDays,
  ReceiptText,
  Trophy,
  SlidersHorizontal,
  Users,
  UserPlus,
  LogIn,
  UserCheck,
} from 'lucide-react';

export type SocioTabActivo = 'turnos' | 'jugadores';

interface MobileBottomNavProps {
  rolAcceso: RolAcceso;
  usuarioAutenticado: boolean;
  vistaActiva: 'turnos' | 'cantina' | 'admin' | 'torneo';
  socioTabActivo: SocioTabActivo;
  sheetAdminAbierto: boolean;
  tieneAlertaPerfil?: boolean;
  onSeleccionarVistaAdmin: (vista: 'turnos' | 'cantina' | 'admin' | 'torneo') => void;
  onToggleSheetAdmin: () => void;
  onIrATurnosSocio: () => void;
  onIrAJugadoresSocio: () => void;
  onAbrirIngresar: () => void;
  onAbrirRegistroJugador: () => void;
  onAbrirPerfil: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  rolAcceso,
  usuarioAutenticado,
  vistaActiva,
  socioTabActivo,
  sheetAdminAbierto,
  tieneAlertaPerfil = false,
  onSeleccionarVistaAdmin,
  onToggleSheetAdmin,
  onIrATurnosSocio,
  onIrAJugadoresSocio,
  onAbrirIngresar,
  onAbrirRegistroJugador,
  onAbrirPerfil,
}) => {
  const esSuperAdmin = rolAcceso === 'super_admin';
  const esCantinero = rolAcceso === 'cantinero';
  const esStaff = esSuperAdmin || esCantinero;

  if (!esStaff) {
    return (
      <nav
        aria-label="Navegación principal móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe-nav shadow-[0_-4px_20px_-6px_rgba(15,23,42,0.08)] dark:shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.45)]"
      >
        <div
          className={`grid ${
            usuarioAutenticado ? 'grid-cols-3' : 'grid-cols-4'
          } items-stretch h-[58px] max-w-lg mx-auto px-1`}
        >
          <button
            type="button"
            onClick={onIrATurnosSocio}
            className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-1 transition-colors duration-150 cursor-pointer focus-visible:outline-hidden ${
              socioTabActivo === 'turnos'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white'
            }`}
          >
            {socioTabActivo === 'turnos' && (
              <span
                aria-hidden="true"
                className="absolute top-0 w-8 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
              />
            )}
            <CalendarDays
              className="w-5 h-5 mb-0.5"
              strokeWidth={socioTabActivo === 'turnos' ? 2.4 : 1.9}
            />
            <span className="text-[10px] font-bold tracking-tight whitespace-nowrap truncate">
              Turnos
            </span>
          </button>

          <button
            type="button"
            onClick={onIrAJugadoresSocio}
            className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-1 transition-colors duration-150 cursor-pointer focus-visible:outline-hidden ${
              socioTabActivo === 'jugadores'
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white'
            }`}
          >
            {socioTabActivo === 'jugadores' && (
              <span
                aria-hidden="true"
                className="absolute top-0 w-8 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
              />
            )}
            <Users
              className="w-5 h-5 mb-0.5"
              strokeWidth={socioTabActivo === 'jugadores' ? 2.4 : 1.9}
            />
            <span className="text-[10px] font-bold tracking-tight whitespace-nowrap truncate">
              Pelotaris
            </span>
          </button>

          {!usuarioAutenticado ? (
            <>
              <button
                type="button"
                onClick={onAbrirIngresar}
                className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-1 text-slate-700 dark:text-slate-200 active:scale-95 transition-transform duration-150 cursor-pointer focus-visible:outline-hidden"
              >
                <LogIn className="w-5 h-5 mb-0.5 text-emerald-700 dark:text-emerald-400" strokeWidth={2.1} />
                <span className="text-[10px] font-bold tracking-tight whitespace-nowrap truncate">
                  Ingresar
                </span>
              </button>

              <button
                type="button"
                onClick={onAbrirRegistroJugador}
                className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-1 text-emerald-700 dark:text-emerald-400 active:scale-95 transition-transform duration-150 cursor-pointer focus-visible:outline-hidden"
              >
                <UserPlus className="w-5 h-5 mb-0.5" strokeWidth={2.2} />
                <span className="text-[10px] font-extrabold tracking-tight whitespace-nowrap truncate">
                  Registrarme
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onAbrirPerfil}
              className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-1 active:scale-95 transition-transform duration-150 cursor-pointer focus-visible:outline-hidden ${
                tieneAlertaPerfil
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              <UserCheck className="w-5 h-5 mb-0.5" strokeWidth={2.1} />
              <span className="text-[10px] font-bold tracking-tight whitespace-nowrap truncate">
                {tieneAlertaPerfil ? 'Mi Perfil (!)' : 'Mi Perfil'}
              </span>
            </button>
          )}
        </div>
      </nav>
    );
  }

  const handleTapPanel = () => {
    if (vistaActiva === 'admin') {
      onToggleSheetAdmin();
    } else {
      onSeleccionarVistaAdmin('admin');
    }
  };

  return (
    <nav
      aria-label="Navegación operativa móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe-nav shadow-[0_-4px_20px_-6px_rgba(15,23,42,0.08)] dark:shadow-[0_-4px_20px_-6px_rgba(0,0,0,0.45)]"
    >
      <div
        className={`grid ${
          esSuperAdmin ? 'grid-cols-4' : 'grid-cols-2'
        } items-stretch h-[58px] max-w-lg mx-auto px-1`}
      >
        <button
          type="button"
          onClick={() => onSeleccionarVistaAdmin('turnos')}
          className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-1 transition-colors duration-150 cursor-pointer focus-visible:outline-hidden ${
            vistaActiva === 'turnos'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white'
          }`}
        >
          {vistaActiva === 'turnos' && (
            <span
              aria-hidden="true"
              className="absolute top-0 w-8 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
            />
          )}
          <CalendarDays
            className="w-5 h-5 mb-0.5"
            strokeWidth={vistaActiva === 'turnos' ? 2.4 : 1.9}
          />
          <span className="text-[10px] font-bold tracking-tight whitespace-nowrap truncate">
            Turnos
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSeleccionarVistaAdmin('cantina')}
          className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-1 transition-colors duration-150 cursor-pointer focus-visible:outline-hidden ${
            vistaActiva === 'cantina'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white'
          }`}
        >
          {vistaActiva === 'cantina' && (
            <span
              aria-hidden="true"
              className="absolute top-0 w-8 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
            />
          )}
          <ReceiptText
            className="w-5 h-5 mb-0.5"
            strokeWidth={vistaActiva === 'cantina' ? 2.4 : 1.9}
          />
          <span className="text-[10px] font-bold tracking-tight whitespace-nowrap truncate">
            Cantina
          </span>
        </button>

        {esSuperAdmin && (
          <>
            <button
              type="button"
              onClick={() => onSeleccionarVistaAdmin('torneo')}
              className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-1 transition-colors duration-150 cursor-pointer focus-visible:outline-hidden ${
                vistaActiva === 'torneo'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white'
              }`}
            >
              {vistaActiva === 'torneo' && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 w-8 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                />
              )}
              <Trophy
                className="w-5 h-5 mb-0.5"
                strokeWidth={vistaActiva === 'torneo' ? 2.4 : 1.9}
              />
              <span className="text-[10px] font-bold tracking-tight whitespace-nowrap truncate">
                Torneos
              </span>
            </button>

            <button
              type="button"
              onClick={handleTapPanel}
              aria-expanded={vistaActiva === 'admin' ? sheetAdminAbierto : undefined}
              className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-1 transition-colors duration-150 cursor-pointer focus-visible:outline-hidden ${
                vistaActiva === 'admin'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400 active:text-slate-900 dark:active:text-white'
              }`}
            >
              {vistaActiva === 'admin' && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 w-8 h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                />
              )}
              <SlidersHorizontal
                className="w-5 h-5 mb-0.5"
                strokeWidth={vistaActiva === 'admin' ? 2.4 : 1.9}
              />
              <span className="text-[10px] font-bold tracking-tight whitespace-nowrap truncate">
                Comisión
              </span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

