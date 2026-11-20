import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check, Laptop } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-1 rounded-lg">
        <Check className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Instalada</span>
      </span>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 sm:px-3 py-1.5 text-xs shadow-2xs transition whitespace-nowrap shrink-0 cursor-pointer"
        title="Instalar aplicación en tu celular o PC"
      >
        <Download className="w-3.5 h-3.5 text-white" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowGuide(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 transition whitespace-nowrap shrink-0 cursor-pointer"
        title="Instalar / Descargar aplicación como App nativa"
      >
        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-display">
                  Instalar como App Nativa
                </h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
              {isIOS ? (
                <>
                  <p className="font-semibold text-slate-900 dark:text-white">Para iPhone / iPad (Safari):</p>
                  <p>1. Pulsa el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra inferior de Safari.</p>
                  <p>2. Desliza hacia abajo y toca <strong>«Agregar a Inicio»</strong>.</p>
                  <p>3. Pulsa <strong>Agregar</strong> en la esquina superior.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-900 dark:text-white">Para Celulares Android o Navegador:</p>
                  <p>1. Toca el menú de tres puntos <strong>(⋮)</strong> en la esquina superior de Chrome o tu navegador.</p>
                  <p>2. Selecciona la opción <strong>«Instalar aplicación»</strong> o <strong>«Agregar a la pantalla principal»</strong>.</p>
                  <p>3. ¡Listo! Podrás abrirla directamente desde el ícono en tu pantalla de inicio como una app nativa.</p>
                </>
              )}
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
