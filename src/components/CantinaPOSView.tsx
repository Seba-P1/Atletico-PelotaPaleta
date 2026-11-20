import React, { useState } from 'react';
import cantinaImg from '../assets/images/cantina_buffet_ambience_1794003932459.jpg';
import pelotasImg from '../assets/images/pelotas_y_paletas_1794003932921.jpg';
import {
  ProductoCantina,
  ComandaCantina,
  ItemPedido,
  MovimientoCaja,
  Turno,
  Jugador,
  CategoriaProducto,
  MetodoPago
} from '../types';
import { formatearMoneda } from '../utils/turnosLogic';
import {
  calcularTotalComanda,
  actualizarStockPorVenta,
  calcularBalanceCaja,
  generarMensajeWhatsAppTicket
} from '../utils/cantinaLogic';
import {
  Coffee,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  Receipt,
  Share2,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Utensils,
  Beer,
  Package,
  CircleDot
} from 'lucide-react';

interface CantinaPOSViewProps {
  productos: ProductoCantina[];
  setProductos: React.Dispatch<React.SetStateAction<ProductoCantina[]>>;
  comandas: ComandaCantina[];
  setComandas: React.Dispatch<React.SetStateAction<ComandaCantina[]>>;
  movimientosCaja: MovimientoCaja[];
  setMovimientosCaja: React.Dispatch<React.SetStateAction<MovimientoCaja[]>>;
  turnos: Record<string, Turno>;
  jugadores: Jugador[];
  turnoPreseleccionadoId?: string | null;
  clientePreseleccionado?: string | null;
  onLimpiarPreseleccion?: () => void;
  esAdmin: boolean;
}

export const CantinaPOSView: React.FC<CantinaPOSViewProps> = ({
  productos,
  setProductos,
  comandas,
  setComandas,
  movimientosCaja,
  setMovimientosCaja,
  turnos,
  jugadores,
  turnoPreseleccionadoId,
  clientePreseleccionado,
  onLimpiarPreseleccion,
  esAdmin
}) => {
  const [subVista, setSubVista] = useState<'pos' | 'comandas' | 'caja'>('pos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState<string>('');

  // Estado del Carrito / Nueva Comanda en el POS
  const [carrito, setCarrito] = useState<ItemPedido[]>([]);
  const [clienteNombre, setClienteNombre] = useState<string>(clientePreseleccionado || '');
  const [turnoAsignadoId, setTurnoAsignadoId] = useState<string>(turnoPreseleccionadoId || '');
  const [mesaNombre, setMesaNombre] = useState<string>(turnoPreseleccionadoId ? `Turno ${turnoPreseleccionadoId}` : 'Barra Cantina');
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState<MetodoPago>('efectivo');
  const [tipoOperacion, setTipoOperacion] = useState<'cobrar_ahora' | 'dejar_abierta'>('cobrar_ahora');
  const [notasPedido, setNotasPedido] = useState<string>('');

  // Modal para registrar movimiento manual de caja (egreso/ingreso)
  const [mostrarModalMovimiento, setMostrarModalMovimiento] = useState(false);
  const [nuevoMovTipo, setNuevoMovTipo] = useState<'ingreso' | 'egreso'>('egreso');
  const [nuevoMovDesc, setNuevoMovDesc] = useState('');
  const [nuevoMovMonto, setNuevoMovMonto] = useState('');
  const [nuevoMovMetodo, setNuevoMovMetodo] = useState<MetodoPago>('efectivo');
  const [nuevoMovCat, setNuevoMovCat] = useState<'proveedor' | 'insumos' | 'mantenimiento' | 'otro'>('proveedor');

  // Filtrado de productos
  const productosFiltrados = productos.filter((p) => {
    const matchCat = categoriaFiltro === 'todas' || p.categoria === categoriaFiltro;
    const matchBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                      (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));
    return matchCat && matchBusq;
  });

  // Funciones del Carrito
  const agregarAlCarrito = (prod: ProductoCantina) => {
    if (prod.stock <= 0) {
      alert(`No hay stock disponible de ${prod.nombre}`);
      return;
    }
    setCarrito((prev) => {
      const existe = prev.find((item) => item.productoId === prod.id);
      if (existe) {
        if (existe.cantidad >= prod.stock) {
          alert(`Has alcanzado el stock máximo disponible (${prod.stock})`);
          return prev;
        }
        return prev.map((item) =>
          item.productoId === prod.id
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productoId: prod.id,
            nombre: prod.nombre,
            precio: prod.precio,
            cantidad: 1,
            subtotal: prod.precio,
          },
        ];
      }
    });
  };

  const modificarCantidad = (prodId: string, delta: number) => {
    setCarrito((prev) => {
      return prev
        .map((item) => {
          if (item.productoId === prodId) {
            const nuevaCant = item.cantidad + delta;
            const prod = productos.find((p) => p.id === prodId);
            if (prod && nuevaCant > prod.stock) {
              alert(`Stock disponible: ${prod.stock}`);
              return item;
            }
            return {
              ...item,
              cantidad: nuevaCant,
              subtotal: nuevaCant * item.precio,
            };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0);
    });
  };

  const totalCarrito = calcularTotalComanda(carrito);

  // Procesar Comanda / Venta
  const confirmarVentaOPedido = () => {
    if (carrito.length === 0) {
      alert('Agrega al menos un producto al pedido.');
      return;
    }

    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const codigoNum = comandas.length + 101;
    const codigo = `#C-${codigoNum}`;

    const nuevaComanda: ComandaCantina = {
      id: `cmd-${Date.now()}`,
      codigo,
      fecha,
      hora,
      clienteNombre: clienteNombre.trim() || 'Cliente Mostrador',
      turnoId: turnoAsignadoId || undefined,
      mesaNombre: mesaNombre.trim() || 'Barra Cantina',
      items: [...carrito],
      total: totalCarrito,
      estado: tipoOperacion === 'cobrar_ahora' ? 'cobrada' : 'abierta',
      metodoPago: tipoOperacion === 'cobrar_ahora' ? metodoPagoSeleccionado : undefined,
      notas: notasPedido.trim(),
    };

    // Actualizar stock de inventario
    const { inventarioActualizado, alertasStockBajo } = actualizarStockPorVenta(productos, carrito);
    setProductos(inventarioActualizado);

    if (alertasStockBajo.length > 0) {
      alert(alertasStockBajo.join('\n'));
    }

    // Si se cobró en el momento, registrar en Caja Diaria
    if (tipoOperacion === 'cobrar_ahora') {
      const nuevoMovimiento: MovimientoCaja = {
        id: `mov-${Date.now()}`,
        fecha,
        hora,
        tipo: 'ingreso',
        categoria: 'cantina',
        descripcion: `Venta Cantina ${codigo} (${mesaNombre})`,
        monto: totalCarrito,
        metodoPago: metodoPagoSeleccionado,
        comandaId: nuevaComanda.id,
      };
      setMovimientosCaja((prev) => [nuevoMovimiento, ...prev]);
    }

    setComandas((prev) => [nuevaComanda, ...prev]);

    // Limpiar carrito
    setCarrito([]);
    setNotasPedido('');
    if (onLimpiarPreseleccion) onLimpiarPreseleccion();

    alert(
      tipoOperacion === 'cobrar_ahora'
        ? `✅ ¡Venta registrada y cobrada exitosamente! Total: ${formatearMoneda(totalCarrito)}`
        : `📋 ¡Comanda abierta exitosamente para ${mesaNombre}! Podrás cobrarla al finalizar el partido.`
    );
  };

  // Cobrar una comanda que estaba abierta
  const cobrarComandaAbierta = (comandaId: string, metodo: MetodoPago) => {
    const cmd = comandas.find((c) => c.id === comandaId);
    if (!cmd) return;

    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    setComandas((prev) =>
      prev.map((c) =>
        c.id === comandaId ? { ...c, estado: 'cobrada', metodoPago: metodo } : c
      )
    );

    const nuevoMov: MovimientoCaja = {
      id: `mov-${Date.now()}`,
      fecha,
      hora,
      tipo: 'ingreso',
      categoria: 'cantina',
      descripcion: `Cobro Comanda ${cmd.codigo} (${cmd.mesaNombre || cmd.clienteNombre})`,
      monto: cmd.total,
      metodoPago: metodo,
      comandaId: cmd.id,
    };
    setMovimientosCaja((prev) => [nuevoMov, ...prev]);

    alert(`✅ Comanda ${cmd.codigo} cobrada con éxito (${formatearMoneda(cmd.total)}).`);
  };

  // Balance de caja
  const balanceCaja = calcularBalanceCaja(movimientosCaja);

  // Agregar movimiento manual
  const registrarMovimientoManual = (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(nuevoMovMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert('Ingresa un monto válido mayor a 0');
      return;
    }

    const ahora = new Date();
    const nuevoMov: MovimientoCaja = {
      id: `mov-${Date.now()}`,
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      tipo: nuevoMovTipo,
      categoria: nuevoMovCat,
      descripcion: nuevoMovDesc.trim() || (nuevoMovTipo === 'egreso' ? 'Egreso general' : 'Ingreso general'),
      monto: montoNum,
      metodoPago: nuevoMovMetodo,
    };

    setMovimientosCaja((prev) => [nuevoMov, ...prev]);
    setMostrarModalMovimiento(false);
    setNuevoMovDesc('');
    setNuevoMovMonto('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Cantina */}
      <div className="relative rounded-2xl overflow-hidden border border-amber-900/40 bg-slate-900 shadow-xl">
        <div className="h-40 sm:h-52 w-full relative">
          <img
            src={cantinaImg || '/images/cantina.jpg'}
            alt="Cantina Buffet Club Atlético Río Colorado"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center brightness-75"
            onError={(e) => {
              (e.target as HTMLImageElement).src = pelotasImg || '/images/pelotas.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

          <div className="absolute bottom-4 left-4 sm:left-6 right-4 sm:right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
                <span>BUFFET & QUINCHO</span>
                <span aria-hidden="true">·</span>
                <span>PUNTO DE VENTA (POS)</span>
                <span aria-hidden="true">·</span>
                <span>TERCER TIEMPO</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
                Cantina & Buffet del Club
              </h1>
              <p className="text-xs text-slate-300">
                Punto de venta táctil, bebidas frías, minutas, insumos de pelota paleta y control de caja diaria.
              </p>
            </div>

            {/* Sub-navigation tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 backdrop-blur-xs">
              <button
                onClick={() => setSubVista('pos')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  subVista === 'pos'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Punto de Venta (POS)
              </button>
              <button
                onClick={() => setSubVista('comandas')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  subVista === 'comandas'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>Comandas Activas</span>
                {comandas.filter((c) => c.estado === 'abierta').length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
              <button
                onClick={() => setSubVista('caja')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  subVista === 'caja'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Caja & Finanzas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VISTA 1: PUNTO DE VENTA (POS) */}
      {subVista === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Catálogo de Productos (7 columnas) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Filtros de Categorías & Buscador */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Buscar bebida, minuta, pelota..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'todas', label: 'Todos' },
                  { id: 'bebidas', label: 'Bebidas' },
                  { id: 'comidas', label: 'Comidas' },
                  { id: 'snacks', label: 'Snacks' },
                  { id: 'pelota_paleta', label: 'Paleta' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoriaFiltro(c.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                      categoriaFiltro === c.id
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Productos Táctil */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {productosFiltrados.map((prod) => {
                const enStock = prod.stock > 0;
                const stockBajo = prod.stock <= prod.stockMinimo;

                return (
                  <div
                    key={prod.id}
                    onClick={() => enStock && agregarAlCarrito(prod)}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition select-none ${
                      enStock
                        ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/60 hover:bg-slate-800/80 active:scale-98 shadow-sm'
                        : 'bg-slate-950 border-slate-800/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {prod.categoria === 'bebidas'
                            ? 'Bebida'
                            : prod.categoria === 'comidas'
                            ? 'Minuta'
                            : prod.categoria === 'pelota_paleta'
                            ? 'Paleta'
                            : 'Kiosco'}
                        </span>
                        <span
                          className={`text-[10px] font-bold tabular-nums px-1.5 py-0.2 rounded ${
                            prod.stock === 0
                              ? 'text-rose-400 bg-rose-950/60'
                              : stockBajo
                              ? 'text-amber-400 bg-amber-950/60'
                              : 'text-emerald-400 bg-emerald-950/60'
                          }`}
                        >
                          Stock: {prod.stock}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-white leading-snug line-clamp-2">
                        {prod.nombre}
                      </div>
                      {prod.descripcion && (
                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {prod.descripcion}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-400 tabular-nums">
                        {formatearMoneda(prod.precio)}
                      </span>
                      <button
                        type="button"
                        className="p-1 rounded-md bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna Derecha: Carrito / Ticket de Comanda (5 columnas) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-display">Nueva Comanda / Venta</h3>
              </div>
              {carrito.length > 0 && (
                <button
                  onClick={() => setCarrito([])}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition"
                >
                  Vaciar pedido
                </button>
              )}
            </div>

            {/* Asignación de Turno o Mesa */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Mesa / Ubicación:</label>
                <input
                  type="text"
                  value={mesaNombre}
                  onChange={(e) => setMesaNombre(e.target.value)}
                  placeholder="Ej: Mesa 3, Turno 19-20"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">Vincular a Turno:</label>
                <select
                  value={turnoAsignadoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setTurnoAsignadoId(id);
                    if (id && turnos[id]) {
                      setMesaNombre(`Turno ${turnos[id].horarioId} hs`);
                      if (turnos[id].organizadorNombre) {
                        setClienteNombre(turnos[id].organizadorNombre || '');
                      }
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="">(Sin turno específico)</option>
                  {Object.values(turnos).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.horarioId} hs {t.organizadorNombre ? `(${t.organizadorNombre})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Cliente / Jugador Socio:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  placeholder="Nombre de quien abona o abre comanda"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
                <select
                  onChange={(e) => {
                    if (e.target.value) setClienteNombre(e.target.value);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300"
                >
                  <option value="">Elegir de socios...</option>
                  {jugadores.map((j) => (
                    <option key={j.id} value={j.nombre}>
                      {j.nombre} ({j.categoria})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lista de Items en Carrito */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {carrito.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                  <ShoppingBag className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                  <p>El pedido está vacío.</p>
                  <p className="text-[11px] text-slate-600">Haz clic en los productos para agregarlos.</p>
                </div>
              ) : (
                carrito.map((item) => (
                  <div
                    key={item.productoId}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-semibold text-white truncate">{item.nombre}</div>
                      <div className="text-[11px] text-slate-400">
                        {formatearMoneda(item.precio)} c/u
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => modificarCantidad(item.productoId, -1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-white tabular-nums w-4 text-center">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => modificarCantidad(item.productoId, 1)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="font-extrabold text-amber-400 tabular-nums w-18 text-right">
                        {formatearMoneda(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total & Opciones de Pago */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-base font-extrabold">
                <span className="text-slate-300 font-display">TOTAL COMANDA:</span>
                <span className="text-xl text-amber-400 tabular-nums">{formatearMoneda(totalCarrito)}</span>
              </div>

              {/* Modo: Cobrar ahora vs Dejar Comanda Abierta */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTipoOperacion('cobrar_ahora')}
                  className={`py-1.5 text-xs font-bold rounded-md transition ${
                    tipoOperacion === 'cobrar_ahora'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cobrar Ahora
                </button>
                <button
                  type="button"
                  onClick={() => setTipoOperacion('dejar_abierta')}
                  className={`py-1.5 text-xs font-bold rounded-md transition ${
                    tipoOperacion === 'dejar_abierta'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Abrir Comanda
                </button>
              </div>

              {/* Método de pago si se cobra ahora */}
              {tipoOperacion === 'cobrar_ahora' && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'efectivo', label: 'Efectivo' },
                    { id: 'transferencia', label: 'Transferencia' },
                    { id: 'cuenta_corriente', label: 'Cta. Socio' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetodoPagoSeleccionado(m.id as MetodoPago)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                        metodoPagoSeleccionado === m.id
                          ? 'bg-slate-800 border-amber-500 text-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}

              <div>
                <input
                  type="text"
                  placeholder="Nota (ej: Cerveza bien helada, 2 vasos)"
                  value={notasPedido}
                  onChange={(e) => setNotasPedido(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-500 placeholder-slate-500"
                />
              </div>

              <button
                type="button"
                onClick={confirmarVentaOPedido}
                disabled={carrito.length === 0}
                className={`w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition ${
                  carrito.length > 0
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950 cursor-pointer active:scale-98'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {tipoOperacion === 'cobrar_ahora'
                    ? `CONFIRMAR Y COBRAR (${formatearMoneda(totalCarrito)})`
                    : `ABRIR COMANDA (${mesaNombre})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: COMANDAS ACTIVAS Y MESAS */}
      {subVista === 'comandas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white font-display">Comandas y Mesas del Buffet</h2>
              <p className="text-xs text-slate-400">
                Gestiona las cuentas abiertas para los turnos de trinquete y mesas de la cantina.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comandas.map((cmd) => {
              const estaAbierta = cmd.estado === 'abierta';

              return (
                <div
                  key={cmd.id}
                  className={`rounded-xl border p-4 flex flex-col justify-between shadow-md ${
                    estaAbierta
                      ? 'bg-slate-900 border-amber-800/60 shadow-amber-950/20'
                      : 'bg-slate-950/70 border-slate-800 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between pb-2 border-b border-slate-800">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white font-display">
                            {cmd.codigo} · {cmd.mesaNombre || 'Mostrador'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {cmd.clienteNombre} · {cmd.hora} hs
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          estaAbierta
                            ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        }`}
                      >
                        {estaAbierta ? 'ABIERTA' : `COBRADA (${cmd.metodoPago || 'Efectivo'})`}
                      </span>
                    </div>

                    {/* Detalle de items */}
                    <div className="py-3 space-y-1.5">
                      {cmd.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-slate-300">
                          <span>
                            {item.cantidad}x {item.nombre}
                          </span>
                          <span className="tabular-nums font-medium text-slate-200">
                            {formatearMoneda(item.subtotal)}
                          </span>
                        </div>
                      ))}
                      {cmd.notas && (
                        <div className="text-[11px] italic text-slate-400 pt-1">
                          Nota: {cmd.notas}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="text-slate-400 text-xs">Total:</span>
                      <span className="text-amber-400 text-base tabular-nums font-extrabold">
                        {formatearMoneda(cmd.total)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {estaAbierta ? (
                        <>
                          <button
                            onClick={() => cobrarComandaAbierta(cmd.id, 'efectivo')}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                          >
                            Cobrar Efectivo
                          </button>
                          <button
                            onClick={() => cobrarComandaAbierta(cmd.id, 'transferencia')}
                            className="flex-1 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition"
                          >
                            Transferencia
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            const url = `https://wa.me/?text=${generarMensajeWhatsAppTicket(cmd)}`;
                            window.open(url, '_blank');
                          }}
                          className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Enviar Ticket por WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 3: CAJA Y CONTROL FINANCIERO */}
      {subVista === 'caja' && (
        <div className="space-y-6">
          {/* Tarjetas de Arqueo de Caja */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Efectivo en Caja
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 tabular-nums">
                {formatearMoneda(balanceCaja.efectivoCaja)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Dinero físico en mostrador</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Cobros Digitales / MP
              </div>
              <div className="text-2xl font-extrabold text-sky-400 tabular-nums">
                {formatearMoneda(balanceCaja.digitalCaja)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Transferencias bancarias</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Total Ingresos del Día
              </div>
              <div className="text-2xl font-extrabold text-white tabular-nums">
                {formatearMoneda(balanceCaja.totalIngresos)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Canchas: {formatearMoneda(balanceCaja.ingresosCancha)} · Cantina: {formatearMoneda(balanceCaja.ingresosCantina)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
                Total Egresos / Gastos
              </div>
              <div className="text-2xl font-extrabold text-rose-400 tabular-nums">
                {formatearMoneda(balanceCaja.totalEgresos)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Proveedores, hielo, insumos</div>
            </div>
          </div>

          {/* Botones de acción de caja */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white font-display">Libro Diario de Caja</h3>
              <p className="text-xs text-slate-400">Registro cronológico de todos los cobros y pagos.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarModalMovimiento(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Gasto o Ingreso Extra</span>
              </button>
            </div>
          </div>

          {/* Tabla de Movimientos */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Concepto / Descripción</th>
                    <th className="px-4 py-3">Medio de Pago</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {movimientosCaja.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-2.5 text-slate-300 font-medium tabular-nums">{m.hora}</td>
                      <td className="px-4 py-2.5">
                        {m.tipo === 'ingreso' ? (
                          <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" /> Ingreso
                          </span>
                        ) : (
                          <span className="text-rose-400 font-semibold inline-flex items-center gap-1">
                            <ArrowDownRight className="w-3 h-3" /> Egreso
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-white font-medium">{m.descripcion}</td>
                      <td className="px-4 py-2.5 text-slate-400 capitalize">{m.metodoPago}</td>
                      <td
                        className={`px-4 py-2.5 text-right font-bold tabular-nums ${
                          m.tipo === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {m.tipo === 'ingreso' ? '+' : '-'} {formatearMoneda(m.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Movimiento Extra en Caja */}
      {mostrarModalMovimiento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 space-y-4">
            <h3 className="text-base font-bold text-white font-display">Registrar Movimiento en Caja</h3>

            <form onSubmit={registrarMovimientoManual} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tipo de Movimiento:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNuevoMovTipo('egreso')}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      nuevoMovTipo === 'egreso'
                        ? 'bg-rose-950 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Egreso / Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setNuevoMovTipo('ingreso')}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      nuevoMovTipo === 'ingreso'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Ingreso Extra
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Monto ($ ARS):</label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 5000"
                  value={nuevoMovMonto}
                  onChange={(e) => setNuevoMovMonto(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Descripción / Concepto:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Pago distribuidora gaseosas, compra de hielo, etc."
                  value={nuevoMovDesc}
                  onChange={(e) => setNuevoMovDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Medio de Pago:</label>
                  <select
                    value={nuevoMovMetodo}
                    onChange={(e) => setNuevoMovMetodo(e.target.value as MetodoPago)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Rubro:</label>
                  <select
                    value={nuevoMovCat}
                    onChange={(e) => setNuevoMovCat(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="proveedor">Proveedor</option>
                    <option value="insumos">Insumos Buffet</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setMostrarModalMovimiento(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
