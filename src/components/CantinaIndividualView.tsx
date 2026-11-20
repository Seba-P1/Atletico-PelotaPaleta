import React, { useState } from 'react';
import {
  ConsumoIndividual,
  Jugador,
  ProductoCantina,
  MovimientoCaja,
  MetodoPago,
  ProductoUsadoConsumo,
  ClubConfig,
  RolAcceso,
} from '../types';
import { formatearMoneda } from '../utils/turnosLogic';
import {
  calcularResumenConsumos,
  generarMensajeWhatsAppConsumoIndividual,
  descontarStockConsumoIndividual,
  aplicarDeltaCuentaCorriente
} from '../utils/cantinaLogic';
import {
  evaluarEstadoFinancieroJugador,
  formatearPeriodoMes,
  resolverUltimoMesAlMarcarNoPago,
} from '../utils/billingLogic';
import {
  ReceiptText,
  Plus,
  CheckCircle2,
  Clock,
  Share2,
  Trash2,
  Search,
  RotateCcw,
  AlertCircle,
  CalendarCheck2,
  UserPlus,
} from 'lucide-react';

interface CantinaIndividualViewProps {
  consumos: ConsumoIndividual[];
  setConsumos: React.Dispatch<React.SetStateAction<ConsumoIndividual[]>>;
  jugadores: Jugador[];
  setJugadores: React.Dispatch<React.SetStateAction<Jugador[]>>;
  productos: ProductoCantina[];
  setProductos: React.Dispatch<React.SetStateAction<ProductoCantina[]>>;
  movimientosCaja: MovimientoCaja[];
  setMovimientosCaja: React.Dispatch<React.SetStateAction<MovimientoCaja[]>>;
  modoMesasActivo: boolean;
  esAdmin: boolean;
  rolAcceso?: RolAcceso;
  operadorNombre?: string;
  clientePreseleccionado?: string | null;
  clubConfig?: ClubConfig;
  onNotificar: (msg: string) => void;
  onSolicitarConfirmacion: (cfg: {
    titulo: string;
    mensaje: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void;
  }) => void;
  onRegistrarConsumo?: (params: {
    socioNombre: string;
    socioId?: number;
    detalle: string;
    monto: number;
    pagado: boolean;
    metodoPago?: MetodoPago;
    mesa?: string;
    productosUsados: ProductoUsadoConsumo[];
    esInvitado?: boolean;
    observacionInvitado?: string;
  }) => Promise<boolean>;
  onCobrarConsumo?: (consumo: ConsumoIndividual, metodo: MetodoPago) => Promise<void>;
  onEliminarConsumo?: (consumo: ConsumoIndividual) => Promise<void>;
  onRegistrarPagoMensualidadSocio?: (
    j: Jugador,
    mesPago: string,
    monto: number,
    metodo: MetodoPago,
    desbloquear: boolean
  ) => Promise<void>;
  onMarcarMensualidadNoPagaSocio?: (j: Jugador, mesActual: string) => Promise<void>;
}

export const CantinaIndividualView: React.FC<CantinaIndividualViewProps> = ({
  consumos,
  setConsumos,
  jugadores,
  setJugadores,
  productos,
  setProductos,
  setMovimientosCaja,
  modoMesasActivo,
  esAdmin,
  rolAcceso,
  operadorNombre,
  clientePreseleccionado,
  clubConfig,
  onNotificar,
  onSolicitarConfirmacion,
  onRegistrarConsumo,
  onCobrarConsumo,
  onEliminarConsumo,
  onRegistrarPagoMensualidadSocio,
  onMarcarMensualidadNoPagaSocio,
}) => {
  const esSuperAdmin = rolAcceso ? rolAcceso === 'super_admin' : esAdmin;

  const [modoInvitado, setModoInvitado] = useState<boolean>(false);
  const [socioSeleccionado, setSocioSeleccionado] = useState<string>(
    clientePreseleccionado || jugadores[0]?.nombre || ''
  );
  const [nombreInvitado, setNombreInvitado] = useState<string>('');
  const [observacionInvitado, setObservacionInvitado] = useState<string>('');
  const [detalleConsumo, setDetalleConsumo] = useState<string>('');
  const [montoConsumo, setMontoConsumo] = useState<string>('');
  const [mesaOpcional, setMesaOpcional] = useState<string>('');
  const [pagadoInmediato, setPagadoInmediato] = useState<boolean>(false);
  const [metodoPagoInmediato, setMetodoPagoInmediato] = useState<MetodoPago>('efectivo');
  const [productosUsados, setProductosUsados] = useState<ProductoUsadoConsumo[]>([]);
  const [errorForm, setErrorForm] = useState<string>('');

  // Filtros
  const [filtroTab, setFiltroTab] = useState<'pendientes' | 'pagados' | 'todos'>('pendientes');
  const [busquedaSocio, setBusquedaSocio] = useState<string>('');

  // Modal para confirmar cobro de un pendiente
  const [consumoACobrar, setConsumoACobrar] = useState<ConsumoIndividual | null>(null);
  const [metodoCobroModal, setMetodoCobroModal] = useState<MetodoPago>('efectivo');

  // Control rápido de mensualidad / seguro desde Cantina (solo Comisión Directiva / Super Admin edita; Cantinero solo ve info)
  const [panelPagoSeguroAbierto, setPanelPagoSeguroAbierto] = useState<boolean>(false);
  const [metodoPagoSeguro, setMetodoPagoSeguro] = useState<MetodoPago>('transferencia');
  const [montoPagoSeguro, setMontoPagoSeguro] = useState<string>(
    String(clubConfig?.montoMensualidad ?? 15000)
  );

  const resumen = calcularResumenConsumos(consumos);
  const productosPopulares = productos.slice(0, 8);

  const jugadorActual = !modoInvitado
    ? jugadores.find(
        (j) => j.nombre.trim().toLowerCase() === socioSeleccionado.trim().toLowerCase()
      )
    : undefined;
  const estadoSeguroActual = jugadorActual
    ? evaluarEstadoFinancieroJugador(jugadorActual, { clubConfig })
    : null;

  const confirmarPagoSeguroDesdeCantina = async () => {
    if (!jugadorActual || !estadoSeguroActual) return;
    const montoNum = Math.max(0, parseFloat(montoPagoSeguro) || 0);
    const mes = estadoSeguroActual.mesActual;

    if (onRegistrarPagoMensualidadSocio) {
      await onRegistrarPagoMensualidadSocio(
        jugadorActual,
        mes,
        montoNum,
        metodoPagoSeguro,
        Boolean(jugadorActual.bloqueadoTurnos)
      );
      setPanelPagoSeguroAbierto(false);
      return;
    }

    setJugadores((prev) =>
      prev.map((j) =>
        j.id === jugadorActual.id
          ? {
              ...j,
              ultimoMesPago: mes,
              bloqueadoTurnos: false,
              motivoBloqueo: undefined,
            }
          : j
      )
    );
    if (montoNum > 0) {
      const ahora = new Date();
      setMovimientosCaja((prev) => [
        {
          id: `mov-cuota-${Date.now()}`,
          fecha: ahora.toISOString().split('T')[0],
          hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          tipo: 'ingreso',
          categoria: 'cuota_socio',
          descripcion: `Mensualidad / Seguro ${formatearPeriodoMes(mes)} (${jugadorActual.nombre})`,
          monto: montoNum,
          metodoPago: metodoPagoSeguro,
        },
        ...prev,
      ]);
    }
    setPanelPagoSeguroAbierto(false);
    onNotificar(
      `Mensualidad / seguro (${formatearPeriodoMes(mes)}) informada como PAGA para ${jugadorActual.nombre}`
    );
  };

  const informarNoPagoSeguroDesdeCantina = async () => {
    if (!jugadorActual || !estadoSeguroActual) return;
    const mes = estadoSeguroActual.mesActual;

    if (onMarcarMensualidadNoPagaSocio) {
      await onMarcarMensualidadNoPagaSocio(jugadorActual, mes);
      return;
    }

    const nuevoUltimoMes = resolverUltimoMesAlMarcarNoPago(jugadorActual.ultimoMesPago, mes);
    setJugadores((prev) =>
      prev.map((j) =>
        j.id === jugadorActual.id ? { ...j, ultimoMesPago: nuevoUltimoMes } : j
      )
    );
    onNotificar(
      `Mensualidad / seguro (${formatearPeriodoMes(mes)}) informada como NO PAGA para ${jugadorActual.nombre}`
    );
  };

  const agregarProductoAlDetalle = (prod: ProductoCantina) => {
    setErrorForm('');
    const detalleActual = detalleConsumo.trim();
    if (detalleActual) {
      setDetalleConsumo(`${detalleActual} + 1 ${prod.nombre}`);
    } else {
      setDetalleConsumo(`1 ${prod.nombre}`);
    }

    const montoActual = parseFloat(montoConsumo) || 0;
    setMontoConsumo((montoActual + prod.precio).toString());

    setProductosUsados((prev) => {
      const existe = prev.find((i) => i.productoId === prod.id);
      if (existe) {
        return prev.map((i) =>
          i.productoId === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { productoId: prod.id, nombre: prod.nombre, cantidad: 1, precio: prod.precio }];
    });
  };

  const limpiarSeleccionRapida = () => {
    setDetalleConsumo('');
    setMontoConsumo('');
    setProductosUsados([]);
  };

  const handleRegistrarConsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorForm('');

    const destinatario = modoInvitado ? nombreInvitado.trim() : socioSeleccionado.trim();
    if (!destinatario) {
      setErrorForm(
        modoInvitado
          ? 'Ingresa el nombre del invitado no registrado.'
          : 'Selecciona o escribe el nombre del pelotari.'
      );
      return;
    }
    if (!detalleConsumo.trim()) {
      setErrorForm('Ingresa qué consumió la persona.');
      return;
    }
    const montoNum = parseFloat(montoConsumo);
    if (isNaN(montoNum) || montoNum <= 0) {
      setErrorForm('Ingresa un monto válido mayor a 0.');
      return;
    }

    const socioIdMatch = modoInvitado ? undefined : jugadorActual?.id;
    const obsInvClean = modoInvitado ? observacionInvitado.trim() || undefined : undefined;

    if (onRegistrarConsumo) {
      const ok = await onRegistrarConsumo({
        socioNombre: destinatario,
        socioId: socioIdMatch,
        detalle: detalleConsumo.trim(),
        monto: montoNum,
        pagado: pagadoInmediato,
        metodoPago: pagadoInmediato ? metodoPagoInmediato : undefined,
        mesa: modoMesasActivo ? mesaOpcional.trim() || undefined : undefined,
        productosUsados,
        esInvitado: modoInvitado,
        observacionInvitado: obsInvClean,
      });
      if (ok) {
        setDetalleConsumo('');
        setMontoConsumo('');
        setMesaOpcional('');
        setPagadoInmediato(false);
        setProductosUsados([]);
        if (modoInvitado) {
          setNombreInvitado('');
          setObservacionInvitado('');
        }
      }
      return;
    }

    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const nuevoConsumo: ConsumoIndividual = {
      id: `cons-${Date.now()}`,
      fecha,
      hora,
      socioNombre: destinatario,
      socioId: socioIdMatch,
      detalle: detalleConsumo.trim(),
      monto: montoNum,
      pagado: pagadoInmediato,
      metodoPago: pagadoInmediato ? metodoPagoInmediato : undefined,
      fechaCobro: pagadoInmediato ? `${fecha} ${hora}` : undefined,
      mesa: modoMesasActivo ? mesaOpcional.trim() || undefined : undefined,
      productosUsados: productosUsados.length > 0 ? productosUsados : undefined,
      esInvitado: modoInvitado,
      observacionInvitado: obsInvClean,
      registradoPor: operadorNombre || (esSuperAdmin ? 'Comisión Directiva' : 'Cantina'),
    };

    setConsumos((prev) => [nuevoConsumo, ...prev]);

    if (productosUsados.length > 0) {
      const { inventarioActualizado, alertasStockBajo } = descontarStockConsumoIndividual(
        productos,
        productosUsados
      );
      setProductos(inventarioActualizado);
      if (alertasStockBajo.length > 0) {
        onNotificar(alertasStockBajo[0]);
      }
    }

    if (pagadoInmediato) {
      const nuevoMov: MovimientoCaja = {
        id: `mov-${Date.now()}`,
        fecha,
        hora,
        tipo: 'ingreso',
        categoria: 'cantina',
        descripcion: `Cantina ${modoInvitado ? '(Invitado)' : ''}: ${destinatario} (${detalleConsumo.trim()})`,
        monto: montoNum,
        metodoPago: metodoPagoInmediato,
        comandaId: nuevoConsumo.id,
        registradoPor: operadorNombre || (esSuperAdmin ? 'Comisión Directiva' : 'Cantina'),
      };
      setMovimientosCaja((prev) => [nuevoMov, ...prev]);
    } else if (!modoInvitado) {
      setJugadores((prev) =>
        aplicarDeltaCuentaCorriente(prev, socioIdMatch, destinatario, -montoNum)
      );
    }

    setDetalleConsumo('');
    setMontoConsumo('');
    setMesaOpcional('');
    setPagadoInmediato(false);
    setProductosUsados([]);
    if (modoInvitado) {
      setNombreInvitado('');
      setObservacionInvitado('');
    }

    onNotificar(
      pagadoInmediato
        ? `Consumo de ${formatearMoneda(montoNum)} cobrado a ${destinatario}`
        : `Consumo de ${formatearMoneda(montoNum)} anotado a ${modoInvitado ? 'invitado' : 'cuenta de'} ${destinatario}`
    );
  };

  const confirmarCobro = async () => {
    if (!consumoACobrar) return;

    if (onCobrarConsumo) {
      await onCobrarConsumo(consumoACobrar, metodoCobroModal);
      setConsumoACobrar(null);
      return;
    }

    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    setConsumos((prev) =>
      prev.map((c) =>
        c.id === consumoACobrar.id
          ? {
              ...c,
              pagado: true,
              metodoPago: metodoCobroModal,
              fechaCobro: `${fecha} ${hora}`,
            }
          : c
      )
    );

    setJugadores((prev) =>
      aplicarDeltaCuentaCorriente(
        prev,
        consumoACobrar.socioId,
        consumoACobrar.socioNombre,
        consumoACobrar.monto
      )
    );

    const nuevoMov: MovimientoCaja = {
      id: `mov-${Date.now()}`,
      fecha,
      hora,
      tipo: 'ingreso',
      categoria: 'cantina',
      descripcion: `Cobro consumo pendiente: ${consumoACobrar.socioNombre} (${consumoACobrar.detalle})`,
      monto: consumoACobrar.monto,
      metodoPago: metodoCobroModal,
      comandaId: consumoACobrar.id,
      registradoPor: operadorNombre || (esSuperAdmin ? 'Comisión Directiva' : 'Cantina'),
    };
    setMovimientosCaja((prev) => [nuevoMov, ...prev]);

    onNotificar(`Cobro de ${formatearMoneda(consumoACobrar.monto)} registrado en Caja`);
    setConsumoACobrar(null);
  };

  const eliminarConsumo = (item: ConsumoIndividual) => {
    onSolicitarConfirmacion({
      titulo: 'Eliminar Consumo',
      mensaje: `¿Eliminar el consumo de ${item.socioNombre} (${formatearMoneda(item.monto)})?`,
      confirmLabel: 'Sí, eliminar',
      variant: 'danger',
      onConfirm: async () => {
        if (onEliminarConsumo) {
          await onEliminarConsumo(item);
          return;
        }
        setConsumos((prev) => prev.filter((c) => c.id !== item.id));
        if (!item.pagado) {
          setJugadores((prev) =>
            aplicarDeltaCuentaCorriente(prev, item.socioId, item.socioNombre, item.monto)
          );
        }
        onNotificar('Registro de consumo eliminado');
      },
    });
  };

  const consumosFiltrados = consumos.filter((c) => {
    const matchTab =
      filtroTab === 'todos' ||
      (filtroTab === 'pendientes' && !c.pagado) ||
      (filtroTab === 'pagados' && c.pagado);

    const matchBusqueda =
      !busquedaSocio ||
      c.socioNombre.toLowerCase().includes(busquedaSocio.toLowerCase()) ||
      c.detalle.toLowerCase().includes(busquedaSocio.toLowerCase());

    return matchTab && matchBusqueda;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Minimalista Verde CARC */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
            <span>BUFFET & CANTINA</span>
            <span aria-hidden="true">·</span>
            <span>ASIGNACIÓN INDIVIDUAL Y STOCK</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-display">
            Control de Consumos de Cantina
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Anota directamente lo que cada persona consumió. Los productos seleccionados descuentan stock y actualizan cuentas corrientes y caja diaria.
          </p>
        </div>

        {esSuperAdmin && (
          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pendiente de Cobro
              </div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                {formatearMoneda(resumen.totalPendiente)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {resumen.cantidadPendientes} {resumen.cantidadPendientes === 1 ? 'cuenta' : 'cuentas'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Cobrado Registrado
              </div>
              <div className="text-lg font-extrabold text-emerald-800 dark:text-emerald-400 tabular-nums">
                {formatearMoneda(resumen.totalCobrado)}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">
                {resumen.cantidadCobrados} cobros
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulario Rápido */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white font-display">
              Anotar Consumo a una Persona
            </h2>
          </div>

          {jugadorActual && (
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
              Saldo cta. cte.:{' '}
              <span
                className={
                  jugadorActual.saldoCuentaCorriente < 0
                    ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                    : 'text-emerald-700 dark:text-emerald-400 font-extrabold'
                }
              >
                {formatearMoneda(jugadorActual.saldoCuentaCorriente)}
              </span>
            </div>
          )}
        </div>

        {jugadorActual && jugadorActual.esSocioClub !== false && estadoSeguroActual && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarCheck2
                  className={`w-4 h-4 shrink-0 ${
                    estadoSeguroActual.mensualidadPaga
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : estadoSeguroActual.mensualidadVencida
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                />
                <span>
                  Mensualidad / Seguro ({estadoSeguroActual.nombreMesActual}):{' '}
                  <strong
                    className={
                      estadoSeguroActual.mensualidadPaga
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : estadoSeguroActual.mensualidadVencida
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-amber-700 dark:text-amber-300'
                    }
                  >
                    {estadoSeguroActual.mensualidadPaga
                      ? 'Pagó'
                      : estadoSeguroActual.mensualidadVencida
                      ? 'No pagó (Vencida)'
                      : 'No pagó'}
                  </strong>
                </span>
              </div>

              {esSuperAdmin && (
                <div className="flex items-center gap-1.5">
                  {!estadoSeguroActual.mensualidadPaga ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMontoPagoSeguro(String(clubConfig?.montoMensualidad ?? 15000));
                        setPanelPagoSeguroAbierto((prev) => !prev);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition cursor-pointer"
                    >
                      Informar Pagó
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={informarNoPagoSeguroDesdeCantina}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-[11px] font-bold transition cursor-pointer"
                    >
                      Informar No Pagó
                    </button>
                  )}
                </div>
              )}
            </div>

            {esSuperAdmin && panelPagoSeguroAbierto && !estadoSeguroActual.mensualidadPaga && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoPagoSeguro('transferencia')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    metodoPagoSeguro === 'transferencia'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Alias Mercado Pago
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPagoSeguro('efectivo')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    metodoPagoSeguro === 'efectivo'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Efectivo
                </button>
                <input
                  type="number"
                  min={0}
                  value={montoPagoSeguro}
                  onChange={(e) => setMontoPagoSeguro(e.target.value)}
                  aria-label="Monto mensualidad seguro"
                  className="w-24 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold tabular-nums text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={confirmarPagoSeguroDesdeCantina}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition"
                >
                  Confirmar Pagó
                </button>
              </div>
            )}
          </div>
        )}

        {errorForm && (
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorForm}</span>
          </div>
        )}

        <form onSubmit={handleRegistrarConsumo} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Selección de Persona (Jugador o Servicio de Invitado) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ¿A quién se le asigna?
                </label>
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-950 p-0.5 border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModoInvitado(false)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                      !modoInvitado
                        ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    Pelotari
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoInvitado(true)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${
                      modoInvitado
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Invitado</span>
                  </button>
                </div>
              </div>

              {!modoInvitado ? (
                <div className="space-y-1.5">
                  <select
                    value={socioSeleccionado}
                    onChange={(e) => setSocioSeleccionado(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="">Elegir de pelotaris registrados...</option>
                    {jugadores.filter((j) => j.activo).map((j) => (
                      <option key={j.id} value={j.nombre}>
                        {j.nombre} ({j.categoria} · {j.rol})
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="O buscar / escribir nombre..."
                    value={socioSeleccionado}
                    onChange={(e) => setSocioSeleccionado(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 placeholder-slate-400"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50">
                  <input
                    type="text"
                    placeholder="Nombre del Invitado (No registrado) *"
                    value={nombreInvitado}
                    onChange={(e) => setNombreInvitado(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder="Observación (ej: Vino con Juan, tel, acl.)"
                    value={observacionInvitado}
                    onChange={(e) => setObservacionInvitado(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500 placeholder-slate-400"
                  />
                </div>
              )}
            </div>

            {/* 2. Qué consumió */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ¿Qué consumió? (Escribir o tocar)
                </label>
                {(detalleConsumo || productosUsados.length > 0) && (
                  <button
                    type="button"
                    onClick={limpiarSeleccionRapida}
                    className="text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-0.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpiar</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="Ej: 2 Patagonia + 1 empanada criolla"
                value={detalleConsumo}
                onChange={(e) => setDetalleConsumo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 font-medium placeholder-slate-400"
              />

              <div className="flex flex-wrap gap-1 mt-1.5">
                {productosPopulares.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => agregarProductoAlDetalle(p)}
                    className="text-[10px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    + {p.nombre.split(' ').slice(0, 2).join(' ')} ({formatearMoneda(p.precio)})
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Monto y Estado de Pago */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Monto a Cobrar ($ ARS):
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 4500"
                  value={montoConsumo}
                  onChange={(e) => setMontoConsumo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-extrabold text-slate-900 dark:text-emerald-400 focus:outline-hidden focus:border-emerald-500 tabular-nums"
                />
              </div>

              {modoMesasActivo && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mesa / Cancha (Optativo):
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Mesa 2 o Cancha 1"
                    value={mesaOpcional}
                    onChange={(e) => setMesaOpcional(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={pagadoInmediato}
                  onChange={(e) => setPagadoInmediato(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>¿Ya lo pagó en el acto?</span>
              </label>

              {pagadoInmediato && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMetodoPagoInmediato('efectivo')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                      metodoPagoInmediato === 'efectivo'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoPagoInmediato('transferencia')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                      metodoPagoInmediato === 'transferencia'
                        ? 'bg-slate-800 text-white dark:bg-slate-700'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Transferencia
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>
                {pagadoInmediato
                  ? `REGISTRAR COMO PAGADO (${formatearMoneda(parseFloat(montoConsumo) || 0)})`
                  : `ANOTAR EN CUENTA (${formatearMoneda(parseFloat(montoConsumo) || 0)})`}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Listado de Consumos & Cobros */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setFiltroTab('pendientes')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                filtroTab === 'pendientes'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Pendientes ({resumen.cantidadPendientes})</span>
            </button>

            <button
              onClick={() => setFiltroTab('pagados')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                filtroTab === 'pagados'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Historial Pagados ({resumen.cantidadCobrados})</span>
            </button>

            <button
              onClick={() => setFiltroTab('todos')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                filtroTab === 'todos'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Todos ({consumos.length})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por socio o producto..."
              value={busquedaSocio}
              onChange={(e) => setBusquedaSocio(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 placeholder-slate-400 w-full sm:w-56"
            />
          </div>
        </div>

        {consumosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <ReceiptText className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              No hay consumos en esta categoría.
            </p>
            <p className="text-[11px]">
              {filtroTab === 'pendientes'
                ? '¡Excelente! No hay cobros adeudados en la cantina.'
                : 'Utiliza el formulario superior para anotar un consumo.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {consumosFiltrados.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 p-2 rounded-xl transition"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm font-display">
                      {item.socioNombre}
                    </span>
                    {item.esInvitado && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        · Invitado
                      </span>
                    )}
                    {item.mesa && (
                      <span className="text-[11px] text-slate-500">
                        · {item.mesa}
                      </span>
                    )}
                    <span className="text-slate-400 dark:text-slate-600 text-xs">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      {item.fecha} {item.hora} hs
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {item.detalle}
                  </div>
                  {(item.observacionInvitado || (esSuperAdmin && item.registradoPor)) && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.observacionInvitado ? `Obs. invitado: ${item.observacionInvitado}` : ''}
                      {item.observacionInvitado && esSuperAdmin && item.registradoPor ? ' · ' : ''}
                      {esSuperAdmin && item.registradoPor ? `Cargó: ${item.registradoPor}` : ''}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:text-right shrink-0">
                  <div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                      {formatearMoneda(item.monto)}
                    </div>
                    <div className="text-[10px] font-bold">
                      {item.pagado ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          ABONADO ({item.metodoPago?.toUpperCase() || 'PAGADO'})
                        </span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">
                          PENDIENTE DE PAGO
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
                    {!item.pagado ? (
                      <button
                        onClick={() => setConsumoACobrar(item)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                        title="Registrar cobro"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aceptar Pago</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const url = `https://wa.me/?text=${generarMensajeWhatsAppConsumoIndividual(item)}`;
                          window.open(url, '_blank');
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition cursor-pointer"
                        title="Enviar comprobante por WhatsApp"
                        aria-label={`Enviar comprobante por WhatsApp a ${item.socioNombre}`}
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => eliminarConsumo(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title="Eliminar registro"
                      aria-label={`Eliminar consumo de ${item.socioNombre}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Aceptar Pago */}
      {consumoACobrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Aceptar Pago de Consumo
            </h3>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div>Socio: <strong className="text-slate-900 dark:text-white">{consumoACobrar.socioNombre}</strong></div>
              <div>Consumió: <span className="text-slate-700 dark:text-slate-300">{consumoACobrar.detalle}</span></div>
              <div className="pt-1 text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                Total: {formatearMoneda(consumoACobrar.monto)}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                ¿Cómo abonó?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoCobroModal('efectivo')}
                  className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    metodoCobroModal === 'efectivo'
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoCobroModal('transferencia')}
                  className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer ${
                    metodoCobroModal === 'transferencia'
                      ? 'bg-slate-800 text-white border-slate-900 dark:bg-slate-700 dark:border-slate-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  Alias Mercado Pago
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConsumoACobrar(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarCobro}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Confirmar Cobro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
