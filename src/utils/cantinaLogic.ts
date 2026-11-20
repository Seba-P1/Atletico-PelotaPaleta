import { ItemPedido, ProductoCantina, MovimientoCaja, ComandaCantina, ConsumoIndividual, Jugador, ProductoUsadoConsumo } from '../types';
import { formatearMoneda } from './turnosLogic';

export function calcularTotalComanda(items: ItemPedido[]): number {
  return items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
}

export function actualizarStockPorVenta(
  inventario: ProductoCantina[],
  itemsVendidos: ItemPedido[]
): {
  inventarioActualizado: ProductoCantina[];
  alertasStockBajo: string[];
} {
  const alertasStockBajo: string[] = [];
  const cantidadesVendidasMap = new Map<string, number>();

  itemsVendidos.forEach(item => {
    cantidadesVendidasMap.set(
      item.productoId,
      (cantidadesVendidasMap.get(item.productoId) || 0) + item.cantidad
    );
  });

  const inventarioActualizado = inventario.map(prod => {
    const cantidad = cantidadesVendidasMap.get(prod.id);
    if (!cantidad) return prod;

    const nuevoStock = Math.max(0, prod.stock - cantidad);
    if (nuevoStock <= prod.stockMinimo) {
      alertasStockBajo.push(
        `¡Atención! Quedan ${nuevoStock} ${prod.unidad}s de "${prod.nombre}" (Mínimo: ${prod.stockMinimo})`
      );
    }

    return {
      ...prod,
      stock: nuevoStock
    };
  });

  return { inventarioActualizado, alertasStockBajo };
}

export function descontarStockConsumoIndividual(
  inventario: ProductoCantina[],
  productosUsados: ProductoUsadoConsumo[]
): {
  inventarioActualizado: ProductoCantina[];
  alertasStockBajo: string[];
} {
  if (!productosUsados || productosUsados.length === 0) {
    return { inventarioActualizado: inventario, alertasStockBajo: [] };
  }
  const items: ItemPedido[] = productosUsados.map((p) => ({
    productoId: p.productoId,
    nombre: p.nombre,
    precio: p.precio,
    cantidad: p.cantidad,
    subtotal: p.precio * p.cantidad,
  }));
  return actualizarStockPorVenta(inventario, items);
}

export function aplicarDeltaCuentaCorriente(
  jugadores: Jugador[],
  socioId: number | undefined,
  socioNombre: string,
  deltaMonto: number
): Jugador[] {
  const nombreNorm = socioNombre.trim().toLowerCase();
  return jugadores.map((j) => {
    const coincideId = socioId !== undefined && j.id === socioId;
    const coincideNombre = !socioId && j.nombre.trim().toLowerCase() === nombreNorm;
    if (coincideId || coincideNombre) {
      return {
        ...j,
        saldoCuentaCorriente: j.saldoCuentaCorriente + deltaMonto,
      };
    }
    return j;
  });
}

export function filtrarMovimientosPorFecha(
  movimientos: MovimientoCaja[],
  fecha: string | 'todas'
): MovimientoCaja[] {
  if (!fecha || fecha === 'todas') return movimientos;
  return movimientos.filter((m) => m.fecha === fecha);
}

export function calcularBalanceCaja(movimientos: MovimientoCaja[]) {
  let totalIngresos = 0;
  let totalEgresos = 0;
  let efectivoCaja = 0;
  let digitalCaja = 0;
  let ingresosCantina = 0;
  let ingresosCancha = 0;

  movimientos.forEach(mov => {
    if (mov.tipo === 'ingreso') {
      totalIngresos += mov.monto;
      if (mov.metodoPago === 'efectivo') {
        efectivoCaja += mov.monto;
      } else {
        digitalCaja += mov.monto;
      }

      if (mov.categoria === 'cantina') ingresosCantina += mov.monto;
      if (mov.categoria === 'cancha') ingresosCancha += mov.monto;
    } else {
      totalEgresos += mov.monto;
      if (mov.metodoPago === 'efectivo') {
        efectivoCaja -= mov.monto;
      } else {
        digitalCaja -= mov.monto;
      }
    }
  });

  const balanceNeto = totalIngresos - totalEgresos;

  return {
    totalIngresos,
    totalEgresos,
    balanceNeto,
    efectivoCaja,
    digitalCaja,
    ingresosCantina,
    ingresosCancha
  };
}

export function calcularResumenConsumos(consumos: ConsumoIndividual[]) {
  let totalPendiente = 0;
  let totalCobrado = 0;
  let cantidadPendientes = 0;
  let cantidadCobrados = 0;

  consumos.forEach(c => {
    if (c.pagado) {
      totalCobrado += c.monto;
      cantidadCobrados++;
    } else {
      totalPendiente += c.monto;
      cantidadPendientes++;
    }
  });

  return {
    totalPendiente,
    totalCobrado,
    totalGeneral: totalPendiente + totalCobrado,
    cantidadPendientes,
    cantidadCobrados
  };
}

export function generarMensajeWhatsAppConsumoIndividual(consumo: ConsumoIndividual): string {
  const estadoTxt = consumo.pagado
    ? `✅ *ESTADO*: ABONADO (${consumo.metodoPago?.toUpperCase() || 'PAGADO'})`
    : `⏳ *ESTADO*: PENDIENTE DE PAGO`;

  const mesaTxt = consumo.mesa ? `\n📍 *Ubicación*: ${consumo.mesa}` : '';

  return encodeURIComponent(
`🍻 *CLUB ATLÉTICO RÍO COLORADO — CANTINA*
📋 *Comprobante de Consumo*

👤 *Socio / Cliente*: ${consumo.socioNombre}
📅 *Fecha*: ${consumo.fecha} · ${consumo.hora} hs${mesaTxt}

🍽️ *Detalle*:
${consumo.detalle}

💰 *Total*: ${formatearMoneda(consumo.monto)}
${estadoTxt}

${consumo.pagado ? '¡Muchas gracias por su pago!' : 'Podés abonar en el buffet en efectivo o por transferencia.'}`
  );
}

export function generarMensajeWhatsAppTicket(comanda: ComandaCantina): string {
  const detalleItems = comanda.items
    .map(i => `• ${i.cantidad}x ${i.nombre} — ${formatearMoneda(i.subtotal)}`)
    .join('\n');

  const ref = comanda.mesaNombre ? `📍 *Lugar / Mesa*: ${comanda.mesaNombre}` : '';
  const cliente = comanda.clienteNombre ? `👤 *Cliente*: ${comanda.clienteNombre}` : '';
  const metodo = comanda.metodoPago ? `💳 *Pago*: ${comanda.metodoPago.toUpperCase()} (${comanda.estado.toUpperCase()})` : '';

  return encodeURIComponent(
`🍻 *CANTINA CLUB ATLÉTICO RÍO COLORADO*
📋 *Comanda ${comanda.codigo}* — ${comanda.fecha} ${comanda.hora} hs
${cliente}
${ref}

*Detalle de Consumición:*
${detalleItems}

💰 *TOTAL*: ${formatearMoneda(comanda.total)}
${metodo}

¡Muchas gracias por colaborar con la cantina del club!`
  );
}
