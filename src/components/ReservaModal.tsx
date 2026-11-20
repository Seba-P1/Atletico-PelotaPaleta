import React, { useState, useEffect } from 'react';
import { HorarioConfig, Jugador, Turno, ParejaTurno, MetodoPago, ClubConfig, DiaBloqueado } from '../types';
import {
  formatearMoneda,
  validarReserva,
  generarClaveTurno,
  evaluarVentanaReserva,
  formatearObservacionInvitado,
  combinarNotasInvitado,
} from '../utils/turnosLogic';
import { evaluarJugadoresParaReserva } from '../utils/billingLogic';
import { X, CheckCircle, AlertCircle, Clock, Zap, CreditCard, UserPlus, AlertTriangle, Ban } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ReservaModalProps {
  horario: HorarioConfig;
  fechaStr: string;
  jugadores: Jugador[];
  clubConfig: ClubConfig;
  diasBloqueados?: Record<string, DiaBloqueado>;
  usuarioActual: string;
  jugadorLogueado?: Jugador | null;
  esAdmin?: boolean;
  onAbrirRegistroJugador?: () => void;
  onConfirmarReserva: (turnoData: Turno, pagadoAhora: boolean, metodoPago?: MetodoPago) => void;
  onCerrar: () => void;
}

export const ReservaModal: React.FC<ReservaModalProps> = ({
  horario,
  fechaStr,
  jugadores,
  clubConfig,
  diasBloqueados = {},
  usuarioActual,
  jugadorLogueado = null,
  esAdmin = false,
  onAbrirRegistroJugador,
  onConfirmarReserva,
  onCerrar,
}) => {
  const activos = jugadores.filter((j) => j.activo);
  const delanteros = activos.filter((j) => j.rol === 'Delantero' || j.rol === 'Ambos');
  const zagueros = activos.filter((j) => j.rol === 'Zaguero' || j.rol === 'Ambos');

  const usuarioEnDelanteros = delanteros.find((d) => d.nombre === usuarioActual)?.nombre;
  const usuarioEnZagueros = zagueros.find((z) => z.nombre === usuarioActual)?.nombre;

  const [p1Delantero, setP1Delantero] = useState<string>(
    usuarioEnDelanteros || delanteros[0]?.nombre || ''
  );
  const [p1Zaguero, setP1Zaguero] = useState<string>(
    (!usuarioEnDelanteros && usuarioEnZagueros) || zagueros[0]?.nombre || ''
  );
  const [p2Delantero, setP2Delantero] = useState<string>(
    delanteros.find((d) => d.nombre !== (usuarioEnDelanteros || delanteros[0]?.nombre))?.nombre ||
      delanteros[0]?.nombre ||
      ''
  );
  const [p2Zaguero, setP2Zaguero] = useState<string>(
    zagueros.find((z) => z.nombre !== ((!usuarioEnDelanteros && usuarioEnZagueros) || zagueros[0]?.nombre))?.nombre ||
      zagueros[0]?.nombre ||
      ''
  );

  const [organizador, setOrganizador] = useState<string>(
    usuarioEnDelanteros || usuarioEnZagueros || delanteros[0]?.nombre || usuarioActual || ''
  );
  const [notas, setNotas] = useState<string>('');
  const [incluirInvitado, setIncluirInvitado] = useState<boolean>(false);
  const [invitadoPuesto, setInvitadoPuesto] = useState<'p2Zag' | 'p2Del' | 'p1Zag' | 'p1Del'>('p2Zag');
  const [invitadoNombre, setInvitadoNombre] = useState<string>('');
  const [invitadoObs, setInvitadoObs] = useState<string>('');
  const [pagarAhora, setPagarAhora] = useState<boolean>(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!p1Delantero && delanteros[0]?.nombre) setP1Delantero(delanteros[0].nombre);
    if (!p1Zaguero && zagueros[0]?.nombre) setP1Zaguero(zagueros[0].nombre);
    if (!p2Delantero && (delanteros[1]?.nombre || delanteros[0]?.nombre)) {
      setP2Delantero(delanteros[1]?.nombre || delanteros[0]?.nombre || '');
    }
    if (!p2Zaguero && (zagueros[1]?.nombre || zagueros[0]?.nombre)) {
      setP2Zaguero(zagueros[1]?.nombre || zagueros[0]?.nombre || '');
    }
    if (!organizador && (usuarioEnDelanteros || usuarioEnZagueros || delanteros[0]?.nombre)) {
      setOrganizador(usuarioEnDelanteros || usuarioEnZagueros || delanteros[0]?.nombre || '');
    }
  }, [jugadores.length]);

  const costoTotal = horario.precioCancha + horario.precioLuz;

  const ventanaReserva = evaluarVentanaReserva({
    fechaSeleccionada: fechaStr,
    soloTurnosEnElDia: clubConfig.soloTurnosEnElDia,
    horaAperturaTurnos: clubConfig.horaAperturaTurnos,
    diasBloqueados,
    esStaff: esAdmin,
  });

  const evaluacionReserva = evaluarJugadoresParaReserva(
    [p1Delantero, p1Zaguero, p2Delantero, p2Zaguero, organizador],
    jugadores,
    { jugadorLogueado, clubConfig }
  );

  const reservaBloqueadaParaUsuario =
    !esAdmin && (!evaluacionReserva.puedeReservar || !ventanaReserva.habilitado);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!esAdmin && !ventanaReserva.habilitado) {
      setErrorMsg(ventanaReserva.motivo || 'Las reservas no están habilitadas en este momento.');
      return;
    }

    if (reservaBloqueadaParaUsuario) {
      const nombres = evaluacionReserva.bloqueados.map((j) => j.nombre).join(', ');
      setErrorMsg(
        `No es posible confirmar el turno porque ${nombres} está bloqueado por la Comisión Directiva hasta regularizar su pago.`
      );
      return;
    }

    let p1DelFinal = p1Delantero;
    let p1ZagFinal = p1Zaguero;
    let p2DelFinal = p2Delantero;
    let p2ZagFinal = p2Zaguero;
    const obsInvitados: string[] = [];

    if (esAdmin && incluirInvitado) {
      const nombreInv = invitadoNombre.trim();
      if (!nombreInv) {
        setErrorMsg('Ingresa el nombre del pelotari invitado (no registrado).');
        return;
      }
      const etiquetaInv = `Invitado: ${nombreInv}`;
      if (invitadoPuesto === 'p1Del') p1DelFinal = etiquetaInv;
      if (invitadoPuesto === 'p1Zag') p1ZagFinal = etiquetaInv;
      if (invitadoPuesto === 'p2Del') p2DelFinal = etiquetaInv;
      if (invitadoPuesto === 'p2Zag') p2ZagFinal = etiquetaInv;
      obsInvitados.push(formatearObservacionInvitado(nombreInv, invitadoObs));
    }

    const p1: ParejaTurno = {
      nombre: `Pareja 1 (${p1DelFinal.split(' ')[1] || p1DelFinal} - ${p1ZagFinal.split(' ')[1] || p1ZagFinal})`,
      delantero: p1DelFinal,
      zaguero: p1ZagFinal,
    };

    const p2: ParejaTurno = {
      nombre: `Pareja 2 (${p2DelFinal.split(' ')[1] || p2DelFinal} - ${p2ZagFinal.split(' ')[1] || p2ZagFinal})`,
      delantero: p2DelFinal,
      zaguero: p2ZagFinal,
    };

    const orgFinal = [p1.delantero, p1.zaguero, p2.delantero, p2.zaguero].includes(organizador)
      ? organizador
      : p1.delantero;

    const validacion = validarReserva(p1, p2, orgFinal);
    if (!validacion.valido) {
      setErrorMsg(validacion.error || 'Verifica los pelotaris del partido');
      return;
    }

    const claveTurno = generarClaveTurno(fechaStr, horario.id);
    const notasFinal = combinarNotasInvitado(notas, obsInvitados);
    const nuevoTurno: Turno = {
      id: claveTurno,
      horarioId: horario.id,
      fecha: fechaStr,
      estado: 'ocupado',
      p1,
      p2,
      organizadorNombre: orgFinal,
      notas: notasFinal,
      costoTotal,
      pagado: pagarAhora,
      metodoPago: pagarAhora ? metodoPago : undefined,
      fechaReserva: new Date().toISOString(),
      registradoPor: esAdmin ? usuarioActual : orgFinal,
    };

    onConfirmarReserva(nuevoTurno, pagarAhora, metodoPago);
    confetti({ particleCount: 40, spread: 50 });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                Reserva de Turno: {horario.etiqueta}
              </h3>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fecha: <strong className="text-slate-700 dark:text-slate-300">{fechaStr}</strong> · {clubConfig.nombreClub}
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar reserva"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tarifa Informativa */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-500 dark:text-slate-400">Arancel Cancha:</span>
            <div className="font-bold text-slate-900 dark:text-white tabular-nums">
              {formatearMoneda(horario.precioCancha)}
            </div>
          </div>
          {horario.precioLuz > 0 && (
            <div className="space-y-0.5">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Luz Nocturna:
              </span>
              <div className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                {formatearMoneda(horario.precioLuz)}
              </div>
            </div>
          )}
          <div className="space-y-0.5 text-right">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Total Turno:</span>
            <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm tabular-nums">
              {formatearMoneda(costoTotal)}
            </div>
          </div>
        </div>

        {!esAdmin && !ventanaReserva.habilitado && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{ventanaReserva.motivo}</span>
          </div>
        )}

        {evaluacionReserva.bloqueados.length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-extrabold text-rose-700 dark:text-rose-400">
              <Ban className="w-4 h-4 shrink-0" />
              <span>
                {esAdmin
                  ? 'Atención Staff: pelotari bloqueado en el padrón'
                  : 'Reserva bloqueada por decisión de la Comisión Directiva'}
              </span>
            </div>
            <ul className="space-y-1 text-[11px]">
              {evaluacionReserva.bloqueados.map((j) => (
                <li key={j.id}>
                  <strong>{j.nombre}</strong> tiene restringida la reserva de turnos
                  {j.motivoBloqueo ? ` (${j.motivoBloqueo})` : ''}.
                </li>
              ))}
            </ul>
            <div className="text-[11px] font-medium">
              {esAdmin
                ? 'Podés confirmar bajo autorización operativa o verificar su estado con Comisión Directiva.'
                : 'Regularizá tu mensualidad o deuda en cantina con administración para volver a sacar turnos.'}
            </div>
          </div>
        )}

        {evaluacionReserva.advertencias.length > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-300 dark:border-amber-800/70 text-amber-950 dark:text-amber-100 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-extrabold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Estado de mensualidad y cantina (Informativo)</span>
            </div>
            <ul className="space-y-1 text-[11px]">
              {evaluacionReserva.advertencias.map(({ jugador: j, estado, tieneAvisoMensualidad, tieneDeudaCantina }) => (
                <li key={j.id} className="leading-snug">
                  <strong>{j.nombre}:</strong>{' '}
                  {tieneAvisoMensualidad && estado.mensajeMensualidad ? estado.mensajeMensualidad : ''}
                  {tieneAvisoMensualidad && tieneDeudaCantina ? ' · ' : ''}
                  {tieneDeudaCantina && (
                    <span className="tabular-nums font-semibold">
                      Deuda en cantina: {formatearMoneda(estado.deudaCantina)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {!reservaBloqueadaParaUsuario && (
              <div className="text-[10px] text-amber-800/90 dark:text-amber-300/90">
                Mensaje informativo: podés continuar con tu reserva normalmente mientras no exista un bloqueo activo.
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {onAbrirRegistroJugador && (
          <div
            className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              activos.length < 4
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <span>
              {activos.length < 4
                ? `Hay ${activos.length} pelotari(s) registrado(s). Se necesitan al menos 4 pelotaris para armar un partido.`
                : '¿Falta alguno de los pelotaris en la lista?'}
            </span>
            <button
              type="button"
              onClick={onAbrirRegistroJugador}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrar Pelotari</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pareja 1 */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              Pareja 1 (Titulares)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Delantero 1:
                </label>
                <select
                  value={p1Delantero}
                  onChange={(e) => setP1Delantero(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 font-medium"
                >
                  {delanteros.map((j) => (
                    <option key={j.id} value={j.nombre}>
                      {j.nombre} ({j.categoria})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Zaguero 1:
                </label>
                <select
                  value={p1Zaguero}
                  onChange={(e) => setP1Zaguero(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 font-medium"
                >
                  {zagueros.map((j) => (
                    <option key={j.id} value={j.nombre}>
                      {j.nombre} ({j.categoria})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pareja 2 */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Pareja 2 (Rivales)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Delantero 2:
                </label>
                <select
                  value={p2Delantero}
                  onChange={(e) => setP2Delantero(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 font-medium"
                >
                  {delanteros.map((j) => (
                    <option key={j.id} value={j.nombre}>
                      {j.nombre} ({j.categoria})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Zaguero 2:
                </label>
                <select
                  value={p2Zaguero}
                  onChange={(e) => setP2Zaguero(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 font-medium"
                >
                  {zagueros.map((j) => (
                    <option key={j.id} value={j.nombre}>
                      {j.nombre} ({j.categoria})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Organizador y Notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Organizador del Turno:
              </label>
              <select
                value={organizador}
                onChange={(e) => setOrganizador(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white font-medium"
              >
                <option value={p1Delantero}>Delantero 1 ({p1Delantero})</option>
                <option value={p1Zaguero}>Zaguero 1 ({p1Zaguero})</option>
                <option value={p2Delantero}>Delantero 2 ({p2Delantero})</option>
                <option value={p2Zaguero}>Zaguero 2 ({p2Zaguero})</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Notas del Partido:
              </label>
              <input
                type="text"
                placeholder="Ej: Desafío clásico, traer paletas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Servicio de Invitado para Jugador no Registrado (Operado por Cantina o Comisión) */}
          {esAdmin && (
            <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-2.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-800 dark:text-emerald-300">
                <input
                  type="checkbox"
                  checked={incluirInvitado}
                  onChange={(e) => setIncluirInvitado(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span>Servicio de Invitado (pelotari no registrado en el padrón)</span>
              </label>

              {incluirInvitado && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Reemplaza puesto:
                    </label>
                    <select
                      value={invitadoPuesto}
                      onChange={(e) => setInvitadoPuesto(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold"
                    >
                      <option value="p2Zag">Zaguero 2</option>
                      <option value="p2Del">Delantero 2</option>
                      <option value="p1Zag">Zaguero 1</option>
                      <option value="p1Del">Delantero 1</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Nombre del Invitado *
                    </label>
                    <input
                      type="text"
                      value={invitadoNombre}
                      onChange={(e) => setInvitadoNombre(e.target.value)}
                      placeholder="Ej: Martín Sosa"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Observación / Datos
                    </label>
                    <input
                      type="text"
                      value={invitadoObs}
                      onChange={(e) => setInvitadoObs(e.target.value)}
                      placeholder="DNI o tel. / trae amigo..."
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pago en el Momento (Admin / Cantina) o Información de Abono (Socio) */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
            {esAdmin ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={pagarAhora}
                      onChange={(e) => setPagarAhora(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-bold">Registrar turno como ya abonado</span>
                  </label>

                  {pagarAhora && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMetodoPago('efectivo')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          metodoPago === 'efectivo'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        Efectivo
                      </button>
                      <button
                        type="button"
                        onClick={() => setMetodoPago('transferencia')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          metodoPago === 'transferencia'
                            ? 'bg-slate-800 dark:bg-slate-700 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        Alias Mercado Pago
                      </button>
                    </div>
                  )}
                </div>

                {pagarAhora && metodoPago === 'transferencia' && clubConfig.aliasTransferencia && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2 text-[11px]">
                    <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Alias: <span className="font-mono select-all text-emerald-700 dark:text-emerald-400">{clubConfig.aliasTransferencia}</span>
                      </div>
                      <div className="text-slate-500">{clubConfig.titularCuenta}</div>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {pagarAhora
                    ? `Se registrará el ingreso de ${formatearMoneda(costoTotal)} en la Caja Diaria del club.`
                    : 'El turno quedará reservado como pendiente y podrá abonarse en la cantina al terminar de jugar.'}
                </div>
              </>
            ) : (
              <>
                {clubConfig.aliasTransferencia && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2 text-[11px]">
                    <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Alias Mercado Pago: <span className="font-mono select-all text-emerald-700 dark:text-emerald-400">{clubConfig.aliasTransferencia}</span>
                      </div>
                      <div className="text-slate-500">{clubConfig.titularCuenta}</div>
                    </div>
                  </div>
                )}
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  El turno se confirma al instante y se abona en cantina (efectivo o presentando transferencia) antes o después del partido.
                </div>
              </>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={reservaBloqueadaParaUsuario}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 ${
                reservaBloqueadaParaUsuario
                  ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-70'
                  : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
              }`}
            >
              {reservaBloqueadaParaUsuario ? (
                <>
                  <Ban className="w-4 h-4" />
                  <span>Reserva Bloqueada</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar Reserva de Cancha</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
