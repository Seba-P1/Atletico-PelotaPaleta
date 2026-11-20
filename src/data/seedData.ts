import {
  Jugador,
  HorarioConfig,
  ProductoCantina,
  Turno,
  ComandaCantina,
  MovimientoCaja,
  ConsumoIndividual,
  PublicacionClub,
} from '../types';

export const JUGADORES_INICIALES: Jugador[] = [];

export const HORARIOS_INICIALES: HorarioConfig[] = [
  { id: '14-15', inicio: '14:00', fin: '15:00', etiqueta: '14:00 a 15:00 hs', precioCancha: 8000, precioLuz: 0, activo: true },
  { id: '15-16', inicio: '15:00', fin: '16:00', etiqueta: '15:00 a 16:00 hs', precioCancha: 8000, precioLuz: 0, activo: true },
  { id: '16-17', inicio: '16:00', fin: '17:00', etiqueta: '16:00 a 17:00 hs', precioCancha: 8000, precioLuz: 0, activo: true },
  { id: '17-18', inicio: '17:00', fin: '18:00', etiqueta: '17:00 a 18:00 hs', precioCancha: 9000, precioLuz: 0, activo: true },
  { id: '18-19', inicio: '18:00', fin: '19:00', etiqueta: '18:00 a 19:00 hs', precioCancha: 10000, precioLuz: 2000, activo: true },
  { id: '19-20', inicio: '19:00', fin: '20:00', etiqueta: '19:00 a 20:00 hs', precioCancha: 10000, precioLuz: 2000, activo: true },
  { id: '20-21', inicio: '20:00', fin: '21:00', etiqueta: '20:00 a 21:00 hs', precioCancha: 10000, precioLuz: 2000, activo: true },
  { id: '21-22', inicio: '21:00', fin: '22:00', etiqueta: '21:00 a 22:00 hs', precioCancha: 10000, precioLuz: 2000, activo: true },
  { id: '22-23', inicio: '22:00', fin: '23:00', etiqueta: '22:00 a 23:00 hs', precioCancha: 10000, precioLuz: 2000, activo: true },
  { id: '23-00', inicio: '23:00', fin: '00:00', etiqueta: '23:00 a 00:00 hs', precioCancha: 9000, precioLuz: 2000, activo: true },
];

export const CONSUMOS_INDIVIDUALES_INICIALES: ConsumoIndividual[] = [];

export const PRODUCTOS_CANTINA_INICIALES: ProductoCantina[] = [];

export const TURNOS_HOY_INICIALES: Record<string, Turno> = {};

export const COMANDAS_INICIALES: ComandaCantina[] = [];

export const MOVIMIENTOS_CAJA_INICIALES: MovimientoCaja[] = [];

export const PUBLICACIONES_INICIALES: PublicacionClub[] = [];
