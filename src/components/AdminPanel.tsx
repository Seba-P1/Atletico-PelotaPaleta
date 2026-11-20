import React, { useState } from 'react';
import {
  Jugador,
  HorarioConfig,
  ProductoCantina,
  Turno,
  ComandaCantina,
  MovimientoCaja,
  PublicacionClub,
  CategoriaPublicacion,
  ClubConfig,
  TorneoData,
  MetodoPago,
  AdminSeccionId,
  DiaBloqueado,
  PromoCantina,
  ConsumoIndividual,
} from '../types';
import { formatearMoneda } from '../utils/turnosLogic';
import {
  evaluarEstadoFinancieroJugador,
  formatearPeriodoMes,
  obtenerMesAnioDesdeFecha,
  resolverUltimoMesAlMarcarNoPago,
} from '../utils/billingLogic';
import { AccessCodesConfig, DEFAULT_ACCESS_CODES } from '../utils/authLogic';
import { parsearPadronImportado } from '../utils/importLogic';
import { AdminCajaSection } from './AdminCajaSection';
import { AdminMetricasSection } from './AdminMetricasSection';
import { AdminHistorialTurnosSection } from './AdminHistorialTurnosSection';
import { AdminBottomSheet } from './AdminBottomSheet';
import {
  Users,
  Clock,
  Package,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  Phone,
  ShieldCheck,
  DollarSign,
  Eye,
  EyeOff,
  Store,
  Settings,
  Database,
  Megaphone,
  Trophy,
  Coffee,
  KeyRound,
  ChevronDown,
  Wallet,
  Building2,
  Power,
  Search,
  CalendarCheck2,
  Ban,
  BarChart3,
  History,
  Sparkles,
  FileSpreadsheet,
  UtensilsCrossed,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface AdminPanelProps {
  jugadores: Jugador[];
  setJugadores: React.Dispatch<React.SetStateAction<Jugador[]>>;
  horarios: HorarioConfig[];
  setHorarios: React.Dispatch<React.SetStateAction<HorarioConfig[]>>;
  productos: ProductoCantina[];
  setProductos: React.Dispatch<React.SetStateAction<ProductoCantina[]>>;
  turnos: Record<string, Turno>;
  setTurnos: React.Dispatch<React.SetStateAction<Record<string, Turno>>>;
  consumos?: ConsumoIndividual[];
  comandas: ComandaCantina[];
  movimientosCaja: MovimientoCaja[];
  setMovimientosCaja: React.Dispatch<React.SetStateAction<MovimientoCaja[]>>;
  publicaciones: PublicacionClub[];
  setPublicaciones: React.Dispatch<React.SetStateAction<PublicacionClub[]>>;
  clubConfig: ClubConfig;
  setClubConfig: React.Dispatch<React.SetStateAction<ClubConfig>>;
  torneo: TorneoData | null;
  onGuardarTorneo: (torneo: TorneoData | null) => void;
  fechaSeleccionada: string;
  modoMesasActivo: boolean;
  setModoMesasActivo: React.Dispatch<React.SetStateAction<boolean>>;
  adminPin: string;
  setAdminPin: (pin: string) => void;
  onReiniciarDia: () => void;
  onCargarCopiaSeguridad: (datos: any) => void;
  onNotificar: (msg: string) => void;
  onSolicitarConfirmacion: (cfg: {
    titulo: string;
    mensaje: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void;
  }) => void;
  supabaseActivo?: boolean;
  adminEmail?: string | null;
  onGuardarHorario?: (h: HorarioConfig, esNuevo: boolean) => Promise<void>;
  onToggleHorarioActivo?: (h: HorarioConfig) => Promise<void>;
  onEliminarHorario?: (id: string) => Promise<void>;
  onGuardarPublicacion?: (p: PublicacionClub) => Promise<void>;
  onTogglePublicacionActivo?: (p: PublicacionClub) => Promise<void>;
  onEliminarPublicacion?: (id: string) => Promise<void>;
  onGuardarJugador?: (j: Omit<Jugador, 'id'> & { id?: number }, esNuevo: boolean) => Promise<void>;
  onToggleSocioActivo?: (j: Jugador) => Promise<void>;
  onToggleBloqueoTurnosSocio?: (j: Jugador, bloqueado: boolean, motivo?: string) => Promise<void>;
  onRegistrarPagoMensualidadSocio?: (
    j: Jugador,
    mesPago: string,
    monto: number,
    metodo: MetodoPago,
    desbloquear: boolean
  ) => Promise<void>;
  onMarcarMensualidadNoPagaSocio?: (j: Jugador, mesActual: string) => Promise<void>;
  onEliminarSocio?: (j: Jugador) => Promise<void>;
  onCobrarSaldoSocio?: (j: Jugador, monto: number, metodo: MetodoPago) => Promise<void>;
  onGuardarProducto?: (p: ProductoCantina) => Promise<void>;
  onAjustarStockProducto?: (p: ProductoCantina, delta: number) => Promise<void>;
  onEliminarProducto?: (p: ProductoCantina) => Promise<void>;
  onGuardarClubConfig?: (cfg: ClubConfig) => Promise<void>;
  onAgregarMovimientoCaja?: (mov: MovimientoCaja) => Promise<void>;
  onEliminarMovimientoCaja?: (mov: MovimientoCaja) => Promise<void>;
  diasBloqueados?: Record<string, DiaBloqueado>;
  onGuardarDiaBloqueado?: (d: DiaBloqueado) => Promise<void>;
  accessCodes?: AccessCodesConfig;
  onGuardarAccessCode?: (rol: 'admin' | 'cantinero', codigo: string) => Promise<void>;
  onCargarHistorialTurnos?: () => Promise<void>;
  onImportarJugadores?: (lista: Omit<Jugador, 'id'>[]) => Promise<void>;
  operadorNombre?: string;
  seccionActiva?: AdminSeccionId;
  onCambiarSeccion?: (s: AdminSeccionId) => void;
  sheetMobileAbierto?: boolean;
  onSetSheetMobileAbierto?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  jugadores,
  setJugadores,
  horarios,
  setHorarios,
  productos,
  setProductos,
  turnos,
  consumos = [],
  comandas,
  movimientosCaja,
  setMovimientosCaja,
  publicaciones,
  setPublicaciones,
  clubConfig,
  setClubConfig,
  torneo,
  onGuardarTorneo,
  fechaSeleccionada,
  modoMesasActivo,
  setModoMesasActivo,
  adminPin,
  setAdminPin,
  onReiniciarDia,
  onCargarCopiaSeguridad,
  onNotificar,
  onSolicitarConfirmacion,
  supabaseActivo = false,
  adminEmail = null,
  onGuardarHorario,
  onToggleHorarioActivo,
  onEliminarHorario,
  onGuardarPublicacion,
  onTogglePublicacionActivo,
  onEliminarPublicacion,
  onGuardarJugador,
  onToggleSocioActivo,
  onToggleBloqueoTurnosSocio,
  onRegistrarPagoMensualidadSocio,
  onMarcarMensualidadNoPagaSocio,
  onEliminarSocio,
  onCobrarSaldoSocio,
  onGuardarProducto,
  onAjustarStockProducto,
  onEliminarProducto,
  onGuardarClubConfig,
  onAgregarMovimientoCaja,
  onEliminarMovimientoCaja,
  diasBloqueados = {},
  onGuardarDiaBloqueado,
  accessCodes = DEFAULT_ACCESS_CODES,
  onGuardarAccessCode,
  onCargarHistorialTurnos,
  onImportarJugadores,
  operadorNombre = 'Comisión Directiva',
  seccionActiva: seccionProp,
  onCambiarSeccion,
  sheetMobileAbierto: sheetProp,
  onSetSheetMobileAbierto,
}) => {
  const [seccionInterna, setSeccionInterna] = useState<AdminSeccionId>('metricas');
  const [sheetInterno, setSheetInterno] = useState<boolean>(false);

  const seccion = seccionProp ?? seccionInterna;
  const setSeccion = (s: AdminSeccionId) => {
    if (onCambiarSeccion) {
      onCambiarSeccion(s);
    } else {
      setSeccionInterna(s);
    }
  };

  const sheetAbierto = sheetProp ?? sheetInterno;
  const setSheetAbierto = (val: boolean) => {
    if (onSetSheetMobileAbierto) {
      onSetSheetMobileAbierto(val);
    } else {
      setSheetInterno(val);
    }
  };

  // Modal para Saldar / Ajustar Cuenta Corriente de socio
  const [socioSaldando, setSocioSaldando] = useState<Jugador | null>(null);
  const [montoSaldoPago, setMontoSaldoPago] = useState<string>('');
  const [metodoSaldoPago, setMetodoSaldoPago] = useState<MetodoPago>('efectivo');

  // Modal para Registrar Pago de Mensualidad
  const { mesActual } = obtenerMesAnioDesdeFecha();
  const [socioMensualidad, setSocioMensualidad] = useState<Jugador | null>(null);
  const [mesMensualidadPago, setMesMensualidadPago] = useState<string>(mesActual);
  const [montoMensualidadPago, setMontoMensualidadPago] = useState<string>(
    String(clubConfig.montoMensualidad ?? 15000)
  );
  const [metodoMensualidadPago, setMetodoMensualidadPago] = useState<MetodoPago>('efectivo');
  const [desbloquearAlPagar, setDesbloquearAlPagar] = useState<boolean>(true);

  // Formulario editable de configuración institucional / alias
  const [cfgNombreClub, setCfgNombreClub] = useState(clubConfig.nombreClub);
  const [cfgAlias, setCfgAlias] = useState(clubConfig.aliasTransferencia);
  const [cfgTitular, setCfgTitular] = useState(clubConfig.titularCuenta);
  const [cfgTelefono, setCfgTelefono] = useState(clubConfig.telefonoContacto);
  const [cfgDiasAnticipacion, setCfgDiasAnticipacion] = useState(
    String(clubConfig.diasAnticipacionReserva || 7)
  );
  const [cfgMontoMensualidad, setCfgMontoMensualidad] = useState(
    String(clubConfig.montoMensualidad ?? 15000)
  );
  const [cfgDiaVencimiento, setCfgDiaVencimiento] = useState(
    String(clubConfig.diaVencimientoMensualidad ?? 10)
  );

  // Estado para nuevo/editar jugador (registro completo)
  const [busquedaSocio, setBusquedaSocio] = useState('');
  const [filtroSocioEstado, setFiltroSocioEstado] = useState<
    'todos' | 'no_pagaron' | 'pagaron' | 'deuda_vencida' | 'bloqueados'
  >('todos');
  const [modalJugador, setModalJugador] = useState(false);
  const [jugadorEditando, setJugadorEditando] = useState<Jugador | null>(null);
  const [nombreJugador, setNombreJugador] = useState('');
  const [apellidoJugador, setApellidoJugador] = useState('');
  const [dniJugador, setDniJugador] = useState('');
  const [fechaNacJugador, setFechaNacJugador] = useState('');
  const [emailJugador, setEmailJugador] = useState('');
  const [localidadJugador, setLocalidadJugador] = useState('Río Colorado');
  const [rolJugador, setRolJugador] = useState<'Delantero' | 'Zaguero' | 'Ambos'>('Delantero');
  const [categoriaJugador, setCategoriaJugador] = useState<'1ra' | '2da' | '3ra' | 'Promocional' | 'Veteranos'>('2da');
  const [manoHabilJugador, setManoHabilJugador] = useState<'Derecha' | 'Zurda' | 'Ambidiestro'>('Derecha');
  const [esSocioClubJugador, setEsSocioClubJugador] = useState(true);
  const [numeroSocioJugador, setNumeroSocioJugador] = useState('');
  const [contactoEmergenciaJugador, setContactoEmergenciaJugador] = useState('');
  const [observacionesJugador, setObservacionesJugador] = useState('');
  const [telefonoJugador, setTelefonoJugador] = useState('');
  const [saldoJugador, setSaldoJugador] = useState('0');
  const [ultimoMesPagoJugador, setUltimoMesPagoJugador] = useState('');
  const [bloqueadoTurnosJugador, setBloqueadoTurnosJugador] = useState(false);
  const [motivoBloqueoJugador, setMotivoBloqueoJugador] = useState('');

  // Estado para nuevo/editar producto cantina
  const [modalProducto, setModalProducto] = useState(false);
  const [prodEditando, setProdEditando] = useState<ProductoCantina | null>(null);
  const [prodNombre, setProdNombre] = useState('');
  const [prodCat, setProdCat] = useState<'bebidas' | 'comidas' | 'snacks' | 'pelota_paleta'>('bebidas');
  const [prodPrecio, setProdPrecio] = useState('');
  const [prodCosto, setProdCosto] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodMinimo, setProdMinimo] = useState('');
  const [prodUnidad, setProdUnidad] = useState('Unidad');

  // Estado para nuevo/editar turno / horario
  const [modalHorario, setModalHorario] = useState(false);
  const [horarioEditando, setHorarioEditando] = useState<HorarioConfig | null>(null);
  const [horarioInicio, setHorarioInicio] = useState('14:00');
  const [horarioFin, setHorarioFin] = useState('15:00');
  const [horarioEtiqueta, setHorarioEtiqueta] = useState('14:00 a 15:00 hs');
  const [horarioPrecioCancha, setHorarioPrecioCancha] = useState('12000');
  const [horarioPrecioLuz, setHorarioPrecioLuz] = useState('0');
  const [horarioActivo, setHorarioActivo] = useState(true);

  // Estado para nueva/editar publicación
  const [modalPublicacion, setModalPublicacion] = useState(false);
  const [pubEditando, setPubEditando] = useState<PublicacionClub | null>(null);
  const [pubTitulo, setPubTitulo] = useState('');
  const [pubContenido, setPubContenido] = useState('');
  const [pubCategoria, setPubCategoria] = useState<CategoriaPublicacion>('torneo');
  const [pubEtiqueta, setPubEtiqueta] = useState('Torneo Oficial');
  const [pubActivo, setPubActivo] = useState(true);
  const [pubDestacado, setPubDestacado] = useState(false);

  // Estado para PIN en configuración y Códigos de Acceso por Panel
  const [nuevoPin, setNuevoPin] = useState(adminPin);
  const [codigoComisionInput, setCodigoComisionInput] = useState(accessCodes.codigoComision);
  const [codigoCantinaInput, setCodigoCantinaInput] = useState(accessCodes.codigoCantina);

  // Estado para Eventos del Día, Regla 08:00 hs, Hero Banner y Promos Cantina
  const [fechaEventoEdit, setFechaEventoEdit] = useState<string>(fechaSeleccionada);
  const infoBloqueoFecha = diasBloqueados[fechaEventoEdit];
  const [evtBloqueado, setEvtBloqueado] = useState<boolean>(Boolean(infoBloqueoFecha?.bloqueado));
  const [evtMotivo, setEvtMotivo] = useState<string>(
    infoBloqueoFecha?.motivo || 'Jornada suspendida por evento especial del club'
  );
  const [cfgSoloEnElDia, setCfgSoloEnElDia] = useState<boolean>(clubConfig.soloTurnosEnElDia ?? true);
  const [cfgHoraApertura, setCfgHoraApertura] = useState<string>(String(clubConfig.horaAperturaTurnos ?? 8));
  const [heroBadge, setHeroBadge] = useState<string>(clubConfig.heroBadge || 'Trinquete Oficial · Río Colorado');
  const [heroTitulo, setHeroTitulo] = useState<string>(clubConfig.heroTitulo || 'Cancha de Pelota Paleta CARC');
  const [heroSubtitulo, setHeroSubtitulo] = useState<string>(clubConfig.heroSubtitulo || '');
  const [heroImagenUrl, setHeroImagenUrl] = useState<string>(clubConfig.heroImagenUrl || '');
  const [promosDraft, setPromosDraft] = useState<PromoCantina[]>(clubConfig.promosCantina || []);
  const [nuevaPromoTitulo, setNuevaPromoTitulo] = useState('');
  const [nuevaPromoDesc, setNuevaPromoDesc] = useState('');
  const [nuevaPromoPrecio, setNuevaPromoPrecio] = useState('');
  const [nuevaPromoCat, setNuevaPromoCat] = useState<'comida' | 'bebida' | 'combo'>('combo');

  // Estado para Importador masivo desde planilla / CSV (Base de Ariel)
  const [mostrarImportador, setMostrarImportador] = useState<boolean>(false);
  const [textoImportacion, setTextoImportacion] = useState<string>('');
  const [importandoBatch, setImportandoBatch] = useState<boolean>(false);

  React.useEffect(() => {
    setCodigoComisionInput(accessCodes.codigoComision);
    setCodigoCantinaInput(accessCodes.codigoCantina);
  }, [accessCodes.codigoComision, accessCodes.codigoCantina]);

  React.useEffect(() => {
    const info = diasBloqueados[fechaEventoEdit];
    setEvtBloqueado(Boolean(info?.bloqueado));
    setEvtMotivo(info?.motivo || 'Jornada suspendida por evento especial del club');
  }, [fechaEventoEdit, diasBloqueados]);

  React.useEffect(() => {
    setCfgNombreClub(clubConfig.nombreClub);
    setCfgAlias(clubConfig.aliasTransferencia);
    setCfgTitular(clubConfig.titularCuenta);
    setCfgTelefono(clubConfig.telefonoContacto);
    setCfgDiasAnticipacion(String(clubConfig.diasAnticipacionReserva || 7));
    setCfgMontoMensualidad(String(clubConfig.montoMensualidad ?? 15000));
    setCfgDiaVencimiento(String(clubConfig.diaVencimientoMensualidad ?? 10));
    setCfgSoloEnElDia(clubConfig.soloTurnosEnElDia ?? true);
    setCfgHoraApertura(String(clubConfig.horaAperturaTurnos ?? 8));
    setHeroBadge(clubConfig.heroBadge || 'Trinquete Oficial · Río Colorado');
    setHeroTitulo(clubConfig.heroTitulo || 'Cancha de Pelota Paleta CARC');
    setHeroSubtitulo(clubConfig.heroSubtitulo || '');
    setHeroImagenUrl(clubConfig.heroImagenUrl || '');
    setPromosDraft(clubConfig.promosCantina || []);
  }, [clubConfig]);

  // Toggle directo de activo/inactivo de un horario
  const toggleHorarioActivo = async (id: string) => {
    const h = horarios.find((item) => item.id === id);
    if (!h) return;
    const actualizado: HorarioConfig = { ...h, activo: h.activo === false ? true : false };
    if (onToggleHorarioActivo) {
      await onToggleHorarioActivo(actualizado);
      return;
    }
    setHorarios((prev) => prev.map((item) => (item.id === id ? actualizado : item)));
  };

  // Toggle directo de activo/inactivo de una publicación
  const togglePublicacionActivo = async (id: string) => {
    const p = publicaciones.find((item) => item.id === id);
    if (!p) return;
    const actualizada: PublicacionClub = { ...p, activo: !p.activo };
    if (onTogglePublicacionActivo) {
      await onTogglePublicacionActivo(actualizada);
      return;
    }
    setPublicaciones((prev) => prev.map((item) => (item.id === id ? actualizada : item)));
  };

  // Abrir modal nuevo horario
  const abrirModalNuevoHorario = () => {
    setHorarioEditando(null);
    setHorarioInicio('12:00');
    setHorarioFin('13:00');
    setHorarioEtiqueta('12:00 a 13:00 hs');
    setHorarioPrecioCancha('12000');
    setHorarioPrecioLuz('0');
    setHorarioActivo(true);
    setModalHorario(true);
  };

  // Abrir modal editar horario
  const abrirModalEditarHorario = (h: HorarioConfig) => {
    setHorarioEditando(h);
    setHorarioInicio(h.inicio || '14:00');
    setHorarioFin(h.fin || '15:00');
    setHorarioEtiqueta(h.etiqueta);
    setHorarioPrecioCancha(h.precioCancha.toString());
    setHorarioPrecioLuz(h.precioLuz.toString());
    setHorarioActivo(h.activo !== false);
    setModalHorario(true);
  };

  // Guardar horario
  const guardarHorario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!horarioEtiqueta.trim()) return;

    const precioCanchaNum = parseFloat(horarioPrecioCancha) || 0;
    const precioLuzNum = parseFloat(horarioPrecioLuz) || 0;

    if (horarioEditando) {
      const actualizado: HorarioConfig = {
        ...horarioEditando,
        etiqueta: horarioEtiqueta.trim(),
        inicio: horarioInicio,
        fin: horarioFin,
        precioCancha: precioCanchaNum,
        precioLuz: precioLuzNum,
        activo: horarioActivo,
      };
      if (onGuardarHorario) {
        await onGuardarHorario(actualizado, false);
      } else {
        setHorarios((prev) => prev.map((h) => (h.id === horarioEditando.id ? actualizado : h)));
        onNotificar('Horario guardado correctamente');
      }
    } else {
      const nuevoId = `${horarioInicio.replace(':', '')}-${horarioFin.replace(':', '')}_${Date.now()}`;
      const nuevo: HorarioConfig = {
        id: nuevoId,
        etiqueta: horarioEtiqueta.trim(),
        inicio: horarioInicio,
        fin: horarioFin,
        precioCancha: precioCanchaNum,
        precioLuz: precioLuzNum,
        activo: horarioActivo,
      };
      if (onGuardarHorario) {
        await onGuardarHorario(nuevo, true);
      } else {
        setHorarios((prev) => [...prev, nuevo]);
        onNotificar('Horario guardado correctamente');
      }
    }

    setModalHorario(false);
    setHorarioEditando(null);
  };

  // Eliminar un horario
  const eliminarHorario = (id: string) => {
    onSolicitarConfirmacion({
      titulo: 'Eliminar Turno de la Grilla',
      mensaje:
        '¿Deseas eliminar este turno de la grilla? Si sólo deseas que no se reserve temporalmente, puedes desactivarlo.',
      confirmLabel: 'Sí, eliminar',
      variant: 'danger',
      onConfirm: async () => {
        if (onEliminarHorario) {
          await onEliminarHorario(id);
          return;
        }
        setHorarios((prev) => prev.filter((h) => h.id !== id));
        onNotificar('Horario eliminado de la grilla');
      },
    });
  };

  // Plantillas automáticas para crear anuncios rápidos
  const aplicarPlantillaPublicacion = (tipo: 'torneo' | 'cantina') => {
    if (tipo === 'torneo') {
      setPubTitulo('🏆 Próximo Torneo de Trinquete - Copa Club Atlético');
      setPubCategoria('torneo');
      setPubEtiqueta('Torneo Oficial');
      setPubDestacado(true);
      setPubContenido(
        'Este fin de semana se disputará la Copa Aniversario en el Trinquete Oficial. Zonas de clasificación y playoffs. Premios para campeones y subcampeones. Inscribite antes del viernes en secretaría o con el encargado de cancha.'
      );
    } else if (tipo === 'cantina') {
      const itemsList = productos
        .slice(0, 6)
        .map((p) => `${p.nombre}: ${formatearMoneda(p.precio)}`)
        .join(' · ');
      setPubTitulo('🍻 Precios de Cantina & Buffet del Club');
      setPubCategoria('cantina');
      setPubEtiqueta('Precios Buffet');
      setPubDestacado(false);
      setPubContenido(
        `Menú de cantina actualizado para el tercer tiempo: ${itemsList}. Podés abonar al contado o por transferencia bancaria en la barra.`
      );
    }
  };

  // Abrir modal nueva publicación
  const abrirModalNuevaPublicacion = () => {
    setPubEditando(null);
    setPubTitulo('');
    setPubContenido('');
    setPubCategoria('torneo');
    setPubEtiqueta('Torneo Oficial');
    setPubActivo(true);
    setPubDestacado(false);
    setModalPublicacion(true);
  };

  // Abrir modal editar publicación
  const abrirModalEditarPublicacion = (pub: PublicacionClub) => {
    setPubEditando(pub);
    setPubTitulo(pub.titulo);
    setPubContenido(pub.contenido);
    setPubCategoria(pub.categoria);
    setPubEtiqueta(pub.etiquetaBadge || '');
    setPubActivo(pub.activo);
    setPubDestacado(Boolean(pub.destacado));
    setModalPublicacion(true);
  };

  // Guardar publicación
  const guardarPublicacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubTitulo.trim() || !pubContenido.trim()) {
      onNotificar('Ingresa el título y contenido de la publicación');
      return;
    }

    const pubObj: PublicacionClub = pubEditando
      ? {
          ...pubEditando,
          titulo: pubTitulo.trim(),
          contenido: pubContenido.trim(),
          categoria: pubCategoria,
          etiquetaBadge: pubEtiqueta.trim(),
          activo: pubActivo,
          destacado: pubDestacado,
        }
      : {
          id: `pub-${Date.now()}`,
          titulo: pubTitulo.trim(),
          contenido: pubContenido.trim(),
          categoria: pubCategoria,
          etiquetaBadge: pubEtiqueta.trim(),
          fecha: new Date().toISOString().split('T')[0],
          activo: pubActivo,
          destacado: pubDestacado,
        };

    if (onGuardarPublicacion) {
      await onGuardarPublicacion(pubObj);
    } else if (pubEditando) {
      setPublicaciones((prev) => prev.map((p) => (p.id === pubEditando.id ? pubObj : p)));
      onNotificar('Publicación guardada en la cartelera');
    } else {
      setPublicaciones((prev) => [pubObj, ...prev]);
      onNotificar('Publicación guardada en la cartelera');
    }

    setModalPublicacion(false);
    setPubEditando(null);
  };

  // Eliminar publicación
  const eliminarPublicacion = (id: string) => {
    onSolicitarConfirmacion({
      titulo: 'Eliminar Publicación',
      mensaje: '¿Eliminar este anuncio de la cartelera oficial?',
      confirmLabel: 'Sí, eliminar',
      variant: 'danger',
      onConfirm: async () => {
        if (onEliminarPublicacion) {
          await onEliminarPublicacion(id);
          return;
        }
        setPublicaciones((prev) => prev.filter((p) => p.id !== id));
        onNotificar('Publicación eliminada');
      },
    });
  };

  // Guardar Jugador (con perfil completo)
  const guardarJugador = async (e: React.FormEvent) => {
    e.preventDefault();
    const nomPila = nombreJugador.trim();
    const ape = apellidoJugador.trim();
    const nombreCompleto = ape ? `${nomPila} ${ape}`.trim() : nomPila;
    if (!nombreCompleto) return;

    const datosComunes = {
      nombre: nombreCompleto,
      nombrePila: nomPila,
      apellido: ape || undefined,
      dni: dniJugador.replace(/[^0-9]/g, '') || undefined,
      fechaNacimiento: fechaNacJugador || undefined,
      email: emailJugador.trim() || undefined,
      localidad: localidadJugador.trim() || 'Río Colorado',
      rol: rolJugador,
      categoria: categoriaJugador,
      manoHabil: manoHabilJugador,
      esSocioClub: esSocioClubJugador,
      numeroSocio: esSocioClubJugador ? numeroSocioJugador.trim() || undefined : undefined,
      contactoEmergencia: contactoEmergenciaJugador.trim() || undefined,
      observaciones: observacionesJugador.trim() || undefined,
      telefono: telefonoJugador.trim(),
      saldoCuentaCorriente: parseFloat(saldoJugador) || 0,
      ultimoMesPago: ultimoMesPagoJugador.trim() || undefined,
      bloqueadoTurnos: bloqueadoTurnosJugador,
      motivoBloqueo: bloqueadoTurnosJugador ? motivoBloqueoJugador.trim() || undefined : undefined,
    };

    if (jugadorEditando) {
      const actualizado: Jugador = {
        ...jugadorEditando,
        ...datosComunes,
      };
      if (onGuardarJugador) {
        await onGuardarJugador(actualizado, false);
      } else {
        setJugadores((prev) => prev.map((j) => (j.id === jugadorEditando.id ? actualizado : j)));
      }
    } else {
      const nuevo: Jugador = {
        id: Date.now(),
        ...datosComunes,
        activo: true,
        partidosJugados: 0,
      };
      if (onGuardarJugador) {
        await onGuardarJugador(nuevo, true);
      } else {
        setJugadores((prev) => [...prev, nuevo]);
      }
    }

    setModalJugador(false);
    setJugadorEditando(null);
    setNombreJugador('');
    setApellidoJugador('');
    setDniJugador('');
    setFechaNacJugador('');
    setEmailJugador('');
    setLocalidadJugador('Río Colorado');
    setNumeroSocioJugador('');
    setContactoEmergenciaJugador('');
    setObservacionesJugador('');
    setTelefonoJugador('');
    setSaldoJugador('0');
    setUltimoMesPagoJugador('');
    setBloqueadoTurnosJugador(false);
    setMotivoBloqueoJugador('');
  };

  // Guardar Producto
  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNombre.trim()) return;

    const prodObj: ProductoCantina = prodEditando
      ? {
          ...prodEditando,
          nombre: prodNombre.trim(),
          categoria: prodCat,
          precio: parseFloat(prodPrecio) || 0,
          costo: parseFloat(prodCosto) || 0,
          stock: parseInt(prodStock) || 0,
          stockMinimo: parseInt(prodMinimo) || 0,
          unidad: prodUnidad.trim(),
        }
      : {
          id: `prod-${Date.now()}`,
          nombre: prodNombre.trim(),
          categoria: prodCat,
          precio: parseFloat(prodPrecio) || 0,
          costo: parseFloat(prodCosto) || 0,
          stock: parseInt(prodStock) || 0,
          stockMinimo: parseInt(prodMinimo) || 0,
          unidad: prodUnidad.trim(),
        };

    if (onGuardarProducto) {
      await onGuardarProducto(prodObj);
    } else if (prodEditando) {
      setProductos((prev) => prev.map((p) => (p.id === prodEditando.id ? prodObj : p)));
    } else {
      setProductos((prev) => [...prev, prodObj]);
    }

    setModalProducto(false);
    setProdEditando(null);
  };

  // Toggle Activo/Inactivo de socio
  const toggleSocioActivo = async (socio: Jugador) => {
    const actualizado: Jugador = { ...socio, activo: !socio.activo };
    if (onToggleSocioActivo) {
      await onToggleSocioActivo(actualizado);
      return;
    }
    setJugadores((prev) => prev.map((j) => (j.id === socio.id ? actualizado : j)));
    onNotificar(`${socio.nombre} marcado como ${socio.activo ? 'inactivo' : 'activo'}`);
  };

  // Eliminar socio
  const eliminarSocio = (socio: Jugador) => {
    onSolicitarConfirmacion({
      titulo: 'Eliminar Socio del Padrón',
      mensaje: `¿Seguro que deseas eliminar a ${socio.nombre}? Si solo dejó de jugar temporalmente, puedes desactivarlo.`,
      confirmLabel: 'Sí, eliminar',
      variant: 'danger',
      onConfirm: async () => {
        if (onEliminarSocio) {
          await onEliminarSocio(socio);
          return;
        }
        setJugadores((prev) => prev.filter((j) => j.id !== socio.id));
        onNotificar(`${socio.nombre} eliminado del padrón`);
      },
    });
  };

  // Toggle bloqueo discrecional de turnos por la Comisión Directiva
  const toggleBloqueoTurnos = async (socio: Jugador) => {
    const proximoBloqueo = !Boolean(socio.bloqueadoTurnos);
    const est = evaluarEstadoFinancieroJugador(socio, { clubConfig });
    const motivoDefault = proximoBloqueo
      ? est.mensualidadVencida && est.deudaCantina > 0
        ? 'Mensualidad vencida y saldo pendiente en cantina'
        : est.mensualidadVencida
        ? 'Mensualidad vencida'
        : est.deudaCantina > 0
        ? 'Saldo pendiente en cantina'
        : 'Bloqueado por Comisión Directiva'
      : undefined;

    if (onToggleBloqueoTurnosSocio) {
      await onToggleBloqueoTurnosSocio(socio, proximoBloqueo, motivoDefault);
      return;
    }

    setJugadores((prev) =>
      prev.map((j) =>
        j.id === socio.id
          ? { ...j, bloqueadoTurnos: proximoBloqueo, motivoBloqueo: motivoDefault }
          : j
      )
    );
    onNotificar(
      proximoBloqueo
        ? `${socio.nombre} bloqueado para sacar turnos por Comisión Directiva`
        : `${socio.nombre} habilitado nuevamente para sacar turnos`
    );
  };

  // Confirmar pago de mensualidad (marca mes pago + opcional caja + opcional desbloqueo)
  const confirmarPagoMensualidad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socioMensualidad) return;
    const montoNum = Math.max(0, parseFloat(montoMensualidadPago) || 0);
    const mes = mesMensualidadPago || mesActual;

    if (onRegistrarPagoMensualidadSocio) {
      await onRegistrarPagoMensualidadSocio(
        socioMensualidad,
        mes,
        montoNum,
        metodoMensualidadPago,
        desbloquearAlPagar
      );
      setSocioMensualidad(null);
      return;
    }

    setJugadores((prev) =>
      prev.map((j) =>
        j.id === socioMensualidad.id
          ? {
              ...j,
              ultimoMesPago: mes,
              bloqueadoTurnos: desbloquearAlPagar ? false : j.bloqueadoTurnos,
              motivoBloqueo: desbloquearAlPagar ? undefined : j.motivoBloqueo,
            }
          : j
      )
    );

    if (montoNum > 0) {
      const ahora = new Date();
      const nuevoMov: MovimientoCaja = {
        id: `mov-cuota-${Date.now()}`,
        fecha: ahora.toISOString().split('T')[0],
        hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        tipo: 'ingreso',
        categoria: 'cuota_socio',
        descripcion: `Mensualidad ${formatearPeriodoMes(mes)} - ${socioMensualidad.nombre}`,
        monto: montoNum,
        metodoPago: metodoMensualidadPago,
      };
      setMovimientosCaja((prev) => [nuevoMov, ...prev]);
    }

    onNotificar(
      `Mensualidad / seguro (${formatearPeriodoMes(mes)}) informada como PAGA para ${socioMensualidad.nombre}`
    );
    setSocioMensualidad(null);
  };

  // Informar que un jugador NO pagó la mensualidad / seguro del mes actual
  const marcarNoPagoMensualidad = async (socio: Jugador) => {
    if (onMarcarMensualidadNoPagaSocio) {
      await onMarcarMensualidadNoPagaSocio(socio, mesActual);
      return;
    }

    const nuevoUltimoMes = resolverUltimoMesAlMarcarNoPago(socio.ultimoMesPago, mesActual);
    setJugadores((prev) =>
      prev.map((j) =>
        j.id === socio.id
          ? {
              ...j,
              ultimoMesPago: nuevoUltimoMes,
            }
          : j
      )
    );
    onNotificar(
      `Mensualidad / seguro (${formatearPeriodoMes(mesActual)}) informada como NO PAGA para ${socio.nombre}`
    );
  };

  // Saldar / Registrar pago de Cuenta Corriente
  const confirmarPagoSaldo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socioSaldando) return;
    const montoNum = parseFloat(montoSaldoPago);
    if (isNaN(montoNum) || montoNum <= 0) {
      onNotificar('Ingresa un monto válido mayor a 0');
      return;
    }

    if (onCobrarSaldoSocio) {
      await onCobrarSaldoSocio(socioSaldando, montoNum, metodoSaldoPago);
      setSocioSaldando(null);
      setMontoSaldoPago('');
      return;
    }

    setJugadores((prev) =>
      prev.map((j) =>
        j.id === socioSaldando.id
          ? { ...j, saldoCuentaCorriente: j.saldoCuentaCorriente + montoNum }
          : j
      )
    );

    const ahora = new Date();
    const nuevoMov: MovimientoCaja = {
      id: `mov-cta-${Date.now()}`,
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      tipo: 'ingreso',
      categoria: 'cuota_socio',
      descripcion: `Pago Cta. Cte. / Cantina - ${socioSaldando.nombre}`,
      monto: montoNum,
      metodoPago: metodoSaldoPago,
    };
    setMovimientosCaja((prev) => [nuevoMov, ...prev]);

    onNotificar(`Registrado pago de ${formatearMoneda(montoNum)} de ${socioSaldando.nombre}`);
    setSocioSaldando(null);
    setMontoSaldoPago('');
  };

  // Eliminar producto
  const eliminarProducto = (prod: ProductoCantina) => {
    onSolicitarConfirmacion({
      titulo: 'Eliminar Producto',
      mensaje: `¿Eliminar "${prod.nombre}" del catálogo de cantina?`,
      confirmLabel: 'Sí, eliminar',
      variant: 'danger',
      onConfirm: async () => {
        if (onEliminarProducto) {
          await onEliminarProducto(prod);
          return;
        }
        setProductos((prev) => prev.filter((p) => p.id !== prod.id));
        onNotificar(`${prod.nombre} eliminado del catálogo`);
      },
    });
  };

  // Guardar configuración del club
  const guardarConfigClub = async (e: React.FormEvent) => {
    e.preventDefault();
    const dias = Math.max(1, Math.min(30, parseInt(cfgDiasAnticipacion, 10) || 7));
    const montoMens = Math.max(0, parseFloat(cfgMontoMensualidad) || 0);
    const diaVenc = Math.max(1, Math.min(28, parseInt(cfgDiaVencimiento, 10) || 10));
    const nextCfg: ClubConfig = {
      ...clubConfig,
      nombreClub: cfgNombreClub.trim() || clubConfig.nombreClub,
      aliasTransferencia: cfgAlias.trim(),
      titularCuenta: cfgTitular.trim(),
      telefonoContacto: cfgTelefono.trim(),
      diasAnticipacionReserva: dias,
      montoMensualidad: montoMens,
      diaVencimientoMensualidad: diaVenc,
      modoMesasActivo,
    };
    if (onGuardarClubConfig) {
      await onGuardarClubConfig(nextCfg);
    } else {
      setClubConfig(nextCfg);
      onNotificar('Configuración del club actualizada');
    }
  };

  // Exportar backup en archivo JSON para descargar
  const descargarRespaldo = () => {
    const dataCompleta = {
      fechaExportacion: new Date().toISOString(),
      club: clubConfig.nombreClub,
      jugadores,
      horarios,
      productos,
      turnos,
      comandas,
      movimientosCaja,
      publicaciones,
      torneo,
      clubConfig,
      modoMesasActivo,
      adminPin,
    };

    const blob = new Blob([JSON.stringify(dataCompleta, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CARC_Trinquete_Respaldo_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotificar('Archivo de respaldo descargado');
  };

  // Importar backup
  const importarRespaldo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.jugadores && (parsed.turnos || parsed.horarios)) {
          onCargarCopiaSeguridad(parsed);
          if (parsed.publicaciones) {
            setPublicaciones(parsed.publicaciones);
          }
          if (parsed.clubConfig) {
            setClubConfig(parsed.clubConfig);
          }
          if (parsed.torneo !== undefined) {
            onGuardarTorneo(parsed.torneo);
          }
          if (parsed.modoMesasActivo !== undefined) {
            setModoMesasActivo(Boolean(parsed.modoMesasActivo));
          }
          if (parsed.adminPin) {
            setAdminPin(parsed.adminPin);
          }
          onNotificar('Copia de seguridad restaurada correctamente');
        } else {
          onNotificar('El archivo no tiene el formato de respaldo válido');
        }
      } catch {
        onNotificar('Error al leer el archivo de respaldo JSON');
      }
    };
    reader.readAsText(file);
  };

  const cantidadHorariosActivos = horarios.filter((h) => h.activo !== false).length;
  const cantidadPublicacionesActivas = publicaciones.filter((p) => p.activo).length;
  const cantidadTurnosOcupadosTotal = Object.values(turnos).filter((t) => t.estado === 'ocupado').length;
  const cantidadDiasBloqueados = Object.values(diasBloqueados).filter((d) => d.bloqueado).length;

  const guardarEventosDia = async (e: React.FormEvent) => {
    e.preventDefault();
    const registro: DiaBloqueado = {
      fecha: fechaEventoEdit,
      bloqueado: evtBloqueado,
      motivo: evtMotivo.trim() || 'Jornada suspendida por evento especial del club',
      actualizadoPor: operadorNombre,
    };
    if (onGuardarDiaBloqueado) {
      await onGuardarDiaBloqueado(registro);
    } else {
      onNotificar(
        evtBloqueado
          ? `Turnos bloqueados para el ${fechaEventoEdit}`
          : `Turnos rehabilitados para el ${fechaEventoEdit}`
      );
    }
  };

  const guardarHeroYRegla = async (e: React.FormEvent) => {
    e.preventDefault();
    const horaNum = Math.max(0, Math.min(23, parseInt(cfgHoraApertura, 10) || 8));
    const nextCfg: ClubConfig = {
      ...clubConfig,
      soloTurnosEnElDia: cfgSoloEnElDia,
      horaAperturaTurnos: horaNum,
      heroBadge: heroBadge.trim(),
      heroTitulo: heroTitulo.trim() || clubConfig.nombreClub,
      heroSubtitulo: heroSubtitulo.trim(),
      heroImagenUrl: heroImagenUrl.trim() || undefined,
      promosCantina: promosDraft,
    };
    if (onGuardarClubConfig) {
      await onGuardarClubConfig(nextCfg);
    } else {
      setClubConfig(nextCfg);
    }
    onNotificar('Banner principal y reglas horarias actualizados');
  };

  const agregarPromoCantina = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaPromoTitulo.trim() || !nuevaPromoPrecio.trim()) {
      onNotificar('Completa el título y precio de la promoción.');
      return;
    }
    const nueva: PromoCantina = {
      id: `promo-${Date.now()}`,
      titulo: nuevaPromoTitulo.trim(),
      descripcion: nuevaPromoDesc.trim(),
      precio: nuevaPromoPrecio.trim(),
      categoria: nuevaPromoCat,
      activo: true,
    };
    const nextPromos = [nueva, ...promosDraft];
    setPromosDraft(nextPromos);
    const nextCfg = { ...clubConfig, promosCantina: nextPromos };
    if (onGuardarClubConfig) {
      await onGuardarClubConfig(nextCfg);
    } else {
      setClubConfig(nextCfg);
    }
    setNuevaPromoTitulo('');
    setNuevaPromoDesc('');
    setNuevaPromoPrecio('');
    onNotificar('Promoción agregada y publicada en la portada');
  };

  const togglePromoActiva = async (id: string) => {
    const nextPromos = promosDraft.map((p) => (p.id === id ? { ...p, activo: !p.activo } : p));
    setPromosDraft(nextPromos);
    const nextCfg = { ...clubConfig, promosCantina: nextPromos };
    if (onGuardarClubConfig) {
      await onGuardarClubConfig(nextCfg);
    } else {
      setClubConfig(nextCfg);
    }
  };

  const eliminarPromo = async (id: string) => {
    const nextPromos = promosDraft.filter((p) => p.id !== id);
    setPromosDraft(nextPromos);
    const nextCfg = { ...clubConfig, promosCantina: nextPromos };
    if (onGuardarClubConfig) {
      await onGuardarClubConfig(nextCfg);
    } else {
      setClubConfig(nextCfg);
    }
    onNotificar('Promoción eliminada');
  };

  const previewImportacion = React.useMemo(
    () => (mostrarImportador && textoImportacion.trim() ? parsearPadronImportado(textoImportacion, jugadores) : null),
    [mostrarImportador, textoImportacion, jugadores]
  );

  const ejecutarImportacionPadron = async () => {
    if (!previewImportacion || previewImportacion.validos.length === 0) return;
    setImportandoBatch(true);
    try {
      if (onImportarJugadores) {
        await onImportarJugadores(previewImportacion.validos);
      } else {
        const nuevos = previewImportacion.validos.map((j, idx) => ({
          ...j,
          id: Date.now() + idx,
        }));
        setJugadores((prev) => [...prev, ...nuevos]);
        onNotificar(`Se importaron ${nuevos.length} jugadores correctamente al padrón.`);
      }
      setTextoImportacion('');
      setMostrarImportador(false);
    } finally {
      setImportandoBatch(false);
    }
  };

  const opcionesMenu = [
    {
      id: 'metricas' as const,
      label: 'Métricas Diarias',
      icono: <BarChart3 className="w-4 h-4 shrink-0" />,
      badge: 'Hoy',
      desc: 'Efectivo, Alias MP, turnos, cantina y control',
    },
    {
      id: 'eventos' as const,
      label: 'Eventos, Hero & Promos',
      icono: <Sparkles className="w-4 h-4 shrink-0" />,
      badge: cantidadDiasBloqueados > 0 ? `${cantidadDiasBloqueados} bloq.` : 'Portada',
      desc: 'Bloquear día, 08:00 hs, Banner y Promos',
    },
    {
      id: 'historial' as const,
      label: 'Historial de Turnos',
      icono: <History className="w-4 h-4 shrink-0" />,
      badge: `${cantidadTurnosOcupadosTotal} jug.`,
      desc: 'Registro por fecha, hora, pelotaris y cobro',
    },
    {
      id: 'horarios' as const,
      label: 'Turnos y Horarios',
      icono: <Clock className="w-4 h-4 shrink-0" />,
      badge: `${cantidadHorariosActivos}/${horarios.length}`,
      desc: 'Activar/desactivar y tarifas de cancha',
    },
    {
      id: 'caja' as const,
      label: 'Caja Diaria & Arqueo',
      icono: <Wallet className="w-4 h-4 shrink-0" />,
      badge: `${movimientosCaja.length} mov`,
      desc: 'Ingresos, egresos y saldo efectivo/banco',
    },
    {
      id: 'publicaciones' as const,
      label: 'Cartelera & Anuncios',
      icono: <Megaphone className="w-4 h-4 shrink-0" />,
      badge: `${cantidadPublicacionesActivas} activos`,
      desc: 'Torneos y avisos en la portada',
    },
    {
      id: 'socios' as const,
      label: 'Padrón & Seguro',
      icono: <Users className="w-4 h-4 shrink-0" />,
      badge: `${jugadores.length} jug.`,
      desc: 'Seguro, mensualidades, bloqueos e importar CSV',
    },
    {
      id: 'inventario' as const,
      label: 'Stock de Cantina',
      icono: <Package className="w-4 h-4 shrink-0" />,
      badge: `${productos.length} items`,
      desc: 'Bebidas, comidas y pelotas paleta',
    },
    {
      id: 'configuracion' as const,
      label: 'Códigos & Config Club',
      icono: <Settings className="w-4 h-4 shrink-0" />,
      badge: 'Claves',
      desc: 'Códigos Comisión/Cantina, Alias MP y Club',
    },
    {
      id: 'respaldo' as const,
      label: 'Copias & Respaldo',
      icono: <Database className="w-4 h-4 shrink-0" />,
      badge: 'JSON',
      desc: 'Exportar o importar datos del club',
    },
  ];

  const opcionActiva = opcionesMenu.find((o) => o.id === seccion) || opcionesMenu[0];

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-full">
      {/* NAVEGACIÓN MÓVIL: TARJETA SELECTORA + HOJA INFERIOR TÁCTIL (lg:hidden) */}
      <div className="lg:hidden w-full">
        <button
          type="button"
          onClick={() => setSheetAbierto(true)}
          className="w-full min-h-[56px] flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer transition text-left active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
              {opcionActiva.icono}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Módulo actual · Toca para cambiar
              </div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white font-display truncate">
                {opcionActiva.label}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {opcionActiva.badge}
            </span>
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </div>
        </button>

        <AdminBottomSheet
          open={sheetAbierto}
          opciones={opcionesMenu}
          seccionActiva={seccion}
          onSeleccionar={(id) => setSeccion(id)}
          onCerrar={() => setSheetAbierto(false)}
        />
      </div>

      {/* PANEL LATERAL IZQUIERDO PARA ESCRITORIO (hidden lg:block) */}
      <aside className="hidden lg:block w-full lg:w-64 xl:w-72 shrink-0">
        <div className="sticky top-20 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
          {/* Header del Sidebar */}
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>ADMINISTRACIÓN EXCLUSIVA</span>
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white font-display mt-0.5">
              Panel de Control
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Gestión total del club, publicaciones y cantina
            </p>
          </div>

          {/* Menú de Navegación Vertical Desktop */}
          <nav className="space-y-1">
            {opcionesMenu.map((opc) => (
              <button
                key={opc.id}
                onClick={() => setSeccion(opc.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  seccion === opc.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {opc.icono}
                  <span>{opc.label}</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold tabular-nums ${
                    seccion === opc.id
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {opc.badge}
                </span>
              </button>
            ))}
          </nav>

          {/* Quick Info Box in Sidebar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="text-[11px] font-bold uppercase text-slate-400">Hosting & Base de Datos</div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Persistencia:</span>
                <span
                  className={`font-semibold ${
                    supabaseActivo
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {supabaseActivo ? 'Supabase Cloud' : 'Modo Local'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Modo Público:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Solo Turnos</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Canchas activas:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {cantidadHorariosActivos} turnos
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Anuncios visibles:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {cantidadPublicacionesActivas} activos
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 min-w-0 space-y-6">
        {/* SECCIÓN MÉTRICAS DIARIAS (EXCLUSIVA COMISIÓN DIRECTIVA) */}
        {seccion === 'metricas' && (
          <AdminMetricasSection
            turnos={turnos}
            consumos={consumos}
            movimientosCaja={movimientosCaja}
            horarios={horarios}
            fechaInicial={fechaSeleccionada}
          />
        )}

        {/* SECCIÓN EVENTOS DEL DÍA, REGLA 08:00 HS, HERO BANNER & PROMOS */}
        {seccion === 'eventos' && (
          <div className="space-y-5">
            {/* Tarjeta 1: Bloqueo Total de Turnos del Día por Evento Especial */}
            <form
              onSubmit={guardarEventosDia}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-400">
                    <Ban className="w-4 h-4" />
                    <span>EVENTO ESPECIAL / SUSPENSIÓN TOTAL</span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display mt-0.5">
                    Bloquear Todos los Turnos de un Día
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    Si hay un torneo, cena, pintura o evento especial, bloqueá el día completo y definí el aviso que verán los jugadores en la portada.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end text-xs">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Fecha a configurar:
                  </label>
                  <input
                    type="date"
                    value={fechaEventoEdit}
                    onChange={(e) => setFechaEventoEdit(e.target.value || fechaSeleccionada)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold tabular-nums"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {evtBloqueado ? 'Día BLOQUEADO (Sin reservas públicas)' : 'Día HABILITADO (Turnos normales)'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Activa el interruptor para suspender todos los turnos de esa fecha.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={evtBloqueado}
                    aria-label="Toggle bloquear todos los turnos del día"
                    onClick={() => setEvtBloqueado((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      evtBloqueado ? 'bg-rose-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                        evtBloqueado ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="text-xs">
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Texto del Banner Informativo para Jugadores:
                </label>
                <input
                  type="text"
                  value={evtMotivo}
                  onChange={(e) => setEvtMotivo(e.target.value)}
                  placeholder="Ej: Cancha cerrada por Torneo Aniversario CARC — Volvemos mañana a las 08:00 hs."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {Object.values(diasBloqueados)
                    .filter((d) => d.bloqueado)
                    .map((d) => (
                      <button
                        key={d.fecha}
                        type="button"
                        onClick={() => setFechaEventoEdit(d.fecha)}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold cursor-pointer"
                      >
                        Bloqueado: {d.fecha}
                      </button>
                    ))}
                </div>

                <button
                  type="submit"
                  className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer ${
                    evtBloqueado
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {evtBloqueado ? 'Guardar Bloqueo del Día' : 'Guardar / Rehabilitar Día'}
                </button>
              </div>
            </form>

            {/* Tarjeta 2: Regla de Reserva en el Día desde 08:00 hs + Editor del Hero Principal */}
            <form
              onSubmit={guardarHeroYRegla}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
            >
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span>PORTADA PRINCIPAL & REGLA HORARIA</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display mt-0.5">
                  Banner Principal (Hero) y Apertura de Turnos
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Personaliza la portada del club y controla la apertura diaria de reservas desde las 08:00 hs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <div className="pr-3">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Turnos solo en el día (regla club)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Los jugadores solo pueden sacar turno para la fecha de hoy.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={cfgSoloEnElDia}
                    onClick={() => setCfgSoloEnElDia((prev) => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      cfgSoloEnElDia ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition ${
                        cfgSoloEnElDia ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Hora de habilitación diaria (Argentina 0-23 hs):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={cfgHoraApertura}
                    onChange={(e) => setCfgHoraApertura(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-bold tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Etiqueta superior del Hero:
                  </label>
                  <input
                    type="text"
                    value={heroBadge}
                    onChange={(e) => setHeroBadge(e.target.value)}
                    placeholder="Trinquete Oficial · Río Colorado"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    URL de imagen del Hero (opcional):
                  </label>
                  <input
                    type="text"
                    value={heroImagenUrl}
                    onChange={(e) => setHeroImagenUrl(e.target.value)}
                    placeholder="Dejar vacío para foto oficial del trinquete"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Título principal del Banner Hero:
                  </label>
                  <input
                    type="text"
                    value={heroTitulo}
                    onChange={(e) => setHeroTitulo(e.target.value)}
                    placeholder="Cancha de Pelota Paleta CARC"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Subtítulo / Bajada del Hero:
                  </label>
                  <textarea
                    rows={2}
                    value={heroSubtitulo}
                    onChange={(e) => setHeroSubtitulo(e.target.value)}
                    placeholder="Reservá tu turno en el día desde las 08:00 hs..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  Guardar Banner Hero y Regla 08:00 hs
                </button>
              </div>
            </form>

            {/* Tarjeta 3: Promociones de Comida y Bebida */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>PROMOCIONES DE CANTINA EN PORTADA</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display mt-0.5">
                  Promociones de Comidas y Bebidas ({promosDraft.length})
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Estas promos aparecen destacadas en la página principal para que todos los jugadores las vean antes y después de jugar.
                </p>
              </div>

              <form onSubmit={agregarPromoCantina} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Título de la promoción:
                  </label>
                  <input
                    type="text"
                    value={nuevaPromoTitulo}
                    onChange={(e) => setNuevaPromoTitulo(e.target.value)}
                    placeholder="Ej: Promo Tercer Tiempo"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Categoría:
                  </label>
                  <select
                    value={nuevaPromoCat}
                    onChange={(e) => setNuevaPromoCat(e.target.value as 'comida' | 'bebida' | 'combo')}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="combo">Combo</option>
                    <option value="comida">Comida</option>
                    <option value="bebida">Bebida</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Precio visible:
                  </label>
                  <input
                    type="text"
                    value={nuevaPromoPrecio}
                    onChange={(e) => setNuevaPromoPrecio(e.target.value)}
                    placeholder="Ej: $18.000"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Detalle (qué incluye):
                  </label>
                  <input
                    type="text"
                    value={nuevaPromoDesc}
                    onChange={(e) => setNuevaPromoDesc(e.target.value)}
                    placeholder="Ej: 2 Hamburguesas completas + 1 Quilmes 1L fría"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar Promo</span>
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {promosDraft.length === 0 ? (
                  <div className="md:col-span-2 p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                    No hay promociones cargadas todavía.
                  </div>
                ) : (
                  promosDraft.map((pr) => (
                    <div
                      key={pr.id}
                      className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                        pr.activo
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-65'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-extrabold uppercase">
                            {pr.categoria}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {pr.precio}
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {pr.titulo}
                        </div>
                        {pr.descripcion && (
                          <p className="text-xs text-slate-600 dark:text-slate-300">{pr.descripcion}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => togglePromoActiva(pr.id)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                            pr.activo
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {pr.activo ? 'Visible' : 'Oculta'}
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarPromo(pr.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Eliminar promoción"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN HISTORIAL COMPLETO DE TURNOS */}
        {seccion === 'historial' && (
          <AdminHistorialTurnosSection
            turnos={turnos}
            horarios={horarios}
            supabaseActivo={supabaseActivo}
            onCargarHistorialCompleto={onCargarHistorialTurnos}
          />
        )}

        {/* SECCIÓN 1: TURNOS Y HORARIOS */}
        {seccion === 'horarios' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                  Gestión de Turnos, Horarios y Precios
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Activa o desactiva los turnos que estarán visibles para que los socios reserven en la página del club.
                </p>
              </div>

              <button
                onClick={abrirModalNuevoHorario}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Nuevo Turno</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {horarios.map((h) => {
                const activo = h.activo !== false;
                return (
                  <div
                    key={h.id}
                    className={`p-5 rounded-2xl border transition-all duration-200 shadow-xs flex flex-col justify-between gap-4 ${
                      activo
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-50/80 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800/80 opacity-75'
                    }`}
                  >
                    <div>
                      {/* Top Header of the slot */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-2 rounded-lg ${
                              activo
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-extrabold text-slate-900 dark:text-white font-display">
                              {h.etiqueta}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              Duración estándar: 60 minutos
                            </div>
                          </div>
                        </div>

                        {/* Switch de Activar / Desactivar */}
                        <button
                          onClick={() => toggleHorarioActivo(h.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            activo
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                          title={activo ? 'Clic para desactivar (ocultar de la página)' : 'Clic para activar y mostrar a los usuarios'}
                        >
                          {activo ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Inactivo</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Info de precios */}
                      <div className="grid grid-cols-2 gap-3 py-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                            Alquiler Cancha
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm tabular-nums">
                            {formatearMoneda(h.precioCancha)}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                            Ficha de Luz
                          </span>
                          <span className="font-extrabold text-slate-700 dark:text-slate-200 text-sm tabular-nums">
                            {h.precioLuz > 0 ? formatearMoneda(h.precioLuz) : 'Sin cargo'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="text-[11px] text-slate-500">
                        Total reserva:{' '}
                        <strong className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">
                          {formatearMoneda(h.precioCancha + h.precioLuz)}
                        </strong>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => abrirModalEditarHorario(h)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Modificar</span>
                        </button>

                        <button
                          onClick={() => eliminarHorario(h.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Eliminar este turno"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN CAJA DIARIA */}
        {seccion === 'caja' && (
          <AdminCajaSection
            movimientosCaja={movimientosCaja}
            setMovimientosCaja={setMovimientosCaja}
            onNotificar={onNotificar}
            onSolicitarConfirmacion={onSolicitarConfirmacion}
            onAgregarMovimiento={onAgregarMovimientoCaja}
            onEliminarMovimiento={onEliminarMovimientoCaja}
          />
        )}

        {/* SECCIÓN 2: CARTELERA & PUBLICACIONES EN LA PÁGINA PRINCIPAL */}
        {seccion === 'publicaciones' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Cartelera Oficial & Publicaciones del Club</span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Crea avisos, convocatorias a torneos y listas de precios de cantina que se mostrarán en la página principal para todos los socios.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={abrirModalNuevaPublicacion}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear Publicación</span>
                </button>
              </div>
            </div>

            {/* Listado de publicaciones */}
            <div className="space-y-3">
              {publicaciones.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No hay publicaciones creadas en la cartelera. Haz clic en "Crear Publicación" para anunciar un torneo o publicar precios.
                </div>
              ) : (
                publicaciones.map((pub) => (
                  <div
                    key={pub.id}
                    className={`p-5 rounded-2xl border transition-all duration-200 shadow-xs flex flex-col md:flex-row md:items-start justify-between gap-4 ${
                      pub.activo
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-50/80 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800/80 opacity-70'
                    }`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {pub.etiquetaBadge && (
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              pub.categoria === 'cantina'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {pub.etiquetaBadge}
                          </span>
                        )}

                        {pub.destacado && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Destacado
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400">Publicado: {pub.fecha}</span>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white font-display">
                        {pub.titulo}
                      </h4>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {pub.contenido}
                      </p>
                    </div>

                    <div className="flex md:flex-col items-center gap-2 shrink-0 md:border-l md:border-slate-100 md:dark:border-slate-800 md:pl-4">
                      <button
                        onClick={() => togglePublicacionActivo(pub.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer w-full justify-center ${
                          pub.activo
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                        title={pub.activo ? 'Clic para ocultar de la página principal' : 'Clic para mostrar en la página principal'}
                      >
                        {pub.activo ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>En Portada</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Oculto</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1 w-full justify-end">
                        <button
                          onClick={() => abrirModalEditarPublicacion(pub)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => eliminarPublicacion(pub.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Eliminar publicación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN 3: PADRÓN DE SOCIOS Y JUGADORES */}
        {seccion === 'socios' && (() => {
          const termSocio = busquedaSocio.trim().toLowerCase();
          const estadosPorId = new Map(
            jugadores.map((j) => [j.id, evaluarEstadoFinancieroJugador(j, { clubConfig })])
          );
          const cantConDeudaOVencidos = jugadores.filter((j) => {
            const est = estadosPorId.get(j.id);
            return Boolean(est && (est.mensualidadVencida || est.mostrarAvisoPorVencer || est.deudaCantina > 0));
          }).length;
          const cantNoPagaron = jugadores.filter((j) => {
            if (j.esSocioClub === false) return false;
            const est = estadosPorId.get(j.id);
            return Boolean(est && !est.mensualidadPaga);
          }).length;
          const cantPagaron = jugadores.filter((j) => {
            if (j.esSocioClub === false) return false;
            const est = estadosPorId.get(j.id);
            return Boolean(est && est.mensualidadPaga);
          }).length;
          const cantBloqueados = jugadores.filter((j) => Boolean(j.bloqueadoTurnos)).length;

          const jugadoresFiltrados = jugadores.filter((j) => {
            const est = estadosPorId.get(j.id);
            if (filtroSocioEstado === 'bloqueados' && !j.bloqueadoTurnos) return false;
            if (
              filtroSocioEstado === 'no_pagaron' &&
              !(j.esSocioClub !== false && est && !est.mensualidadPaga)
            ) {
              return false;
            }
            if (
              filtroSocioEstado === 'pagaron' &&
              !(j.esSocioClub !== false && est && est.mensualidadPaga)
            ) {
              return false;
            }
            if (
              filtroSocioEstado === 'deuda_vencida' &&
              !(est && (est.mensualidadVencida || est.mostrarAvisoPorVencer || est.deudaCantina > 0))
            ) {
              return false;
            }
            if (!termSocio) return true;
            return (
              j.nombre.toLowerCase().includes(termSocio) ||
              (j.dni || '').toLowerCase().includes(termSocio) ||
              (j.localidad || '').toLowerCase().includes(termSocio) ||
              (j.numeroSocio || '').toLowerCase().includes(termSocio) ||
              j.categoria.toLowerCase().includes(termSocio)
            );
          });

          return (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                  Padrón de Pelotaris & Socios ({jugadores.length})
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Control de mensualidad / seguro (vencimiento día {clubConfig.diaVencimientoMensualidad ?? 10}), pagos por Alias Mercado Pago o Efectivo, cantina y bloqueo de turnos.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMostrarImportador((prev) => !prev)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{mostrarImportador ? 'Cerrar Importador' : 'Importar Planilla (CSV)'}</span>
                </button>

                <button
                  onClick={() => {
                    setJugadorEditando(null);
                    setNombreJugador('');
                    setApellidoJugador('');
                    setDniJugador('');
                    setFechaNacJugador('');
                    setEmailJugador('');
                    setLocalidadJugador('Río Colorado');
                    setRolJugador('Delantero');
                    setCategoriaJugador('2da');
                    setManoHabilJugador('Derecha');
                    setEsSocioClubJugador(true);
                    setNumeroSocioJugador('');
                    setContactoEmergenciaJugador('');
                    setObservacionesJugador('');
                    setTelefonoJugador('');
                    setSaldoJugador('0');
                    setUltimoMesPagoJugador('');
                    setBloqueadoTurnosJugador(false);
                    setMotivoBloqueoJugador('');
                    setModalJugador(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Pelotari</span>
                </button>
              </div>
            </div>

            {mostrarImportador && (
              <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-4 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Importar Planilla de Pelotaris / Seguro (Excel, CSV o Google Sheets)</span>
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                      Subí un archivo .CSV/.TSV o pegá directamente las filas desde la planilla de seguro (detecta Nombre, Apellido, DNI, Fecha Nac., Teléfono, Localidad, Email y Obra Social/Seguro).
                    </p>
                  </div>

                  <label className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold cursor-pointer hover:bg-emerald-50 transition shrink-0 text-center">
                    <span>Subir archivo .CSV / .TSV</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setTextoImportacion(String(ev.target?.result || ''));
                        };
                        reader.readAsText(f);
                      }}
                    />
                  </label>
                </div>

                <textarea
                  rows={5}
                  value={textoImportacion}
                  onChange={(e) => setTextoImportacion(e.target.value)}
                  placeholder={'Nombre,Apellido,DNI,Fecha Nacimiento,Telefono,Localidad,Email,Obra Social\nJuan,Perez,32456789,1990-05-14,2931412233,Rio Colorado,juan@mail.com,IPROSS'}
                  className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-[11px]"
                />

                {previewImportacion && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Listos para importar: {previewImportacion.validos.length}
                      </span>
                      {previewImportacion.duplicados.length > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Omitidos (ya existen): {previewImportacion.duplicados.length}
                        </span>
                      )}
                      {previewImportacion.errores.length > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold">
                          Con error de formato: {previewImportacion.errores.length}
                        </span>
                      )}
                    </div>

                    {previewImportacion.validos.length > 0 && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={importandoBatch}
                          onClick={ejecutarImportacionPadron}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-bold shadow-xs transition cursor-pointer"
                        >
                          {importandoBatch
                            ? 'Importando...'
                            : `Importar ${previewImportacion.validos.length} Pelotaris al Padrón`}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={busquedaSocio}
                  onChange={(e) => setBusquedaSocio(e.target.value)}
                  placeholder="Buscar por nombre, DNI, localidad, N° de socio o categoría..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setFiltroSocioEstado('todos')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filtroSocioEstado === 'todos'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Todos ({jugadores.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSocioEstado('no_pagaron')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filtroSocioEstado === 'no_pagaron'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  No pagaron ({cantNoPagaron})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSocioEstado('pagaron')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filtroSocioEstado === 'pagaron'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Pagaron ({cantPagaron})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSocioEstado('deuda_vencida')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filtroSocioEstado === 'deuda_vencida'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Deuda / Por vencer ({cantConDeudaOVencidos})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroSocioEstado('bloqueados')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    filtroSocioEstado === 'bloqueados'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Bloqueados ({cantBloqueados})
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Pelotari / DNI</th>
                      <th className="px-4 py-3">Perfil / Contacto</th>
                      <th className="px-4 py-3">Mensualidad / Seguro (Día {clubConfig.diaVencimientoMensualidad ?? 10})</th>
                      <th className="px-4 py-3 text-right">Cantina / Cta. Cte.</th>
                      <th className="px-4 py-3 text-center">Bloquear Turnos</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {jugadoresFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                          {jugadores.length === 0
                            ? 'El padrón está limpio. Los pelotaris pueden registrarse desde la portada ("Registrarme") o podés cargarlos con "Nuevo Pelotari".'
                            : 'No hay pelotaris que coincidan con tu búsqueda o filtro.'}
                        </td>
                      </tr>
                    ) : (
                      jugadoresFiltrados.map((j) => {
                        const est = estadosPorId.get(j.id) || evaluarEstadoFinancieroJugador(j, { clubConfig });
                        return (
                        <tr
                          key={j.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                            !j.activo ? 'opacity-60' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{j.nombre}</span>
                              {j.bloqueadoTurnos && (
                                <span title="Turnos bloqueados por Comisión" className="inline-flex items-center">
                                  <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                              {j.dni && <span className="tabular-nums">DNI {j.dni}</span>}
                              {j.localidad && <span>· {j.localidad}</span>}
                              <span
                                className={`font-semibold ${
                                  j.esSocioClub === false
                                    ? 'text-slate-500'
                                    : 'text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                · {j.esSocioClub === false ? 'Invitado' : j.numeroSocio ? `Socio #${j.numeroSocio}` : 'Socio CARC'}
                              </span>
                            </div>
                            {!j.activo && (
                              <span className="text-[10px] uppercase font-bold text-rose-500">
                                Inactivo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 space-y-0.5">
                            <div className="text-emerald-700 dark:text-emerald-400 font-bold">
                              Cat. {j.categoria} · {j.rol}
                            </div>
                            {j.telefono && (
                              <a
                                href={`https://wa.me/${j.telefono.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1 font-semibold tabular-nums text-[11px]"
                              >
                                <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                {j.telefono}
                              </a>
                            )}
                            {j.email && <div className="text-[10px] text-slate-500">{j.email}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1.5">
                              <span
                                className={`text-[11px] font-extrabold ${
                                  est.estadoMensualidad === 'no_aplica'
                                    ? 'text-slate-500'
                                    : est.mensualidadPaga
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : est.mensualidadVencida
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : est.mostrarAvisoPorVencer
                                    ? 'text-amber-700 dark:text-amber-300'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {est.estadoMensualidad === 'no_aplica'
                                  ? 'No aplica (Invitado)'
                                  : est.mensualidadPaga
                                  ? `Pagó · ${est.nombreMesActual}`
                                  : est.mensualidadVencida
                                  ? `No pagó · Vencida (${est.nombreMesActual})`
                                  : est.mostrarAvisoPorVencer
                                  ? est.diasParaVencimiento === 0
                                    ? `No pagó · Vence hoy (día ${est.diaVencimiento})`
                                    : `No pagó · Por vencer (${est.diasParaVencimiento}d)`
                                  : `No pagó (${est.nombreMesActual})`}
                              </span>
                              {j.esSocioClub !== false && (
                                <div className="flex flex-wrap items-center gap-1">
                                  {!est.mensualidadPaga ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSocioMensualidad(j);
                                        setMesMensualidadPago(mesActual);
                                        setMontoMensualidadPago(
                                          String(clubConfig.montoMensualidad ?? 15000)
                                        );
                                        setMetodoMensualidadPago('transferencia');
                                        setDesbloquearAlPagar(Boolean(j.bloqueadoTurnos));
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                    >
                                      <CalendarCheck2 className="w-3 h-3" />
                                      <span>Informar Pagó</span>
                                    </button>
                                  ) : (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => marcarNoPagoMensualidad(j)}
                                        className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-[10px] font-bold transition cursor-pointer"
                                        title={`Informar que ${j.nombre} NO pagó ${est.nombreMesActual}`}
                                      >
                                        Informar No Pagó
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSocioMensualidad(j);
                                          setMesMensualidadPago(mesActual);
                                          setMontoMensualidadPago(
                                            String(clubConfig.montoMensualidad ?? 15000)
                                          );
                                          setMetodoMensualidadPago('transferencia');
                                          setDesbloquearAlPagar(Boolean(j.bloqueadoTurnos));
                                        }}
                                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold transition cursor-pointer"
                                      >
                                        Otro mes
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div
                              className={`font-extrabold tabular-nums ${
                                j.saldoCuentaCorriente < 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : j.saldoCuentaCorriente > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {formatearMoneda(j.saldoCuentaCorriente)}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSocioSaldando(j);
                                setMontoSaldoPago(
                                  j.saldoCuentaCorriente < 0
                                    ? String(Math.abs(j.saldoCuentaCorriente))
                                    : ''
                                );
                                setMetodoSaldoPago('efectivo');
                              }}
                              className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold transition cursor-pointer"
                              title="Registrar pago / acreditar cantina"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Cobrar</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={Boolean(j.bloqueadoTurnos)}
                                aria-label={`Bloquear turnos para ${j.nombre}`}
                                onClick={() => toggleBloqueoTurnos(j)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                  j.bloqueadoTurnos
                                    ? 'bg-rose-600'
                                    : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                                title={
                                  j.bloqueadoTurnos
                                    ? 'Bloqueado para sacar turnos (clic para habilitar)'
                                    : 'Habilitado (clic para bloquear reservas por deuda/mensualidad)'
                                }
                              >
                                <span
                                  aria-hidden="true"
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    j.bloqueadoTurnos ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                              <span
                                className={`text-[10px] font-bold ${
                                  j.bloqueadoTurnos
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                {j.bloqueadoTurnos ? 'Bloqueado' : 'Habilitado'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleSocioActivo(j)}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  j.activo
                                    ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title={j.activo ? 'Desactivar socio' : 'Activar socio'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setJugadorEditando(j);
                                  const partes = j.nombre.split(' ');
                                  setNombreJugador(j.nombrePila || partes[0] || j.nombre);
                                  setApellidoJugador(j.apellido || partes.slice(1).join(' ') || '');
                                  setDniJugador(j.dni || '');
                                  setFechaNacJugador(j.fechaNacimiento || '');
                                  setEmailJugador(j.email || '');
                                  setLocalidadJugador(j.localidad || 'Río Colorado');
                                  setRolJugador(j.rol);
                                  setCategoriaJugador(j.categoria);
                                  setManoHabilJugador(j.manoHabil || 'Derecha');
                                  setEsSocioClubJugador(j.esSocioClub !== false);
                                  setNumeroSocioJugador(j.numeroSocio || '');
                                  setContactoEmergenciaJugador(j.contactoEmergencia || '');
                                  setObservacionesJugador(j.observaciones || '');
                                  setTelefonoJugador(j.telefono || '');
                                  setSaldoJugador(j.saldoCuentaCorriente.toString());
                                  setUltimoMesPagoJugador(j.ultimoMesPago || '');
                                  setBloqueadoTurnosJugador(Boolean(j.bloqueadoTurnos));
                                  setMotivoBloqueoJugador(j.motivoBloqueo || '');
                                  setModalJugador(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Editar socio"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => eliminarSocio(j)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Eliminar socio"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          );
        })()}

        {/* SECCIÓN 4: INVENTARIO DE CANTINA */}
        {seccion === 'inventario' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                  Stock e Insumos del Buffet ({productos.length})
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Control de bebidas, comidas, pelotas y paletas para la cantina del club.
                </p>
              </div>

              <button
                onClick={() => {
                  setProdEditando(null);
                  setProdNombre('');
                  setProdPrecio('');
                  setProdCosto('');
                  setProdStock('');
                  setProdMinimo('5');
                  setModalProducto(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Producto</span>
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">Categoría</th>
                      <th className="px-4 py-3 text-right">Precio Venta</th>
                      <th className="px-4 py-3 text-right">Costo</th>
                      <th className="px-4 py-3 text-center">Stock Actual</th>
                      <th className="px-4 py-3 text-center">Reposición Rápida</th>
                      <th className="px-4 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {productos.map((p) => {
                      const bajoStock = p.stock <= p.stockMinimo;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{p.nombre}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300 capitalize">
                            {p.categoria.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-3 text-right font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {formatearMoneda(p.precio)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400 tabular-nums">
                            {formatearMoneda(p.costo)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold tabular-nums ${
                                p.stock === 0
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                                  : bajoStock
                                  ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                              }`}
                            >
                              {p.stock} {p.unidad}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  if (onAjustarStockProducto) {
                                    onAjustarStockProducto(p, -1);
                                  } else {
                                    setProductos((prev) =>
                                      prev.map((item) =>
                                        item.id === p.id ? { ...item, stock: Math.max(0, item.stock - 1) } : item
                                      )
                                    );
                                  }
                                }}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                              >
                                -1
                              </button>
                              <button
                                onClick={() => {
                                  if (onAjustarStockProducto) {
                                    onAjustarStockProducto(p, 6);
                                  } else {
                                    setProductos((prev) =>
                                      prev.map((item) =>
                                        item.id === p.id ? { ...item, stock: item.stock + 6 } : item
                                      )
                                    );
                                  }
                                }}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                              >
                                +6
                              </button>
                              <button
                                onClick={() => {
                                  if (onAjustarStockProducto) {
                                    onAjustarStockProducto(p, 12);
                                  } else {
                                    setProductos((prev) =>
                                      prev.map((item) =>
                                        item.id === p.id ? { ...item, stock: item.stock + 12 } : item
                                      )
                                    );
                                  }
                                }}
                                className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 rounded text-xs font-bold cursor-pointer"
                              >
                                +12
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setProdEditando(p);
                                  setProdNombre(p.nombre);
                                  setProdCat(p.categoria);
                                  setProdPrecio(p.precio.toString());
                                  setProdCosto(p.costo.toString());
                                  setProdStock(p.stock.toString());
                                  setProdMinimo(p.stockMinimo.toString());
                                  setProdUnidad(p.unidad);
                                  setModalProducto(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                title="Editar producto"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => eliminarProducto(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                title="Eliminar producto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN 5: CONFIGURACIÓN GENERAL & SEGURIDAD PIN */}
        {seccion === 'configuracion' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                  Configuración y Seguridad Administrativa
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Establece la clave PIN de acceso al panel para que los socios no puedan acceder a la cantina ni a la administración.
                </p>
              </div>

              {/* Autenticación Admin (Supabase Auth vs PIN Local) */}
              {supabaseActivo ? (
                <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Autenticación Segura Activa (Supabase Auth)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    Sesión validada en la nube con el usuario <strong>{adminEmail || 'Administrador'}</strong> y protegida por Row Level Security (`public.admin_users`).
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Clave PIN de Acceso Administrador (Modo Local)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Esta es la clave de 4 dígitos que se solicita al presionar "Admin" en el encabezado cuando no hay base de datos conectada. Por defecto es 1942.
                  </p>
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      type="password"
                      maxLength={8}
                      value={nuevoPin}
                      onChange={(e) => setNuevoPin(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-bold"
                    />
                    <button
                      onClick={() => {
                        if (!nuevoPin.trim()) return;
                        setAdminPin(nuevoPin.trim());
                        onNotificar('Clave PIN de administrador actualizada con éxito');
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Guardar PIN
                    </button>
                  </div>
                </div>
              )}

              {/* Códigos de Acceso Institucional por Panel (Comisión Directiva & Cantina) */}
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <KeyRound className="w-4 h-4" />
                  <span>Códigos de Acceso por Panel (Comisión Directiva & Cantina)</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Cualquier integrante de la Comisión Directiva (2 o 3 personas con su propia cuenta) puede ingresar el{' '}
                  <strong>Código Comisión</strong> al registrarse o desde &quot;Mi Perfil&quot; para obtener acceso total. La cantinera ingresa el{' '}
                  <strong>Código Cantina</strong> y solo accede a Cantina y Turnos (sin reportes ni métricas).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="font-bold text-slate-800 dark:text-slate-200 block">
                      Código Comisión Directiva (Super Admin):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={codigoComisionInput}
                        onChange={(e) => setCodigoComisionInput(e.target.value.toUpperCase())}
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono font-bold uppercase"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!codigoComisionInput.trim()) return;
                          if (onGuardarAccessCode) {
                            await onGuardarAccessCode('admin', codigoComisionInput.trim().toUpperCase());
                          } else {
                            onNotificar('Código de Comisión Directiva actualizado');
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition cursor-pointer shrink-0"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <label className="font-bold text-slate-800 dark:text-slate-200 block">
                      Código Panel Cantina y Turnos (Encargado):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={codigoCantinaInput}
                        onChange={(e) => setCodigoCantinaInput(e.target.value.toUpperCase())}
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-mono font-bold uppercase"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!codigoCantinaInput.trim()) return;
                          if (onGuardarAccessCode) {
                            await onGuardarAccessCode('cantinero', codigoCantinaInput.trim().toUpperCase());
                          } else {
                            onNotificar('Código de Cantina y Turnos actualizado');
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white rounded-lg font-bold transition cursor-pointer shrink-0"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggle de Modo Mesas */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Habilitar Modo Mesas en Cantina (Optativo)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl">
                    Por defecto la cantina opera de la forma más simple: anotando directamente a la persona lo que consumió.
                    Si activas esta opción, podrás opcionalmente especificar el número de mesa o sector.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    const proximo = !modoMesasActivo;
                    setModoMesasActivo(proximo);
                    const nextCfg = { ...clubConfig, modoMesasActivo: proximo };
                    if (onGuardarClubConfig) {
                      await onGuardarClubConfig(nextCfg);
                    } else {
                      setClubConfig(nextCfg);
                      onNotificar(`Modo mesas ${proximo ? 'activado' : 'desactivado'}`);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    modoMesasActivo ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  role="switch"
                  aria-checked={modoMesasActivo}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      modoMesasActivo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Configuración Institucional, Alias de Transferencia y Agenda */}
              <form
                onSubmit={guardarConfigClub}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
              >
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Datos del Club, Transferencias y Calendario</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Nombre del Club:
                    </label>
                    <input
                      type="text"
                      value={cfgNombreClub}
                      onChange={(e) => setCfgNombreClub(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Teléfono Secretaría / WhatsApp:
                    </label>
                    <input
                      type="text"
                      value={cfgTelefono}
                      onChange={(e) => setCfgTelefono(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Alias Mercado Pago / CBU para Transferencias:
                    </label>
                    <input
                      type="text"
                      value={cfgAlias}
                      onChange={(e) => setCfgAlias(e.target.value)}
                      placeholder="CARC.TRINQUETE.RC"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Titular Cuenta Bancaria:
                    </label>
                    <input
                      type="text"
                      value={cfgTitular}
                      onChange={(e) => setCfgTitular(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Días visibles en Turnero (1 a 30):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={cfgDiasAnticipacion}
                      onChange={(e) => setCfgDiasAnticipacion(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Valor Cuota / Seguro Mensual ($):
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={cfgMontoMensualidad}
                      onChange={(e) => setCfgMontoMensualidad(e.target.value)}
                      placeholder="15000"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-bold tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Día de vencimiento mensual (1 a 28):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={cfgDiaVencimiento}
                      onChange={(e) => setCfgDiaVencimiento(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition cursor-pointer"
                  >
                    Guardar Datos del Club
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SECCIÓN 6: DESCARGAS, RESPALDOS Y REINICIO */}
        {seccion === 'respaldo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-600 text-white">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                    Descargar Copia de Seguridad Completa
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Exporta turnos, socios, cartelera, torneo, caja y stock en formato JSON.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Guarda este archivo en tu computadora para mantener copias de respaldo de todas las reservas y cuentas.
              </p>

              <button
                onClick={descargarRespaldo}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>DESCARGAR ARCHIVO DE RESPALDO (.JSON)</span>
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                    Restaurar Respaldo
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Carga un archivo exportado previamente para restaurar el sistema.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Selecciona el archivo .json guardado con anterioridad para sincronizar turnos, publicaciones y productos.
              </p>

              <label className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition border border-slate-300 dark:border-slate-700">
                <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>SELECCIONAR ARCHIVO DE RESPALDO</span>
                <input type="file" accept=".json" onChange={importarRespaldo} className="hidden" />
              </label>
            </div>

            <div className="md:col-span-2 p-6 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
                <RotateCcw className="w-4 h-4" />
                <span>Acción de Mantenimiento: Reiniciar Turnos de la Fecha ({fechaSeleccionada})</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Libera todos los turnos del día {fechaSeleccionada} dejándolos listos para nuevos partidos. Las demás fechas, socios, publicaciones y productos se conservan.
              </p>
              <button
                type="button"
                onClick={() => {
                  onSolicitarConfirmacion({
                    titulo: 'Reiniciar Turnos del Día',
                    mensaje: `¿Estás seguro de que deseas liberar todos los turnos del día ${fechaSeleccionada}?`,
                    confirmLabel: 'Sí, reiniciar día',
                    variant: 'danger',
                    onConfirm: onReiniciarDia,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Turnos del {fechaSeleccionada}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal Horario / Turno (Agregar o Editar) */}
      {modalHorario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
              {horarioEditando ? 'Modificar Turno y Horario' : 'Nuevo Turno de Cancha'}
            </h3>

            <form onSubmit={guardarHorario} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Hora de Inicio:
                  </label>
                  <input
                    type="time"
                    required
                    value={horarioInicio}
                    onChange={(e) => {
                      setHorarioInicio(e.target.value);
                      if (!horarioEditando) {
                        setHorarioEtiqueta(`${e.target.value} a ${horarioFin} hs`);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Hora de Finalización:
                  </label>
                  <input
                    type="time"
                    required
                    value={horarioFin}
                    onChange={(e) => {
                      setHorarioFin(e.target.value);
                      if (!horarioEditando) {
                        setHorarioEtiqueta(`${horarioInicio} a ${e.target.value} hs`);
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Etiqueta Visible:
                </label>
                <input
                  type="text"
                  required
                  value={horarioEtiqueta}
                  onChange={(e) => setHorarioEtiqueta(e.target.value)}
                  placeholder="Ej: 18:00 a 19:00 hs"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Precio Alquiler Cancha ($):
                  </label>
                  <input
                    type="number"
                    required
                    value={horarioPrecioCancha}
                    onChange={(e) => setHorarioPrecioCancha(e.target.value)}
                    placeholder="12000"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-extrabold tabular-nums"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Costo Ficha de Luz ($):
                  </label>
                  <input
                    type="number"
                    value={horarioPrecioLuz}
                    onChange={(e) => setHorarioPrecioLuz(e.target.value)}
                    placeholder="2500"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold tabular-nums"
                  />
                </div>
              </div>

              {/* Activar/Desactivar */}
              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={horarioActivo}
                    onChange={(e) => setHorarioActivo(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      Turno Activo (Visible en el sitio web)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Si lo desactivas, los socios no lo verán en la página de reservas.
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalHorario(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Guardar Horario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Publicación */}
      {modalPublicacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{pubEditando ? 'Modificar Publicación' : 'Nueva Publicación para la Portada'}</span>
              </h3>
            </div>

            {/* Botones de plantillas rápidas */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                Plantillas Rápidas:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => aplicarPlantillaPublicacion('torneo')}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Plantilla: Anunciar Torneo</span>
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPlantillaPublicacion('cantina')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Plantilla: Precios de Cantina</span>
                </button>
              </div>
            </div>

            <form onSubmit={guardarPublicacion} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título de la Publicación:
                </label>
                <input
                  type="text"
                  required
                  value={pubTitulo}
                  onChange={(e) => setPubTitulo(e.target.value)}
                  placeholder="Ej: 🏆 Gran Torneo de Pelota Paleta este Sábado"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Categoría:
                  </label>
                  <select
                    value={pubCategoria}
                    onChange={(e) => {
                      const val = e.target.value as CategoriaPublicacion;
                      setPubCategoria(val);
                      if (val === 'torneo') setPubEtiqueta('Torneo Oficial');
                      if (val === 'cantina') setPubEtiqueta('Precios Buffet');
                      if (val === 'aviso') setPubEtiqueta('Aviso del Club');
                      if (val === 'general') setPubEtiqueta('Novedad');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="torneo">Torneo / Competencia</option>
                    <option value="cantina">Cantina & Precios</option>
                    <option value="aviso">Aviso / Mantenimiento</option>
                    <option value="general">General / Noticias</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Etiqueta (Badge):
                  </label>
                  <input
                    type="text"
                    value={pubEtiqueta}
                    onChange={(e) => setPubEtiqueta(e.target.value)}
                    placeholder="Ej: Torneo Oficial, Precios Buffet"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Contenido / Detalle del Anuncio:
                </label>
                <textarea
                  required
                  rows={4}
                  value={pubContenido}
                  onChange={(e) => setPubContenido(e.target.value)}
                  placeholder="Detalla aquí las fechas, precios de cantina, inscripciones, premios o información relevante que los socios deben ver..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={pubActivo}
                    onChange={(e) => setPubActivo(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Visible en Portada</div>
                    <div className="text-[10px] text-slate-500">Se muestra en la página principal</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={pubDestacado}
                    onChange={(e) => setPubDestacado(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Destacar Anuncio</div>
                    <div className="text-[10px] text-slate-500">Borde y estilo resaltado</div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalPublicacion(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Publicar en la Portada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Jugador (Ficha Completa) */}
      {modalJugador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
              {jugadorEditando ? 'Editar Ficha de Pelotari' : 'Registrar Nuevo Pelotari / Socio'}
            </h3>

            <form onSubmit={guardarJugador} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={nombreJugador}
                    onChange={(e) => setNombreJugador(e.target.value)}
                    placeholder="Ej: Juan Pablo"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={apellidoJugador}
                    onChange={(e) => setApellidoJugador(e.target.value)}
                    placeholder="Ej: Pérez"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    DNI
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={dniJugador}
                    onChange={(e) => setDniJugador(e.target.value)}
                    placeholder="Ej: 34567890"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={fechaNacJugador}
                    onChange={(e) => setFechaNacJugador(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Teléfono WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={telefonoJugador}
                    onChange={(e) => setTelefonoJugador(e.target.value)}
                    placeholder="Ej: +54 9 2931 445566"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={emailJugador}
                    onChange={(e) => setEmailJugador(e.target.value)}
                    placeholder="pelotari@email.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Rol en Cancha:
                  </label>
                  <select
                    value={rolJugador}
                    onChange={(e) => setRolJugador(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="Delantero">Delantero</option>
                    <option value="Zaguero">Zaguero</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Categoría:
                  </label>
                  <select
                    value={categoriaJugador}
                    onChange={(e) => setCategoriaJugador(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="1ra">1ra División</option>
                    <option value="2da">2da División</option>
                    <option value="3ra">3ra División</option>
                    <option value="Promocional">Promocional</option>
                    <option value="Veteranos">Veteranos</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mano Hábil:
                  </label>
                  <select
                    value={manoHabilJugador}
                    onChange={(e) => setManoHabilJugador(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="Derecha">Derecha</option>
                    <option value="Zurda">Zurda</option>
                    <option value="Ambidiestro">Ambidiestro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Localidad
                  </label>
                  <input
                    type="text"
                    value={localidadJugador}
                    onChange={(e) => setLocalidadJugador(e.target.value)}
                    placeholder="Río Colorado"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Condición Club
                  </label>
                  <select
                    value={esSocioClubJugador ? 'socio' : 'invitado'}
                    onChange={(e) => setEsSocioClubJugador(e.target.value === 'socio')}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="socio">Socio CARC</option>
                    <option value="invitado">No Socio / Invitado</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    N° de Socio
                  </label>
                  <input
                    type="text"
                    disabled={!esSocioClubJugador}
                    value={numeroSocioJugador}
                    onChange={(e) => setNumeroSocioJugador(e.target.value)}
                    placeholder="Opcional"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Contacto de Emergencia
                  </label>
                  <input
                    type="text"
                    value={contactoEmergenciaJugador}
                    onChange={(e) => setContactoEmergenciaJugador(e.target.value)}
                    placeholder="Nombre y teléfono"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Saldo Cta. Corriente ($):
                  </label>
                  <input
                    type="number"
                    value={saldoJugador}
                    onChange={(e) => setSaldoJugador(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Último Mes de Mensualidad Paga
                  </label>
                  <input
                    type="month"
                    value={ultimoMesPagoJugador}
                    onChange={(e) => setUltimoMesPagoJugador(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Bloqueo de Turnos (Comisión)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={bloqueadoTurnosJugador}
                      onChange={(e) => setBloqueadoTurnosJugador(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Bloquear reservas de turnos
                    </span>
                  </label>
                </div>
                {bloqueadoTurnosJugador && (
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Motivo visible del bloqueo:
                    </label>
                    <input
                      type="text"
                      value={motivoBloqueoJugador}
                      onChange={(e) => setMotivoBloqueoJugador(e.target.value)}
                      placeholder="Ej: Mensualidad vencida / Saldo pendiente en cantina"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Observaciones / Aclaraciones
                </label>
                <input
                  type="text"
                  value={observacionesJugador}
                  onChange={(e) => setObservacionesJugador(e.target.value)}
                  placeholder="Obra social, horarios o notas opcionales"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalJugador(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Guardar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Producto */}
      {modalProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
              {prodEditando ? 'Editar Producto Cantina' : 'Nuevo Producto Cantina'}
            </h3>

            <form onSubmit={guardarProducto} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nombre del Producto:
                </label>
                <input
                  type="text"
                  required
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                  placeholder="Ej: Cerveza Patagonia 730ml"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Categoría:
                  </label>
                  <select
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="bebidas">Bebidas</option>
                    <option value="comidas">Comidas & Minutas</option>
                    <option value="snacks">Snacks & Kiosco</option>
                    <option value="pelota_paleta">Pelota Paleta</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Unidad:
                  </label>
                  <input
                    type="text"
                    value={prodUnidad}
                    onChange={(e) => setProdUnidad(e.target.value)}
                    placeholder="Unidad, Porción, Botella"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Precio Venta ($):
                  </label>
                  <input
                    type="number"
                    required
                    value={prodPrecio}
                    onChange={(e) => setProdPrecio(e.target.value)}
                    placeholder="5800"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Costo ($):
                  </label>
                  <input
                    type="number"
                    required
                    value={prodCosto}
                    onChange={(e) => setProdCosto(e.target.value)}
                    placeholder="3600"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Stock Inicial:
                  </label>
                  <input
                    type="number"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="24"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Stock Mínimo Alerta:
                  </label>
                  <input
                    type="number"
                    required
                    value={prodMinimo}
                    onChange={(e) => setProdMinimo(e.target.value)}
                    placeholder="8"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalProducto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Saldar / Registrar Pago de Cuenta Corriente */}
      {socioSaldando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
              Registrar Pago / Acreditar Saldo
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Socio: <strong className="text-slate-900 dark:text-white">{socioSaldando.nombre}</strong> · Saldo actual:{' '}
              <strong className={socioSaldando.saldoCuentaCorriente < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                {formatearMoneda(socioSaldando.saldoCuentaCorriente)}
              </strong>
            </p>

            <form onSubmit={confirmarPagoSaldo} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Monto que entrega ($):
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={montoSaldoPago}
                  onChange={(e) => setMontoSaldoPago(e.target.value)}
                  placeholder="Ej: 15000"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-extrabold tabular-nums text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMetodoSaldoPago('efectivo')}
                  className={`flex-1 py-2 rounded-lg font-bold transition cursor-pointer ${
                    metodoSaldoPago === 'efectivo'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoSaldoPago('transferencia')}
                  className={`flex-1 py-2 rounded-lg font-bold transition cursor-pointer ${
                    metodoSaldoPago === 'transferencia'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Transferencia
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSocioSaldando(null)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition cursor-pointer"
                >
                  Confirmar Ingreso a Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Informar Pago de Mensualidad / Seguro */}
      {socioMensualidad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Informar Pago de Mensualidad / Seguro</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Pelotari: <strong className="text-slate-900 dark:text-white">{socioMensualidad.nombre}</strong>
              <br />
              Último mes pago:{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatearPeriodoMes(socioMensualidad.ultimoMesPago)}
              </strong>
            </p>

            <form onSubmit={confirmarPagoMensualidad} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mes que abona:
                </label>
                <input
                  type="month"
                  required
                  value={mesMensualidadPago}
                  onChange={(e) => setMesMensualidadPago(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-bold tabular-nums text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Monto cuota / seguro ($) — 0 si solo marcás estado:
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={montoMensualidadPago}
                  onChange={(e) => setMontoMensualidadPago(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 font-extrabold tabular-nums text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Medio de pago informado:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoMensualidadPago('transferencia')}
                    className={`flex-1 py-2 rounded-lg font-bold transition cursor-pointer ${
                      metodoMensualidadPago === 'transferencia'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Alias Mercado Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setMetodoMensualidadPago('efectivo')}
                    className={`flex-1 py-2 rounded-lg font-bold transition cursor-pointer ${
                      metodoMensualidadPago === 'efectivo'
                        ? 'bg-slate-800 dark:bg-slate-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Efectivo
                  </button>
                </div>
                {metodoMensualidadPago === 'transferencia' && clubConfig.aliasTransferencia && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Transferencia verificada al Alias MP:{' '}
                    <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                      {clubConfig.aliasTransferencia}
                    </strong>
                  </div>
                )}
              </div>

              {socioMensualidad.bloqueadoTurnos && (
                <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                  <input
                    type="checkbox"
                    checked={desbloquearAlPagar}
                    onChange={(e) => setDesbloquearAlPagar(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Desbloquear turnos automáticamente al confirmar
                  </span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSocioMensualidad(null)}
                  className="px-3 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition cursor-pointer"
                >
                  Confirmar Pagó
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
