import React, { useState } from 'react';
import {
  MovimientoCaja,
  TipoMovimiento,
  CategoriaMovimiento,
  MetodoPago
} from '../types';
import { formatearMoneda } from '../utils/turnosLogic';
import { calcularBalanceCaja, filtrarMovimientosPorFecha } from '../utils/cantinaLogic';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  Banknote
} from 'lucide-react';

interface AdminCajaSectionProps {
  movimientosCaja: MovimientoCaja[];
  setMovimientosCaja: React.Dispatch<React.SetStateAction<MovimientoCaja[]>>;
  onNotificar: (msg: string) => void;
  onSolicitarConfirmacion: (cfg: {
    titulo: string;
    mensaje: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void;
  }) => void;
  onAgregarMovimiento?: (mov: MovimientoCaja) => Promise<void>;
  onEliminarMovimiento?: (mov: MovimientoCaja) => Promise<void>;
}

export const AdminCajaSection: React.FC<AdminCajaSectionProps> = ({
  movimientosCaja,
  setMovimientosCaja,
  onNotificar,
  onSolicitarConfirmacion,
  onAgregarMovimiento,
  onEliminarMovimiento,
}) => {
  const hoyStr = new Date().toISOString().split('T')[0];
  const [filtroFecha, setFiltroFecha] = useState<string>(hoyStr);
  const [tipoFiltroMov, setTipoFiltroMov] = useState<'todos' | 'ingreso' | 'egreso'>('todos');

  // Formulario de movimiento manual
  const [tipoMov, setTipoMov] = useState<TipoMovimiento>('egreso');
  const [catMov, setCatMov] = useState<CategoriaMovimiento>('proveedor');
  const [descMov, setDescMov] = useState('');
  const [montoMov, setMontoMov] = useState('');
  const [metodoMov, setMetodoMov] = useState<MetodoPago>('efectivo');

  const movsPorFecha = filtrarMovimientosPorFecha(
    movimientosCaja,
    filtroFecha === 'todas' ? 'todas' : filtroFecha
  );
  const balance = calcularBalanceCaja(movsPorFecha);

  const movsVisibles = movsPorFecha.filter(
    (m) => tipoFiltroMov === 'todos' || m.tipo === tipoFiltroMov
  );

  const handleAgregarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(montoMov);
    if (!descMov.trim() || isNaN(montoNum) || montoNum <= 0) {
      onNotificar('Completa descripción y un monto válido mayor a 0');
      return;
    }

    const ahora = new Date();
    const nuevo: MovimientoCaja = {
      id: `mov-${Date.now()}`,
      fecha: filtroFecha === 'todas' ? hoyStr : filtroFecha,
      hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      tipo: tipoMov,
      categoria: catMov,
      descripcion: descMov.trim(),
      monto: montoNum,
      metodoPago: metodoMov,
    };

    if (onAgregarMovimiento) {
      await onAgregarMovimiento(nuevo);
    } else {
      setMovimientosCaja((prev) => [nuevo, ...prev]);
      onNotificar(
        `${tipoMov === 'ingreso' ? 'Ingreso' : 'Egreso'} de ${formatearMoneda(montoNum)} registrado en Caja`
      );
    }
    setDescMov('');
    setMontoMov('');
  };

  const handleEliminarMov = (mov: MovimientoCaja) => {
    onSolicitarConfirmacion({
      titulo: 'Eliminar Movimiento de Caja',
      mensaje: `¿Eliminar "${mov.descripcion}" por ${formatearMoneda(mov.monto)}?`,
      confirmLabel: 'Sí, eliminar',
      variant: 'danger',
      onConfirm: async () => {
        if (onEliminarMovimiento) {
          await onEliminarMovimiento(mov);
        } else {
          setMovimientosCaja((prev) => prev.filter((m) => m.id !== mov.id));
          onNotificar('Movimiento eliminado de caja');
        }
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Encabezado y Filtro de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Caja Diaria, Arqueo & Egresos</span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Controla ingresos de cancha y cantina, pagos a proveedores y saldo real en efectivo o transferencia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setFiltroFecha(hoyStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filtroFecha === hoyStr
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setFiltroFecha('todas')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filtroFecha === 'todas'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            Historial Completo
          </button>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={filtroFecha === 'todas' ? hoyStr : filtroFecha}
              onChange={(e) => {
                if (e.target.value) setFiltroFecha(e.target.value);
              }}
              aria-label="Filtrar caja por fecha"
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* KPIs de Caja */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Balance Neto
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-1">
            {formatearMoneda(balance.balanceNeto)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            Cancha {formatearMoneda(balance.ingresosCancha)} · Cantina {formatearMoneda(balance.ingresosCantina)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            <span>Efectivo en Caja</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            {formatearMoneda(balance.efectivoCaja)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Arqueo físico</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <CreditCard className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span>Transferencias</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums mt-1">
            {formatearMoneda(balance.digitalCaja)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cuenta bancaria</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Ingresos / Egresos
          </div>
          <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums mt-1">
            + {formatearMoneda(balance.totalIngresos)}
          </div>
          <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
            - {formatearMoneda(balance.totalEgresos)}
          </div>
        </div>
      </div>

      {/* Formulario Registrar Ingreso o Egreso Manual */}
      <form
        onSubmit={handleAgregarMovimiento}
        className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
      >
        <div className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
          Registrar Movimiento Manual (Gastos, Proveedores, Reposición o Fondo Inicial)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Tipo:</label>
            <select
              value={tipoMov}
              onChange={(e) => {
                const v = e.target.value as TipoMovimiento;
                setTipoMov(v);
                setCatMov(v === 'egreso' ? 'proveedor' : 'otro');
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-bold text-slate-900 dark:text-white"
            >
              <option value="egreso">Egreso / Gasto (-)</option>
              <option value="ingreso">Ingreso Extra (+)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Categoría:</label>
            <select
              value={catMov}
              onChange={(e) => setCatMov(e.target.value as CategoriaMovimiento)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 font-medium text-slate-900 dark:text-white"
            >
              <option value="proveedor">Proveedor / Mercadería</option>
              <option value="insumos">Insumos / Limpieza / Hielo</option>
              <option value="mantenimiento">Mantenimiento Cancha</option>
              <option value="cancha">Alquiler Cancha</option>
              <option value="cantina">Cantina</option>
              <option value="cuota_socio">Cuota Socio</option>
              <option value="otro">Otro / Fondo Caja</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Descripción:</label>
            <input
              type="text"
              required
              placeholder="Ej: Compra de hielo y gaseosas"
              value={descMov}
              onChange={(e) => setDescMov(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Monto ($):</label>
            <input
              type="number"
              required
              min="1"
              placeholder="5000"
              value={montoMov}
              onChange={(e) => setMontoMov(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-extrabold tabular-nums text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600 dark:text-slate-400">Medio:</span>
            <button
              type="button"
              onClick={() => setMetodoMov('efectivo')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                metodoMov === 'efectivo'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Efectivo
            </button>
            <button
              type="button"
              onClick={() => setMetodoMov('transferencia')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                metodoMov === 'transferencia'
                  ? 'bg-slate-800 text-white dark:bg-slate-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Transferencia
            </button>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar en Caja</span>
          </button>
        </div>
      </form>

      {/* Listado de Movimientos */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
            Movimientos ({movsVisibles.length})
          </span>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 text-[11px] font-bold">
            {(['todos', 'ingreso', 'egreso'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoFiltroMov(t)}
                className={`px-2.5 py-1 rounded-md capitalize transition cursor-pointer ${
                  tipoFiltroMov === t
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {movsVisibles.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No hay movimientos registrados para esta fecha o filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Fecha / Hora</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Medio</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {movsVisibles.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 text-slate-500 tabular-nums whitespace-nowrap">
                      {m.fecha} · {m.hora}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                      <span className="inline-flex items-center gap-1.5">
                        {m.tipo === 'ingreso' ? (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <span>{m.descripcion}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 capitalize">
                      {m.categoria.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 capitalize">
                      {m.metodoPago}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-extrabold tabular-nums whitespace-nowrap ${
                        m.tipo === 'ingreso'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {m.tipo === 'ingreso' ? '+' : '-'} {formatearMoneda(m.monto)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleEliminarMov(m)}
                        aria-label={`Eliminar movimiento ${m.descripcion}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
