export type RolJugador = 'Delantero' | 'Zaguero' | 'Ambos';
export type CategoriaJugador = '1ra' | '2da' | '3ra' | 'Promocional' | 'Veteranos';
export type ManoHabil = 'Derecha' | 'Zurda' | 'Ambidiestro';

export interface Jugador {
  id: number;
  nombre: string;
  nombrePila?: string;
  apellido?: string;
  dni?: string;
  fechaNacimiento?: string;
  email?: string;
  rol: RolJugador;
  categoria: CategoriaJugador;
  manoHabil?: ManoHabil;
  telefono: string;
  localidad?: string;
  esSocioClub?: boolean;
  numeroSocio?: string;
  contactoEmergencia?: string;
  observaciones?: string;
  saldoCuentaCorriente: number;
  ultimoMesPago?: string; // Formato YYYY-MM (ej: '2026-11')
  bloqueadoTurnos?: boolean; // Toggle manual de la Comisión Directiva
  motivoBloqueo?: string;
  activo: boolean;
  partidosJugados?: number;
}

export interface HorarioConfig {
  id: string;
  inicio: string;
  fin: string;
  etiqueta: string;
  precioCancha: number;
  precioLuz: number;
  activo?: boolean;
}

export type RolAcceso = 'super_admin' | 'cantinero' | 'jugador' | 'guest';

export interface PromoCantina {
  id: string;
  titulo: string;
  descripcion: string;
  precio?: string;
  categoria: 'comida' | 'bebida' | 'combo';
  activo: boolean;
}

export interface DiaBloqueado {
  fecha: string; // YYYY-MM-DD
  bloqueado: boolean;
  motivo: string;
  actualizadoPor?: string;
  updatedAt?: string;
}

export interface ProductoUsadoConsumo {
  productoId: string;
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface ConsumoIndividual {
  id: string;
  fecha: string;
  hora: string;
  socioNombre: string;
  socioId?: number;
  detalle: string;
  monto: number;
  pagado: boolean;
  metodoPago?: MetodoPago;
  fechaCobro?: string;
  mesa?: string;
  productosUsados?: ProductoUsadoConsumo[];
  esInvitado?: boolean;
  observacionInvitado?: string;
  registradoPor?: string;
}

export interface ClubConfig {
  modoMesasActivo: boolean;
  nombreClub: string;
  aliasTransferencia: string;
  titularCuenta: string;
  telefonoContacto: string;
  diasAnticipacionReserva: number;
  montoMensualidad?: number;
  diaVencimientoMensualidad?: number;
  soloTurnosEnElDia?: boolean;
  horaAperturaTurnos?: number;
  heroBadge?: string;
  heroTitulo?: string;
  heroSubtitulo?: string;
  heroImagenUrl?: string;
  promosCantina?: PromoCantina[];
}

export type EstadoTurno = 'libre' | 'ocupado' | 'mantenimiento' | 'bloqueado';

export interface ParejaTurno {
  nombre: string;
  delantero: string;
  zaguero: string;
  delanteroId?: number;
  zagueroId?: number;
}

export interface ResultadoPartido {
  set1P1: number;
  set1P2: number;
  set2P1: number;
  set2P2: number;
  set3P1?: number;
  set3P2?: number;
}

export interface Turno {
  id: string; // e.g. "2026-11-18__19-20"
  horarioId: string;
  fecha: string; // YYYY-MM-DD
  estado: EstadoTurno;
  p1?: ParejaTurno | null;
  p2?: ParejaTurno | null;
  organizadorNombre?: string;
  organizadorRol?: 'delantero' | 'zaguero';
  notas?: string;
  costoTotal?: number;
  pagado?: boolean;
  metodoPago?: 'efectivo' | 'transferencia' | 'cuenta_corriente';
  fechaReserva?: string;
  resultado?: ResultadoPartido;
  comandaCantinaId?: string;
  registradoPor?: string;
}

export type CategoriaProducto = 'bebidas' | 'comidas' | 'snacks' | 'pelota_paleta';

export interface ProductoCantina {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  precio: number;
  costo: number;
  stock: number;
  stockMinimo: number;
  unidad: string;
  descripcion?: string;
}

export interface ItemPedido {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

export type EstadoComanda = 'abierta' | 'cobrada' | 'anulada';
export type MetodoPago = 'efectivo' | 'transferencia' | 'cuenta_corriente';

export interface ComandaCantina {
  id: string;
  codigo: string; // e.g. #C-104
  fecha: string;
  hora: string;
  clienteNombre: string;
  jugadorId?: number;
  turnoId?: string;
  mesaNombre?: string;
  items: ItemPedido[];
  total: number;
  estado: EstadoComanda;
  metodoPago?: MetodoPago;
  notas?: string;
}

export type TipoMovimiento = 'ingreso' | 'egreso';
export type CategoriaMovimiento = 'cancha' | 'cantina' | 'cuota_socio' | 'proveedor' | 'insumos' | 'mantenimiento' | 'otro';

export interface MovimientoCaja {
  id: string;
  fecha: string;
  hora: string;
  tipo: TipoMovimiento;
  categoria: CategoriaMovimiento;
  descripcion: string;
  monto: number;
  metodoPago: MetodoPago;
  comandaId?: string;
  turnoId?: string;
  registradoPor?: string;
}

export interface ParejaTorneo {
  id: number;
  nombre: string;
  delantero: string;
  zaguero: string;
  delanteroId?: number;
  zagueroId?: number;
  zona?: string;
  partidosJugados: number;
  partidosGanados: number;
  puntos: number;
  tantosAFavor: number;
  tantosEnContra: number;
  difTantos: number;
}

export interface PartidoTorneo {
  id: string;
  zona: string;
  p1Id: number;
  p2Id: number;
  p1Nombre: string;
  p2Nombre: string;
  resultadoP1?: number;
  resultadoP2?: number;
  jugado: boolean;
  ganadorId?: number;
}

export interface TorneoData {
  titulo: string;
  categoria: string;
  cantidadParejas: number;
  parejas: ParejaTorneo[];
  zonas: {
    nombre: string;
    parejasIds: number[];
    partidos: PartidoTorneo[];
  }[];
  playoffs: {
    id: string;
    ronda: 'Semis' | 'Final';
    p1Nombre: string;
    p2Nombre: string;
    resultado?: string;
    ganadorNombre?: string;
  }[];
}

export type CategoriaPublicacion = 'torneo' | 'cantina' | 'aviso' | 'general';

export interface PublicacionClub {
  id: string;
  titulo: string;
  contenido: string;
  categoria: CategoriaPublicacion;
  fecha: string;
  activo: boolean;
  destacado?: boolean;
  etiquetaBadge?: string;
}

export type AdminSeccionId =
  | 'metricas'
  | 'eventos'
  | 'historial'
  | 'horarios'
  | 'caja'
  | 'publicaciones'
  | 'socios'
  | 'inventario'
  | 'configuracion'
  | 'respaldo';

