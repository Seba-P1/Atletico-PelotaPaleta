import React, { useState, useEffect } from 'react';
import heroTrinqueteImg from '../assets/images/hero_pelota_paleta_1794003931590.jpg';
import pelotasImg from '../assets/images/pelotas_y_paletas_1794003932921.jpg';
import { Turno, HorarioConfig, Jugador, PublicacionClub, ClubConfig, DiaBloqueado, RolAcceso } from '../types';
import {
  formatearMoneda,
  generarMensajeWhatsAppTurno,
  filtrarHorariosVisibles,
  obtenerTurnosDeFecha,
  calcularOcupacionFecha,
  generarProximosDias,
  evaluarVentanaReserva,
  evaluarBloqueoDia,
  obtenerFechaHoraArgentina,
  evaluarHorarioPasado,
  evaluarLimiteTurnoDiario,
} from '../utils/turnosLogic';
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Share2,
  Zap,
  Info,
  Wrench,
  Coffee,
  ArrowRight,
  EyeOff,
  SlidersHorizontal,
  Megaphone,
  Trophy,
  Lock,
  UserPlus,
  LogIn,
  AlertTriangle,
  Ban,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
import { evaluarEstadoFinancieroJugador } from '../utils/billingLogic';

interface TurneroViewProps {
  turnos: Record<string, Turno>;
  horarios: HorarioConfig[];
  jugadores: Jugador[];
  publicaciones: PublicacionClub[];
  clubConfig: ClubConfig;
  diasBloqueados?: Record<string, DiaBloqueado>;
  fechaSeleccionada: string;
  setFechaSeleccionada: (fecha: string) => void;
  onAbrirReserva: (horarioId: string) => void;
  onAbrirDetalle: (turnoId: string) => void;
  onIrACantinaConTurno: (turnoId: string, clienteNombre: string) => void;
  esAdmin: boolean;
  rolAcceso?: RolAcceso;
  usuarioAutenticado?: boolean;
  jugadorLogueado?: Jugador | null;
  usuarioNombre?: string | null;
  sessionEmail?: string | null;
  userId?: string | null;
  onAbrirPerfil?: () => void;
  onLiberarTurno: (turnoId: string) => void;
  onBloquearMantenimiento?: (horarioId: string) => void;
  onIrAAdminPublicaciones?: () => void;
  onIrAAdminEventos?: () => void;
  onAbrirIngresar?: () => void;
  onAbrirRegistroJugador?: () => void;
  onSolicitarConfirmacion?: (cfg: {
    titulo: string;
    mensaje: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void;
  }) => void;
}

export const TurneroView: React.FC<TurneroViewProps> = ({
  turnos,
  horarios,
  jugadores,
  publicaciones,
  clubConfig,
  diasBloqueados = {},
  fechaSeleccionada,
  setFechaSeleccionada,
  onAbrirReserva,
  onAbrirDetalle,
  onIrACantinaConTurno,
  esAdmin,
  rolAcceso,
  usuarioAutenticado = false,
  jugadorLogueado = null,
  usuarioNombre = null,
  sessionEmail = null,
  userId = null,
  onAbrirPerfil,
  onLiberarTurno,
  onBloquearMantenimiento,
  onIrAAdminPublicaciones,
  onIrAAdminEventos,
  onAbrirIngresar,
  onAbrirRegistroJugador,
  onSolicitarConfirmacion,
}) => {
  const esSuperAdmin = rolAcceso ? rolAcceso === 'super_admin' : esAdmin;
  const esStaff = rolAcceso ? rolAcceso === 'super_admin' || rolAcceso === 'cantinero' : esAdmin;

  const [ahoraTick, setAhoraTick] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhoraTick(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const horariosVisibles = filtrarHorariosVisibles(horarios, esStaff);
  const horariosActivosParaStats = horarios.filter((h) => h.activo !== false);
  const publicacionesActivas = publicaciones.filter((p) => p.activo);
  const promosActivas = (clubConfig.promosCantina || []).filter((p) => p.activo);
  const bloqueoDia = evaluarBloqueoDia(fechaSeleccionada, diasBloqueados);
  const ventanaReserva = evaluarVentanaReserva({
    fechaSeleccionada,
    soloTurnosEnElDia: clubConfig.soloTurnosEnElDia,
    horaAperturaTurnos: clubConfig.horaAperturaTurnos,
    diasBloqueados,
    esStaff,
    ahora: ahoraTick,
  });
  const hoyArgentina = obtenerFechaHoraArgentina(ahoraTick).fechaIso;

  const [horarioFiltroDisp, setHorarioFiltroDisp] = useState<string>(
    horariosVisibles[0]?.id || horarios[0]?.id || '18-19'
  );
  const [mostrarHero, setMostrarHero] = useState<boolean>(true);

  const turnosDelDia = obtenerTurnosDeFecha(turnos, fechaSeleccionada);
  const stats = calcularOcupacionFecha(turnosDelDia, horariosActivosParaStats);
  const proximosDias = generarProximosDias(clubConfig.diasAnticipacionReserva || 7, hoyArgentina);
  const requiereRegistro = !usuarioAutenticado && !esStaff;
  const limiteDiario = evaluarLimiteTurnoDiario({
    turnos,
    fechaSeleccionada,
    esStaff,
    nombreUsuario: jugadorLogueado?.nombre || (usuarioAutenticado ? usuarioNombre : null),
    emailUsuario: sessionEmail || jugadorLogueado?.email,
    userId,
  });

  useEffect(() => {
    if (clubConfig.soloTurnosEnElDia !== false && fechaSeleccionada !== hoyArgentina) {
      setFechaSeleccionada(hoyArgentina);
    }
  }, [hoyArgentina, clubConfig.soloTurnosEnElDia, fechaSeleccionada, setFechaSeleccionada]);

  // Fecha legible
  const fechaObj = new Date(fechaSeleccionada + 'T12:00:00');
  const fechaLegible = fechaObj.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Disponibilidad de jugadores para el horario seleccionado en la fecha activa
  const turnoSeleccionado = turnosDelDia[horarioFiltroDisp];
  const jugadoresOcupadosEnHora = new Set<string>();

  if (turnoSeleccionado && turnoSeleccionado.estado === 'ocupado') {
    if (turnoSeleccionado.p1?.delantero) jugadoresOcupadosEnHora.add(turnoSeleccionado.p1.delantero);
    if (turnoSeleccionado.p1?.zaguero) jugadoresOcupadosEnHora.add(turnoSeleccionado.p1.zaguero);
    if (turnoSeleccionado.p2?.delantero) jugadoresOcupadosEnHora.add(turnoSeleccionado.p2.delantero);
    if (turnoSeleccionado.p2?.zaguero) jugadoresOcupadosEnHora.add(turnoSeleccionado.p2.zaguero);
  }

  const jugadoresLibresEnHora = jugadores.filter(
    (j) => j.activo && !jugadoresOcupadosEnHora.has(j.nombre)
  );
  const jugadoresOcupadosList = jugadores.filter(
    (j) => j.activo && jugadoresOcupadosEnHora.has(j.nombre)
  );

  return (
    <div className="space-y-6">
      {/* Hero Visual Section (Editable por Comisión Directiva) */}
      {mostrarHero && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-md">
          <div className="min-h-[224px] sm:min-h-[236px] lg:min-h-[264px] w-full relative flex flex-col justify-end p-4 sm:p-6">
            <img
              src={clubConfig.heroImagenUrl?.trim() || heroTrinqueteImg || '/images/hero-trinquete.jpg'}
              alt={clubConfig.heroTitulo || 'Cancha de Pelota Paleta Trinquete CARC'}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center brightness-75"
              onError={(e) => {
                (e.target as HTMLImageElement).src = pelotasImg || '/images/pelotas.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-bold text-emerald-400 mb-1 uppercase tracking-wide">
                  <span>{clubConfig.nombreClub}</span>
                  <span aria-hidden="true">·</span>
                  <span>{clubConfig.heroBadge || 'TRINQUETE OFICIAL'}</span>
                </div>
                <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-white font-display tracking-tight text-balance leading-tight">
                  {clubConfig.heroTitulo || 'Cancha de Pelota Paleta CARC'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-200 mt-1.5 max-w-xl">
                  {clubConfig.heroSubtitulo ||
                    'Reservá tu turno en el día desde las 08:00 hs, consultá las promociones de la cantina y mantené tu seguro al día.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {esSuperAdmin && onIrAAdminEventos && (
                  <button
                    type="button"
                    onClick={onIrAAdminEventos}
                    className="text-xs text-white font-bold px-2.5 py-1 rounded-md bg-emerald-600/85 hover:bg-emerald-600 border border-emerald-400/40 backdrop-blur-xs transition cursor-pointer whitespace-nowrap flex items-center gap-1"
                  >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Editar Banner</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMostrarHero(false)}
                  className="text-xs text-white/80 hover:text-white px-2.5 py-1 rounded-md bg-black/50 border border-white/20 backdrop-blur-xs transition cursor-pointer whitespace-nowrap"
                >
                  Ocultar banner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Banner Informativo de Día Bloqueado por Evento Especial */}
      {bloqueoDia.bloqueado && (
        <div
          role="alert"
          className="rounded-2xl border-2 border-rose-400 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/45 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm text-rose-950 dark:text-rose-100"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0">
              <Ban className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-extrabold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                Jornada Suspendida por Evento Especial ({fechaSeleccionada})
              </div>
              <p className="text-sm font-bold leading-snug">
                {bloqueoDia.motivo}
              </p>
              <p className="text-[11px] opacity-85">
                {esStaff
                  ? 'Los turnos públicos están bloqueados para esta jornada. Como personal autorizado podés gestionar excepciones o desbloquear el día desde el Panel de Comisión.'
                  : 'Todos los turnos de cancha permanecen bloqueados durante esta fecha por disposición de la Comisión Directiva.'}
              </p>
            </div>
          </div>

          {esSuperAdmin && onIrAAdminEventos && (
            <button
              type="button"
              onClick={onIrAAdminEventos}
              className="px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shrink-0 cursor-pointer transition"
            >
              Gestionar Bloqueo
            </button>
          )}
        </div>
      )}

      {/* Aviso de Acceso Requerido para Invitados */}
      {requiereRegistro && (
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/90 dark:bg-emerald-950/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 dark:text-emerald-100 text-xs shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="font-extrabold">Solo usuarios registrados pueden reservar turnos</div>
              <p className="text-[11px] opacity-90">
                Ingresá con tu cuenta o registrate como pelotari para poder reservar la cancha (máximo 1 turno por día).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onAbrirIngresar && (
              <button
                type="button"
                onClick={onAbrirIngresar}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-100 dark:hover:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </button>
            )}
            {onAbrirRegistroJugador && (
              <button
                type="button"
                onClick={onAbrirRegistroJugador}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrarme</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Aviso de Límite Diario: 1 turno por día por persona */}
      {!requiereRegistro && !esStaff && limiteDiario.alcanzado && (
        <div
          role="status"
          className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/35 p-4 flex items-start gap-3 text-amber-950 dark:text-amber-100 text-xs shadow-xs"
        >
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="font-extrabold">
              Ya tenés tu turno reservado para hoy ({limiteDiario.turnoExistente?.horarioId} hs)
            </div>
            <p className="text-[11px] opacity-90">
              Solo se permite reservar 1 turno por día por persona. Si necesitás modificarlo o cancelarlo, comunicate con cantina o administración.
            </p>
          </div>
        </div>
      )}

      {/* Aviso de Regla Horaria: Reservas únicamente en el día desde 08:00 hs */}
      {!bloqueoDia.bloqueado && clubConfig.soloTurnosEnElDia !== false && !ventanaReserva.habilitado && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/90 dark:bg-amber-950/35 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-100 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="font-extrabold">
                {ventanaReserva.antesDeApertura
                  ? `Turnos habilitados desde las ${String(ventanaReserva.horaApertura).padStart(2, '0')}:00 hs`
                  : 'Reservas públicas habilitadas únicamente en el día'}
              </div>
              <p className="text-[11px] opacity-90">{ventanaReserva.motivo}</p>
            </div>
          </div>
          {!ventanaReserva.esHoy && (
            <button
              type="button"
              onClick={() => setFechaSeleccionada(hoyArgentina)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 cursor-pointer transition"
            >
              Ir a Hoy ({hoyArgentina})
            </button>
          )}
        </div>
      )}

      {/* Aviso de Mensualidad, Cantina o Bloqueo para el Jugador Logueado */}
      {(() => {
        if (!jugadorLogueado) return null;
        const estado = evaluarEstadoFinancieroJugador(jugadorLogueado, { clubConfig });
        if (!estado.requiereAtencion) return null;
        const esCritico = estado.bloqueadoTurnos || estado.mensualidadVencida;

        return (
          <div
            role="alert"
            className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
              esCritico
                ? 'bg-rose-50 dark:bg-rose-950/35 border-rose-300 dark:border-rose-800/70 text-rose-900 dark:text-rose-100'
                : 'bg-amber-50 dark:bg-amber-950/35 border-amber-300 dark:border-amber-700/70 text-amber-950 dark:text-amber-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  esCritico
                    ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                }`}
              >
                {estado.bloqueadoTurnos ? (
                  <Ban className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-extrabold">
                  {estado.bloqueadoTurnos
                    ? 'Tus reservas de turnos están bloqueadas por la Comisión Directiva'
                    : estado.mensualidadVencida
                    ? 'Aviso de mensualidad vencida y saldo pendiente'
                    : 'Aviso importante sobre tu cuenta de pelotari'}
                </div>
                <div className="text-[11px] opacity-90 space-y-0.5">
                  {!estado.mensualidadPaga &&
                    (estado.mostrarAvisoPorVencer || estado.mensualidadVencida) &&
                    estado.mensajeMensualidad && <div>• {estado.mensajeMensualidad}</div>}
                  {estado.deudaCantina > 0 && (
                    <div className="tabular-nums">
                      • Deuda pendiente en cantina: <strong>{formatearMoneda(estado.deudaCantina)}</strong>
                    </div>
                  )}
                  {estado.bloqueadoTurnos && estado.motivoBloqueo && (
                    <div>• Motivo informado: {estado.motivoBloqueo}</div>
                  )}
                </div>
              </div>
            </div>

            {onAbrirPerfil && (
              <button
                type="button"
                onClick={onAbrirPerfil}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                  esCritico
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                Ver Mi Perfil
              </button>
            )}
          </div>
        );
      })()}

      {/* Date Selector */}
      {clubConfig.soloTurnosEnElDia !== false ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>Día del Partido: <strong>HOY</strong></span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  {hoyArgentina}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Las reservas se habilitan únicamente en el día a partir de las {String(clubConfig.horaAperturaTurnos ?? 8).padStart(2, '0')}:00 hs (hora Argentina).
              </p>
            </div>
          </div>
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 capitalize">
            {fechaLegible}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Selecciona el Día del Partido</span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="selector-fecha-manual" className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Otra fecha:
              </label>
              <input
                id="selector-fecha-manual"
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => {
                  if (e.target.value) setFechaSeleccionada(e.target.value);
                }}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {proximosDias.map((dia) => {
              const seleccionado = fechaSeleccionada === dia.fecha;
              return (
                <button
                  key={dia.fecha}
                  type="button"
                  onClick={() => setFechaSeleccionada(dia.fecha)}
                  className={`flex flex-col items-center justify-center min-w-[66px] px-3 py-2 rounded-xl border text-center transition cursor-pointer shrink-0 ${
                    seleccionado
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-400'
                  }`}
                >
                  <span
                    className={`text-[10px] font-extrabold tracking-wider ${
                      seleccionado ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    {dia.diaSemana}
                  </span>
                  <span className="text-sm font-extrabold font-display tabular-nums leading-tight">
                    {dia.numeroDia}
                  </span>
                  <span
                    className={`text-[10px] capitalize ${
                      seleccionado ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {dia.mesCorto}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Date & Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Fecha Activa
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white capitalize">
              {fechaLegible}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Turnos Disponibles
            </div>
            <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {stats.libres} {stats.libres === 1 ? 'libre' : 'libres'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Turnos Reservados
            </div>
            <div className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
              {stats.ocupados} {stats.ocupados === 1 ? 'reservado' : 'reservados'} ({stats.tasaOcupacion}%)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400">
            <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
              Ficha de Luz
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Activa nocturna (18+ hs)
            </div>
          </div>
        </div>
      </div>

      {/* PROMOCIONES DE CANTINA & BUFFET (Editables desde Comisión Directiva) */}
      {promosActivas.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white font-display uppercase tracking-wider">
                Promociones de Cantina · Comidas & Bebidas
              </h2>
            </div>
            {esSuperAdmin && onIrAAdminEventos && (
              <button
                type="button"
                onClick={onIrAAdminEventos}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Editar Promociones</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {promosActivas.map((promo) => (
              <div
                key={promo.id}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs flex flex-col justify-between gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 shrink-0" />
                      <span>
                        {promo.categoria === 'comida'
                          ? 'Comida'
                          : promo.categoria === 'bebida'
                          ? 'Bebida'
                          : 'Combo Buffet'}
                      </span>
                    </span>
                    {promo.precio && (
                      <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {promo.precio}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-display">
                    {promo.titulo}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {promo.descripcion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CARTELERA OFICIAL & PUBLICACIONES DEL CLUB */}
      {publicacionesActivas.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white font-display uppercase tracking-wider">
                Cartelera Oficial & Novedades del Club
              </h2>
            </div>
            {esSuperAdmin && onIrAAdminPublicaciones && (
              <button
                onClick={onIrAAdminPublicaciones}
                className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Administrar Anuncios</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publicacionesActivas.map((pub) => {
              const esTorneo = pub.categoria === 'torneo';
              const esCantina = pub.categoria === 'cantina';

              return (
                <div
                  key={pub.id}
                  className={`p-5 rounded-2xl border transition shadow-xs flex flex-col justify-between gap-3 ${
                    pub.destacado
                      ? 'bg-gradient-to-br from-white via-emerald-50/20 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 border-emerald-400 dark:border-emerald-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                        {esTorneo ? (
                          <Trophy className="w-4 h-4 shrink-0" />
                        ) : esCantina ? (
                          <Coffee className="w-4 h-4 shrink-0" />
                        ) : (
                          <Megaphone className="w-4 h-4 shrink-0" />
                        )}
                        <span>{pub.etiquetaBadge || (esTorneo ? 'Torneo' : esCantina ? 'Cantina' : 'Aviso')}</span>
                        {pub.destacado && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-600 dark:text-slate-300">Destacado</span>
                          </>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 tabular-nums">{pub.fecha}</span>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-display leading-snug">
                      {pub.titulo}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {pub.contenido}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center justify-between">
                    <span>{clubConfig.nombreClub}</span>
                    <span>Información Oficial</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Grid: Turnos Cards */}
      <div id="turnero-horarios" className="space-y-4 scroll-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white font-display">
              Turnos de Cancha Disponibles
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {esStaff
                ? 'Modo Operativo: podés reservar, editar parejas o invitados, cobrar y liberar turnos.'
                : clubConfig.soloTurnosEnElDia !== false
                ? `Reservas abiertas en el día a partir de las ${String(clubConfig.horaAperturaTurnos ?? 8).padStart(2, '0')}:00 hs.`
                : 'Selecciona un turno libre para reservar la cancha.'}
            </p>
          </div>

          {esSuperAdmin && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Configura horarios en Panel Comisión</span>
            </div>
          )}
        </div>

        {horariosVisibles.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
            No hay turnos activos para reservar en este momento. El administrador puede activarlos desde el Panel de Control.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {horariosVisibles.map((h) => {
              const turno = turnosDelDia[h.id] || {
                id: `${fechaSeleccionada}__${h.id}`,
                horarioId: h.id,
                fecha: fechaSeleccionada,
                estado: 'libre',
              };
              const ocupado = turno.estado === 'ocupado';
              const mantenimiento = turno.estado === 'mantenimiento' || turno.estado === 'bloqueado';
              const estaInactivo = h.activo === false;
              const horarioPasado = evaluarHorarioPasado({
                fechaSeleccionada,
                inicio: h.inicio,
                ahora: ahoraTick,
              });
              const noDisponiblePorPasado = !ocupado && !mantenimiento && !estaInactivo && horarioPasado.pasado;

              return (
                <div
                  key={h.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4.5 transition-all duration-200 shadow-xs ${
                    estaInactivo
                      ? 'bg-slate-100 dark:bg-slate-950/80 border-dashed border-slate-300 dark:border-slate-700 opacity-80'
                      : ocupado
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      : mantenimiento
                      ? 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 opacity-85'
                      : noDisponiblePorPasado
                      ? 'bg-slate-100/90 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 opacity-75'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/50 hover:border-emerald-500 dark:hover:border-emerald-600 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                          <span className="text-base font-extrabold text-slate-900 dark:text-white font-display tabular-nums">
                            {h.etiqueta}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          Cancha {formatearMoneda(h.precioCancha)} {h.precioLuz > 0 && `· Luz ${formatearMoneda(h.precioLuz)}`}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-1.5 text-xs font-bold">
                        {estaInactivo ? (
                          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Inactivo</span>
                          </span>
                        ) : ocupado ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-700 dark:text-slate-300">Ocupado</span>
                            {turno?.p1 && turno?.p2 && (() => {
                              const completos = [
                                turno.p1.delantero,
                                turno.p1.zaguero,
                                turno.p2.delantero,
                                turno.p2.zaguero,
                              ].map((s) => (s || '').trim()).filter(Boolean).length;
                              if (completos < 4) {
                                return (
                                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/60">
                                    {completos}/4 jugadores
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : mantenimiento ? (
                          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Mantenimiento</span>
                          </span>
                        ) : noDisponiblePorPasado ? (
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Horario pasado</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400">Disponible</span>
                        )}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="py-3">
                      {ocupado && turno.p1 && turno.p2 ? (
                        <div className="space-y-2">
                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs">
                            <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">
                              Pareja 1
                            </div>
                            <div className="text-slate-900 dark:text-white font-medium">
                              <span
                                className={
                                  turno.p1.delantero
                                    ? 'font-bold'
                                    : 'italic text-slate-400 dark:text-slate-500'
                                }
                              >
                                {turno.p1.delantero || 'A confirmar'}
                              </span>{' '}
                              (D) /{' '}
                              <span
                                className={
                                  turno.p1.zaguero
                                    ? 'font-bold'
                                    : 'italic text-slate-400 dark:text-slate-500'
                                }
                              >
                                {turno.p1.zaguero || 'A confirmar'}
                              </span>{' '}
                              (Z)
                            </div>
                          </div>

                          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs">
                            <div className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                              Pareja 2
                            </div>
                            <div className="text-slate-900 dark:text-white font-medium">
                              <span
                                className={
                                  turno.p2.delantero
                                    ? 'font-bold'
                                    : 'italic text-slate-400 dark:text-slate-500'
                                }
                              >
                                {turno.p2.delantero || 'A confirmar'}
                              </span>{' '}
                              (D) /{' '}
                              <span
                                className={
                                  turno.p2.zaguero
                                    ? 'font-bold'
                                    : 'italic text-slate-400 dark:text-slate-500'
                                }
                              >
                                {turno.p2.zaguero || 'A confirmar'}
                              </span>{' '}
                              (Z)
                            </div>
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                            <span>
                              Org: <strong className="text-slate-800 dark:text-slate-200">{turno.organizadorNombre || 'Club'}</strong>
                            </span>
                            <span>
                              {turno.pagado ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Abonado ✅</span>
                              ) : (
                                <span className="text-slate-600 dark:text-slate-400 font-semibold">Abonar en cantina ⏳</span>
                              )}
                            </span>
                          </div>
                        </div>
                      ) : mantenimiento ? (
                        <div className="py-4 text-center text-xs text-slate-600 dark:text-slate-400 space-y-1">
                          <Wrench className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                          <p className="font-semibold">Cancha bloqueada por mantenimiento o evento.</p>
                          {turno.notas && <p className="text-[11px] text-slate-500 italic">{turno.notas}</p>}
                        </div>
                      ) : noDisponiblePorPasado ? (
                        <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                          <p className="font-semibold">Turno no disponible para reserva.</p>
                          <p className="text-[11px] opacity-80">{horarioPasado.motivo || 'El horario de este turno ya comenzó o finalizó.'}</p>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                          <p>Cancha libre para partido de 4 pelotaris (2 parejas).</p>
                          <div className="text-emerald-700 dark:text-emerald-400 font-bold text-xs tabular-nums">
                            Total turno: {formatearMoneda(h.precioCancha + h.precioLuz)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 flex items-center gap-2">
                    {ocupado ? (
                      <>
                        <button
                          onClick={() => onAbrirDetalle(turno.id)}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5 text-slate-500" />
                          <span>Ver Detalle</span>
                        </button>

                        <button
                          onClick={() => {
                            const waUrl = `https://wa.me/?text=${generarMensajeWhatsAppTurno(turno, h.etiqueta, fechaLegible)}`;
                            window.open(waUrl, '_blank');
                          }}
                          className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition cursor-pointer"
                          title="Compartir partido en WhatsApp"
                          aria-label={`Compartir turno ${h.etiqueta} en WhatsApp`}
                        >
                          <Share2 className="w-4 h-4" />
                        </button>

                        {esStaff && (
                          <button
                            onClick={() => onIrACantinaConTurno(turno.id, turno.organizadorNombre || 'Turno ' + h.etiqueta)}
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 transition cursor-pointer"
                            title="Anotar consumición de cantina para este partido"
                            aria-label={`Anotar consumición de cantina para turno ${h.etiqueta}`}
                          >
                            <Coffee className="w-4 h-4" />
                          </button>
                        )}

                        {esStaff && (
                          <button
                            onClick={() => {
                              if (onSolicitarConfirmacion) {
                                onSolicitarConfirmacion({
                                  titulo: 'Liberar Turno',
                                  mensaje: `¿Deseas cancelar la reserva y liberar el turno ${h.etiqueta} del ${fechaSeleccionada}?`,
                                  confirmLabel: 'Sí, liberar',
                                  variant: 'danger',
                                  onConfirm: () => onLiberarTurno(turno.id),
                                });
                              } else {
                                onLiberarTurno(turno.id);
                              }
                            }}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 transition cursor-pointer"
                          >
                            Liberar
                          </button>
                        )}
                      </>
                    ) : mantenimiento ? (
                      esStaff ? (
                        <button
                          onClick={() => onLiberarTurno(turno.id)}
                          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                        >
                          Habilitar Cancha
                        </button>
                      ) : (
                        <div className="w-full py-2 text-center text-[11px] font-semibold text-slate-400">
                          No disponible para reserva
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        {(() => {
                          const yaTieneTurnoHoy = !esStaff && limiteDiario.alcanzado;
                          const reservaBloqueada =
                            !ventanaReserva.habilitado ||
                            horarioPasado.pasado ||
                            requiereRegistro ||
                            yaTieneTurnoHoy;
                          return (
                            <button
                              type="button"
                              disabled={reservaBloqueada}
                              onClick={() => onAbrirReserva(h.id)}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition ${
                                reservaBloqueada
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                              }`}
                            >
                              {reservaBloqueada ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>
                                    {horarioPasado.pasado
                                      ? `Horario finalizado (${h.inicio} hs)`
                                      : ventanaReserva.esDiaBloqueado
                                      ? 'Bloqueado por Evento'
                                      : !ventanaReserva.habilitado
                                      ? ventanaReserva.antesDeApertura
                                        ? `Habilita ${String(ventanaReserva.horaApertura).padStart(2, '0')}:00 hs`
                                        : 'Solo hoy'
                                      : requiereRegistro
                                      ? 'Solo usuarios registrados'
                                      : 'Máximo 1 turno por día'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span>Reservar Cancha</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          );
                        })()}

                        {esStaff && onBloquearMantenimiento && (
                          <button
                            type="button"
                            onClick={() => onBloquearMantenimiento(h.id)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer shrink-0"
                            title="Bloquear este horario por mantenimiento o torneo"
                            aria-label={`Bloquear horario ${h.etiqueta} por mantenimiento`}
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Availability by Hour & Players Padrón */}
      <div id="disponibilidad-jugadores" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 scroll-mt-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Disponibilidad de Pelotaris por Horario</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Consulta quiénes están libres en el horario seleccionado para armar partidos el {fechaLegible}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!usuarioAutenticado && !esStaff && onAbrirIngresar && (
              <button
                type="button"
                onClick={onAbrirIngresar}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-600/35 dark:border-emerald-700/60 text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </button>
            )}
            {!usuarioAutenticado && !esStaff && onAbrirRegistroJugador && (
              <button
                type="button"
                onClick={onAbrirRegistroJugador}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrarme como Pelotari</span>
              </button>
            )}
            <label htmlFor="filtro-disp-horario" className="text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
              Ver turno:
            </label>
            <select
              id="filtro-disp-horario"
              value={horarioFiltroDisp}
              onChange={(e) => setHorarioFiltroDisp(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white font-bold"
            >
              {horariosVisibles.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Jugadores Libres */}
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/15 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pelotaris Libres ({jugadoresLibresEnHora.length})</span>
              </div>
              <span className="text-[11px] text-slate-500">Listos para jugar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {jugadoresLibresEnHora.length === 0 ? (
                <div className="col-span-2 py-6 px-3 text-center space-y-2.5 bg-white/70 dark:bg-slate-950/40 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800/60">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {jugadores.length === 0
                      ? 'Todavía no hay pelotaris registrados en el padrón oficial del club.'
                      : 'Todos los pelotaris activos están en cancha en este horario.'}
                  </p>
                  {jugadores.length === 0 && onAbrirRegistroJugador && (
                    <button
                      type="button"
                      onClick={onAbrirRegistroJugador}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Completar mi Registro</span>
                    </button>
                  )}
                </div>
              ) : (
                jugadoresLibresEnHora.map((j) => (
                  <div
                    key={j.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-200">{j.nombre}</div>
                      <div className="text-[10px] text-slate-500">
                        {j.rol} · Cat. {j.categoria}
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                      Libre
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Jugadores Ocupados */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Pelotaris en Cancha ({jugadoresOcupadosList.length})</span>
              </div>
              <span className="text-[11px] text-slate-500">En partido</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {jugadoresOcupadosList.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-xs text-slate-500">
                  No hay pelotaris ocupados en este turno. ¡La cancha está libre!
                </div>
              ) : (
                jugadoresOcupadosList.map((j) => (
                  <div
                    key={j.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs shadow-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-200">{j.nombre}</div>
                      <div className="text-[10px] text-slate-500">
                        {j.rol} · Cat. {j.categoria}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                      Jugando
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
