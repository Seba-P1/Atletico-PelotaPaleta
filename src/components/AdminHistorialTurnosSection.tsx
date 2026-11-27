import React, { useState } from 'react';
import { HorarioConfig, Turno } from '../types';
import { filtrarHistorialTurnos } from '../utils/metricsLogic';
import { formatearMoneda } from '../utils/turnosLogic';
import {
  History,
  Search,
  RefreshCw,
  Loader2,
  CalendarDays,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface AdminHistorialTurnosSectionProps {
  turnos: Record<string, Turno>;
  horarios: HorarioConfig[];
  supabaseActivo?: boolean;
  onCargarHistorialCompleto?: () => Promise<void>;
}

export const AdminHistorialTurnosSection: React.FC<AdminHistorialTurnosSectionProps> = ({
  turnos,
  horarios,
  supabaseActivo = false,
  onCargarHistorialCompleto,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [soloPagos, setSoloPagos] = useState<'todos' | 'pagados' | 'pendientes'>('todos');
  const [sincronizando, setSincronizando] = useState(false);

  const filas = filtrarHistorialTurnos(turnos, horarios, {
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
    busqueda,
    soloPagos,
  });

  const handleSincronizar = async () => {
    if (!onCargarHistorialCompleto) return;
    setSincronizando(true);
    try {
      await onCargarHistorialCompleto();
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <History className="w-4 h-4" />
            <span>ARCHIVO HISTÓRICO DE PARTIDOS</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-display mt-0.5">
            Historial de Turnos Jugados ({filas.length})
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Registro completo de días, horarios, pelotaris, observaciones de invitados, estado de cobro y quién gestionó cada turno.
          </p>
        </div>

        {supabaseActivo && onCargarHistorialCompleto && (
          <button
            type="button"
            disabled={sincronizando}
            onClick={handleSincronizar}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
          >
            {sincronizando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{sincronizando ? 'Cargando...' : 'Cargar Historial Completo'}</span>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar pelotari, organizador, invitado u operador..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <input
              type="date"
              aria-label="Fecha desde"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white tabular-nums"
            />
          </div>

          <div>
            <input
              type="date"
              aria-label="Fecha hasta"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white tabular-nums"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {(['todos', 'pagados', 'pendientes'] as const).map((est) => (
              <button
                key={est}
                type="button"
                onClick={() => setSoloPagos(est)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                  soloPagos === est
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {est === 'todos' ? 'Todos' : est === 'pagados' ? 'Pagados' : 'Pendientes'}
              </button>
            ))}
          </div>

          {(fechaDesde || fechaHasta || busqueda) && (
            <button
              type="button"
              onClick={() => {
                setBusqueda('');
                setFechaDesde('');
                setFechaHasta('');
                setSoloPagos('todos');
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Historial */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {filas.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <CalendarDays className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              No hay turnos registrados para mostrar con estos filtros.
            </p>
            <p className="text-[11px]">
              Cada turno que se reserva y se juega queda guardado automáticamente con fecha, horario y participantes.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Fecha y Horario</th>
                  <th className="px-4 py-3">Pelotaris</th>
                  <th className="px-4 py-3">Organizador / Observaciones</th>
                  <th className="px-4 py-3">Gestionado por</th>
                  <th className="px-4 py-3 text-right">Importe / Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filas.map((f) => (
                  <tr key={f.turnoId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {f.fecha}
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
                        {f.horaEtiqueta}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {f.jugadores.length > 0 ? f.jugadores.join(' · ') : 'Sin detalle'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 dark:text-slate-300 font-medium">
                        {f.organizador}
                      </div>
                      {f.notas && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {f.notas}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {f.registradoPor}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {f.costoTotal === 0 ? 'Sin cargo ($0)' : formatearMoneda(f.costoTotal)}
                      </div>
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold">
                        {f.costoTotal === 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            Bonificado (Socios)
                          </span>
                        ) : f.pagado ? (
                          <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            {f.metodoPago === 'transferencia' ? 'Alias MP' : 'Efectivo'}
                          </span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-300 inline-flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            Pendiente
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
