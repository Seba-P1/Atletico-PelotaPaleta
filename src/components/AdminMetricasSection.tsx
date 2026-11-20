import React, { useState } from 'react';
import {
  ConsumoIndividual,
  HorarioConfig,
  MovimientoCaja,
  Turno,
} from '../types';
import { calcularMetricasDiarias } from '../utils/metricsLogic';
import { formatearMoneda, obtenerFechaHoraArgentina } from '../utils/turnosLogic';
import {
  BarChart3,
  Banknote,
  CreditCard,
  Clock,
  Coffee,
  Users,
  ShieldCheck,
  CalendarDays,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

interface AdminMetricasSectionProps {
  turnos: Record<string, Turno>;
  consumos: ConsumoIndividual[];
  movimientosCaja: MovimientoCaja[];
  horarios: HorarioConfig[];
  fechaInicial?: string;
}

export const AdminMetricasSection: React.FC<AdminMetricasSectionProps> = ({
  turnos,
  consumos,
  movimientosCaja,
  horarios,
  fechaInicial,
}) => {
  const hoyAr = obtenerFechaHoraArgentina().fechaIso;
  const [fechaFiltro, setFechaFiltro] = useState<string>(fechaInicial || hoyAr);

  const m = calcularMetricasDiarias({
    fecha: fechaFiltro,
    turnos,
    consumos,
    movimientosCaja,
    horarios,
  });

  const esHoy = fechaFiltro === hoyAr;

  return (
    <div className="space-y-5">
      {/* Header + Selector de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <BarChart3 className="w-4 h-4" />
            <span>EXCLUSIVO COMISIÓN DIRECTIVA</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-display mt-0.5">
            Métricas Diarias, Desglose y Control de Cantina
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Ingresos de Cancha, Cantina y Mensualidades discriminados por Efectivo y Alias Mercado Pago, horarios, pelotaris y actividad registrada.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            aria-label="Seleccionar fecha de métricas"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value || hoyAr)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white tabular-nums"
          />
          {!esHoy && (
            <button
              type="button"
              onClick={() => setFechaFiltro(hoyAr)}
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold cursor-pointer transition"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* KPIs Principales del Día */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Total Cobrado</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-1">
            {formatearMoneda(m.ingresosTotales)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            Neto (con egresos):{' '}
            <strong className={m.balanceNeto >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}>
              {formatearMoneda(m.balanceNeto)}
            </strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            <span>Efectivo</span>
            <Banknote className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums mt-1">
            {formatearMoneda(m.porMetodo.efectivo)}
          </div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">
            Caja física del día
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <span>Alias Mercado Pago</span>
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-1">
            {formatearMoneda(m.porMetodo.transferencia)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Transferencias informadas
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            <span>Pendiente / Fiado</span>
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-900 dark:text-amber-200 tabular-nums mt-1">
            {formatearMoneda(m.porMetodo.cuentaCorrientePendiente)}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
            Turnos + cantina por cobrar
          </div>
        </div>
      </div>

      {/* Desglose por Rubro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Turnos / Cancha
            </span>
            <span className="text-[11px] font-bold text-slate-500 tabular-nums">
              {m.turnos.cantidadOcupados} ocupados ({m.turnos.cantidadPagados} pagos)
            </span>
          </div>
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500">Efectivo:</span>
              <strong className="text-slate-900 dark:text-white">{formatearMoneda(m.turnos.efectivo)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Alias Mercado Pago:</span>
              <strong className="text-slate-900 dark:text-white">{formatearMoneda(m.turnos.transferencia)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600 dark:text-amber-400">Sin cobrar aún:</span>
              <strong className="text-amber-700 dark:text-amber-300">{formatearMoneda(m.turnos.pendienteOCtaCte)}</strong>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Coffee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Cantina & Invitados
            </span>
            <span className="text-[11px] font-bold text-slate-500 tabular-nums">
              {m.cantina.cantidad} reg. ({m.cantina.invitadosCantidad} inv.)
            </span>
          </div>
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500">Efectivo:</span>
              <strong className="text-slate-900 dark:text-white">{formatearMoneda(m.cantina.efectivo)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Alias Mercado Pago:</span>
              <strong className="text-slate-900 dark:text-white">{formatearMoneda(m.cantina.transferencia)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-600 dark:text-amber-400">Pendiente en cta. cte.:</span>
              <strong className="text-amber-700 dark:text-amber-300">{formatearMoneda(m.cantina.pendienteOCtaCte)}</strong>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Mensualidades / Seguro
            </span>
            <span className="text-[11px] font-bold text-slate-500 tabular-nums">
              {m.mensualidades.cantidad} cuotas
            </span>
          </div>
          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800 tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500">Efectivo:</span>
              <strong className="text-slate-900 dark:text-white">{formatearMoneda(m.mensualidades.efectivo)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Alias Mercado Pago:</span>
              <strong className="text-slate-900 dark:text-white">{formatearMoneda(m.mensualidades.transferencia)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total cuotas del día:</span>
              <strong className="text-emerald-700 dark:text-emerald-400">{formatearMoneda(m.mensualidades.total)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Auditoría por Operador (Qué hizo la Cantinera y Comisión) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-display">
              Control de Operación (Cantinera & Comisión Directiva)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">Fecha: {fechaFiltro}</span>
        </div>

        {m.resumenPorOperador.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No se registraron movimientos ni turnos en la fecha seleccionada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Operador / Usuario</th>
                  <th className="px-4 py-2.5 text-center">Turnos Gestionados</th>
                  <th className="px-4 py-2.5 text-center">Consumos Cantina</th>
                  <th className="px-4 py-2.5 text-right">Cobros Gestionados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {m.resumenPorOperador.map((op) => (
                  <tr key={op.operador} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{op.operador}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums">{op.accionesTurnos}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums">{op.accionesCantina}</td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatearMoneda(op.totalGestionado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Turnos Hora por Hora con Nombres */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-display">
              Detalle de Turnos del Día ({m.detalleTurnosDia.length})
            </h4>
          </div>
        </div>

        {m.detalleTurnosDia.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No hubo turnos reservados en la fecha {fechaFiltro}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Horario</th>
                  <th className="px-4 py-2.5">Pelotaris en Cancha</th>
                  <th className="px-4 py-2.5">Registrado por</th>
                  <th className="px-4 py-2.5 text-right">Estado / Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {m.detalleTurnosDia.map((t) => (
                  <tr key={t.turnoId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-extrabold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">
                      {t.horaEtiqueta}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {t.jugadores.length > 0 ? t.jugadores.join(' · ') : t.organizador}
                      </div>
                      {t.notas && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {t.notas}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {t.registradoPor}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {formatearMoneda(t.costoTotal)}
                      </div>
                      <div
                        className={`text-[10px] font-bold ${
                          t.pagado
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {t.pagado
                          ? t.metodoPago === 'transferencia'
                            ? 'Pagó Alias MP'
                            : 'Pagó Efectivo'
                          : 'Pendiente'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Consumos de Cantina del Día */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-display">
              Movimientos de Cantina del Día ({m.detalleCantinaDia.length})
            </h4>
          </div>
        </div>

        {m.detalleCantinaDia.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Sin consumos de cantina cargados en {fechaFiltro}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Hora</th>
                  <th className="px-4 py-2.5">Persona</th>
                  <th className="px-4 py-2.5">Detalle</th>
                  <th className="px-4 py-2.5">Cargado por</th>
                  <th className="px-4 py-2.5 text-right">Estado / Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {m.detalleCantinaDia.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 text-slate-500 tabular-nums whitespace-nowrap">
                      {c.hora} hs
                    </td>
                    <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                      {c.personaNombre}
                      {c.esInvitado && (
                        <span className="ml-1.5 text-[10px] uppercase text-emerald-700 dark:text-emerald-400 font-extrabold">
                          · Invitado
                        </span>
                      )}
                      {c.observacionInvitado && (
                        <div className="text-[10px] font-normal text-slate-500">
                          {c.observacionInvitado}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300">{c.detalle}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{c.registradoPor}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                      <div className="font-extrabold text-slate-900 dark:text-white">
                        {formatearMoneda(c.monto)}
                      </div>
                      <div
                        className={`text-[10px] font-bold ${
                          c.pagado
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {c.pagado
                          ? c.metodoPago === 'transferencia'
                            ? 'Pagó Alias MP'
                            : 'Pagó Efectivo'
                          : 'Pendiente'}
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
