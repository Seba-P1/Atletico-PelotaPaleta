import React, { useEffect } from 'react';
import { AdminSeccionId } from '../types';
import { X, Check, ChevronRight } from 'lucide-react';

export interface AdminMenuOption {
  id: AdminSeccionId;
  label: string;
  icono: React.ReactNode;
  badge: string;
  desc: string;
}

interface AdminBottomSheetProps {
  open: boolean;
  opciones: AdminMenuOption[];
  seccionActiva: AdminSeccionId;
  onSeleccionar: (id: AdminSeccionId) => void;
  onCerrar: () => void;
}

export const AdminBottomSheet: React.FC<AdminBottomSheetProps> = ({
  open,
  opciones,
  seccionActiva,
  onSeleccionar,
  onCerrar,
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCerrar();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onCerrar]);

  if (!open) return null;

  return (
    <div
      className="lg:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label="Secciones de administración"
    >
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white dark:bg-slate-900 border-t border-x border-slate-200 dark:border-slate-800 shadow-2xl animate-sheet-up flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle & Header */}
        <div className="pt-2.5 pb-3 px-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div
            aria-hidden="true"
            className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3"
          />
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-display">
                Panel de Administración
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Elige el módulo que quieres gestionar
              </p>
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar menú administrativo"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Interactive Tap Rows */}
        <div className="overflow-y-auto px-3 py-2 divide-y divide-slate-100 dark:divide-slate-800/80 pb-safe-nav">
          {opciones.map((opc) => {
            const activa = seccionActiva === opc.id;
            return (
              <button
                key={opc.id}
                type="button"
                onClick={() => {
                  onSeleccionar(opc.id);
                  onCerrar();
                }}
                className={`w-full min-h-[58px] flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors rounded-xl my-0.5 cursor-pointer ${
                  activa
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100'
                    : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      activa
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {opc.icono}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold font-display truncate">
                      {opc.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {opc.desc}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                    {opc.badge}
                  </span>
                  {activa ? (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
