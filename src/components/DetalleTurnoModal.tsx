import React, { useState } from 'react';
import {
  Turno,
  HorarioConfig,
  MetodoPago,
  ResultadoPartido,
  Jugador,
  ParejaTurno,
  ClubConfig
} from '../types';
import { formatearMoneda, generarMensajeWhatsAppTurno, validarReserva, formatearObservacionInvitado, combinarNotasInvitado } from '../utils/turnosLogic';
import {
  X,
  Clock,
  Share2,
  Coffee,
  DollarSign,
  Trophy,
  Trash2,
  Edit2,
  AlertCircle,
  CreditCard
} from 'lucide-react';

interface DetalleTurnoModalProps {
  turno: Turno;
  horario: HorarioConfig;
  jugadores: Jugador[];
  clubConfig: ClubConfig;
  fechaStr: string;
  esAdmin: boolean;
  onLiberarTurno: (turnoId: string) => void;
  onCobrarTurno: (turnoId: string, metodo: MetodoPago) => void;
  onGuardarResultado: (turnoId: string, resultado: ResultadoPartido) => void;
  onActualizarTurno?: (
    turnoId: string,
    p1: ParejaTurno,
    p2: ParejaTurno,
    organizadorNombre: string,
    notas: string
  ) => void;
  onIrACantina: (turnoId: string, clienteNombre: string) => void;
  onCerrar: () => void;
}

export const DetalleTurnoModal: React.FC<DetalleTurnoModalProps> = ({
  turno,
  horario,
  jugadores,
  clubConfig,
  fechaStr,
  esAdmin,
  onLiberarTurno,
  onCobrarTurno,
  onGuardarResultado,
  onActualizarTurno,
  onIrACantina,
  onCerrar,
}) => {
  const [modoResultado, setModoResultado] = useState(false);
  const [set1P1, setSet1P1] = useState(turno.resultado?.set1P1?.toString() || '12');
  const [set1P2, setSet1P2] = useState(turno.resultado?.set1P2?.toString() || '8');
  const [set2P1, setSet2P1] = useState(turno.resultado?.set2P1?.toString() || '12');
  const [set2P2, setSet2P2] = useState(turno.resultado?.set2P2?.toString() || '10');

  // Modo edición de parejas (Admin)
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editP1Del, setEditP1Del] = useState(turno.p1?.delantero || '');
  const [editP1Zag, setEditP1Zag] = useState(turno.p1?.zaguero || '');
  const [editP2Del, setEditP2Del] = useState(turno.p2?.delantero || '');
  const [editP2Zag, setEditP2Zag] = useState(turno.p2?.zaguero || '');
  const [editOrg, setEditOrg] = useState(turno.organizadorNombre || '');
  const [editNotas, setEditNotas] = useState(turno.notas || '');
  const [editInvitadoNombre, setEditInvitadoNombre] = useState('');
  const [editInvitadoObs, setEditInvitadoObs] = useState('');
  const [errorEdicion, setErrorEdicion] = useState('');

  // Confirmación inline sin window.confirm
  const [confirmandoLiberar, setConfirmandoLiberar] = useState(false);

  const p1 = turno.p1;
  const p2 = turno.p2;
  const jugadoresActivos = jugadores.filter((j) => j.activo);
  const pelotarisOrdenados = [...jugadoresActivos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );

  const guardarScore = (e: React.FormEvent) => {
    e.preventDefault();
    onGuardarResultado(turno.id, {
      set1P1: parseInt(set1P1) || 0,
      set1P2: parseInt(set1P2) || 0,
      set2P1: parseInt(set2P1) || 0,
      set2P2: parseInt(set2P2) || 0,
    });
    setModoResultado(false);
  };

  const guardarEdicionJugadores = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEdicion('');
    let p1Del = editP1Del;
    let p1Zag = editP1Zag;
    let p2Del = editP2Del;
    let p2Zag = editP2Zag;
    let notasFinal = editNotas.trim();

    if (editInvitadoNombre.trim()) {
      const obsInv = formatearObservacionInvitado(editInvitadoNombre, editInvitadoObs);
      notasFinal = combinarNotasInvitado(notasFinal, [obsInv]);
      if (!p2Zag || p2Zag.startsWith('Invitado:')) {
        p2Zag = `Invitado: ${editInvitadoNombre.trim()}`;
      }
    }

    const etiquetaCorto = (n: string) => (n ? n.trim().split(/\s+/).slice(-1)[0] || n.trim() : 'A confirmar');
    const jugadoresElegidos = [p1Del, p1Zag, p2Del, p2Zag].map((s) => s.trim()).filter(Boolean);
    const orgFinal = jugadoresElegidos.includes(editOrg)
      ? editOrg
      : (jugadoresElegidos[0] || '');

    const nuevaP1: ParejaTurno = {
      nombre: `Pareja 1 (${etiquetaCorto(p1Del)} - ${etiquetaCorto(p1Zag)})`,
      delantero: p1Del,
      zaguero: p1Zag,
    };
    const nuevaP2: ParejaTurno = {
      nombre: `Pareja 2 (${etiquetaCorto(p2Del)} - ${etiquetaCorto(p2Zag)})`,
      delantero: p2Del,
      zaguero: p2Zag,
    };

    const validacion = validarReserva(nuevaP1, nuevaP2, orgFinal);
    if (!validacion.valido) {
      setErrorEdicion(validacion.error || 'Verifica los jugadores seleccionados.');
      return;
    }

    onActualizarTurno?.(turno.id, nuevaP1, nuevaP2, orgFinal, notasFinal);
    setModoEdicion(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                Detalle del Partido: {horario.etiqueta}
              </h3>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fecha: {fechaStr} · Trinquete Oficial CARC
            </div>
          </div>

          <div className="flex items-center gap-1">
            {esAdmin && onActualizarTurno && !modoEdicion && (
              <button
                type="button"
                onClick={() => setModoEdicion(true)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar detalle del partido"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formulario de Edición Admin */}
        {modoEdicion ? (
          <form onSubmit={guardarEdicionJugadores} className="space-y-3 text-xs">
            {errorEdicion && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorEdicion}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">Pareja 1</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">Delantero 1:</label>
                  <select
                    value={editP1Del}
                    onChange={(e) => setEditP1Del(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
                  >
                    <option value="">— Por definir / A confirmar —</option>
                    {pelotarisOrdenados.map((j) => (
                      <option key={j.id} value={j.nombre}>
                        {j.nombre} ({j.categoria || 'Prom'} · {j.rol || 'Ambos'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">Zaguero 1:</label>
                  <select
                    value={editP1Zag}
                    onChange={(e) => setEditP1Zag(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
                  >
                    <option value="">— Por definir / A confirmar —</option>
                    {pelotarisOrdenados.map((j) => (
                      <option key={j.id} value={j.nombre}>
                        {j.nombre} ({j.categoria || 'Prom'} · {j.rol || 'Ambos'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="font-bold text-slate-700 dark:text-slate-300 uppercase">Pareja 2</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">Delantero 2:</label>
                  <select
                    value={editP2Del}
                    onChange={(e) => setEditP2Del(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
                  >
                    <option value="">— Por definir / A confirmar —</option>
                    {pelotarisOrdenados.map((j) => (
                      <option key={j.id} value={j.nombre}>
                        {j.nombre} ({j.categoria || 'Prom'} · {j.rol || 'Ambos'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">Zaguero 2:</label>
                  <select
                    value={editP2Zag}
                    onChange={(e) => setEditP2Zag(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-medium"
                  >
                    <option value="">— Por definir / A confirmar —</option>
                    {pelotarisOrdenados.map((j) => (
                      <option key={j.id} value={j.nombre}>
                        {j.nombre} ({j.categoria || 'Prom'} · {j.rol || 'Ambos'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Organizador:</label>
                {(() => {
                  const puestosConJugador = [
                    { label: `Delantero 1 (${editP1Del})`, val: editP1Del },
                    { label: `Zaguero 1 (${editP1Zag})`, val: editP1Zag },
                    { label: `Delantero 2 (${editP2Del})`, val: editP2Del },
                    { label: `Zaguero 2 (${editP2Zag})`, val: editP2Zag },
                  ].filter((p) => p.val.trim() !== '');

                  return (
                    <select
                      value={editOrg}
                      onChange={(e) => setEditOrg(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                    >
                      {puestosConJugador.length === 0 ? (
                        <option value="">— Sin jugadores definidos —</option>
                      ) : (
                        puestosConJugador.map((p) => (
                          <option key={p.label} value={p.val}>
                            {p.label}
                          </option>
                        ))
                      )}
                    </select>
                  );
                })()}
              </div>
              <div>
                <label className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Notas:</label>
                <input
                  type="text"
                  value={editNotas}
                  onChange={(e) => setEditNotas(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block mb-1">
                  Agregar Invitado (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Nombre del invitado"
                  value={editInvitadoNombre}
                  onChange={(e) => setEditInvitadoNombre(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 block mb-1">
                  Observación invitado:
                </label>
                <input
                  type="text"
                  placeholder="Datos / contacto / aclaración"
                  value={editInvitadoObs}
                  onChange={(e) => setEditInvitadoObs(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setModoEdicion(false)}
                className="px-3 py-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Parejas en Cancha */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                  {p1?.nombre || 'Pareja 1'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                      Delantero:
                    </span>
                    <span
                      className={
                        p1?.delantero
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'italic text-slate-400 dark:text-slate-500'
                      }
                    >
                      {p1?.delantero || 'A confirmar'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                      Zaguero:
                    </span>
                    <span
                      className={
                        p1?.zaguero
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'italic text-slate-400 dark:text-slate-500'
                      }
                    >
                      {p1?.zaguero || 'A confirmar'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  {p2?.nombre || 'Pareja 2'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                      Delantero:
                    </span>
                    <span
                      className={
                        p2?.delantero
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'italic text-slate-400 dark:text-slate-500'
                      }
                    >
                      {p2?.delantero || 'A confirmar'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                      Zaguero:
                    </span>
                    <span
                      className={
                        p2?.zaguero
                          ? 'font-bold text-slate-900 dark:text-white'
                          : 'italic text-slate-400 dark:text-slate-500'
                      }
                    >
                      {p2?.zaguero || 'A confirmar'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Datos de Pago y Organizador */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Organizador del Turno:</span>
                <span className="font-bold text-slate-900 dark:text-white">{turno.organizadorNombre || 'Club'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Costo Total Turno:</span>
                <span className="font-extrabold text-slate-900 dark:text-emerald-400 tabular-nums">
                  {formatearMoneda(turno.costoTotal || horario.precioCancha + horario.precioLuz)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Estado de Cobro:</span>
                <span>
                  {turno.pagado ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      PAGADO ({turno.metodoPago?.toUpperCase() || 'ABONADO'}) ✅
                    </span>
                  ) : (
                    <span className="text-slate-700 dark:text-slate-300 font-bold">
                      PENDIENTE DE PAGO ⏳
                    </span>
                  )}
                </span>
              </div>

              {!turno.pagado && clubConfig.aliasTransferencia && (
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Alias transferencias: <strong className="font-mono text-slate-800 dark:text-slate-200 select-all">{clubConfig.aliasTransferencia}</strong>
                  </span>
                </div>
              )}

              {turno.notas && (
                <div className="pt-1 text-[11px] text-slate-500 whitespace-pre-line">
                  Notas: {turno.notas}
                </div>
              )}

              {esAdmin && turno.registradoPor && (
                <div className="pt-1 text-[11px] text-slate-400">
                  Gestionado por: <strong className="text-slate-600 dark:text-slate-300">{turno.registradoPor}</strong>
                </div>
              )}
            </div>

            {/* Resultado del Partido */}
            {turno.resultado ? (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                  <Trophy className="w-4 h-4" />
                  <span>Marcador Oficial:</span>
                </div>
                <div className="font-extrabold text-slate-900 dark:text-white text-sm tabular-nums">
                  Set 1: {turno.resultado.set1P1}-{turno.resultado.set1P2} · Set 2: {turno.resultado.set2P1}-{turno.resultado.set2P2}
                </div>
              </div>
            ) : (
              esAdmin && !modoResultado && (
                <button
                  onClick={() => setModoResultado(true)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Cargar Resultado de Sets (Pelota Paleta)</span>
                </button>
              )
            )}

            {/* Formulario Cargar Resultado */}
            {modoResultado && (
              <form onSubmit={guardarScore} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                <div className="font-bold text-slate-900 dark:text-white">Ingresar Marcador de Sets:</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block mb-1">Set 1 (P1 vs P2):</span>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={set1P1}
                        onChange={(e) => setSet1P1(e.target.value)}
                        className="w-full text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded py-1 text-slate-900 dark:text-white font-bold"
                      />
                      <input
                        type="number"
                        value={set1P2}
                        onChange={(e) => setSet1P2(e.target.value)}
                        className="w-full text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded py-1 text-slate-900 dark:text-white font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Set 2 (P1 vs P2):</span>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={set2P1}
                        onChange={(e) => setSet2P1(e.target.value)}
                        className="w-full text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded py-1 text-slate-900 dark:text-white font-bold"
                      />
                      <input
                        type="number"
                        value={set2P2}
                        onChange={(e) => setSet2P2(e.target.value)}
                        className="w-full text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded py-1 text-slate-900 dark:text-white font-bold"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setModoResultado(false)}
                    className="px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
                  >
                    Guardar Marcador
                  </button>
                </div>
              </form>
            )}

            {/* Acciones del Turno */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              {esAdmin && !turno.pagado && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onCobrarTurno(turno.id, 'efectivo')}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Cobrar (Efectivo)</span>
                  </button>
                  <button
                    onClick={() => onCobrarTurno(turno.id, 'transferencia')}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer border border-slate-700"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Cobrar (Alias MP)</span>
                  </button>
                </div>
              )}

              <div className={`grid gap-2 ${esAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <button
                  onClick={() => {
                    const url = `https://wa.me/?text=${generarMensajeWhatsAppTurno(turno, horario.etiqueta, fechaStr)}`;
                    window.open(url, '_blank');
                  }}
                  className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Compartir en WhatsApp</span>
                </button>

                {esAdmin && (
                  <button
                    onClick={() => {
                      onCerrar();
                      onIrACantina(turno.id, turno.organizadorNombre || 'Turno ' + horario.etiqueta);
                    }}
                    className="py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/80 dark:hover:bg-emerald-900/80 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Coffee className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Anotar en Cantina</span>
                  </button>
                )}
              </div>

              {esAdmin && (
                confirmandoLiberar ? (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-rose-700 dark:text-rose-300">
                      ¿Seguro que deseas cancelar y liberar este turno?
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfirmandoLiberar(false)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onLiberarTurno(turno.id);
                          onCerrar();
                        }}
                        className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                      >
                        Sí, liberar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmandoLiberar(true)}
                    className="w-full py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>Liberar y Cancelar Turno</span>
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
