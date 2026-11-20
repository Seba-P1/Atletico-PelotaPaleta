import React, { useState } from 'react';
import { Jugador, TorneoData, ParejaTorneo } from '../types';
import {
  calcularEstructuraZonas,
  construirZonasYPartidos,
  registrarResultadoPartido
} from '../utils/torneoLogic';
import {
  Trophy,
  Shuffle,
  Play,
  Printer,
  X,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TorneoModalProps {
  jugadores: Jugador[];
  torneoGuardado: TorneoData | null;
  onGuardarTorneo: (torneo: TorneoData | null) => void;
  onNotificar: (msg: string) => void;
  onCerrar: () => void;
}

export const TorneoModal: React.FC<TorneoModalProps> = ({
  jugadores,
  torneoGuardado,
  onGuardarTorneo,
  onNotificar,
  onCerrar,
}) => {
  const [cantParejas, setCantParejas] = useState<number>(torneoGuardado?.cantidadParejas || 6);
  const [categoriaTorneo, setCategoriaTorneo] = useState<string>(
    torneoGuardado?.categoria || '1ra y 2da Categoría'
  );
  const [tituloTorneo, setTituloTorneo] = useState<string>(
    torneoGuardado?.titulo || 'Copa Aniversario Club Atlético Río Colorado'
  );

  const inicializarParejas = (cantidad: number): ParejaTorneo[] => {
    const activos = jugadores.filter((j) => j.activo);
    const fuente = activos.length > 0 ? activos : jugadores;
    const arr: ParejaTorneo[] = [];
    for (let i = 1; i <= cantidad; i++) {
      const jDel = fuente[(i * 2 - 2) % fuente.length]?.nombre || `Delantero ${i}`;
      const jZag = fuente[(i * 2 - 1) % fuente.length]?.nombre || `Zaguero ${i}`;
      arr.push({
        id: i,
        nombre: `Pareja ${i} (${jDel.split(' ')[1] || jDel} - ${jZag.split(' ')[1] || jZag})`,
        delantero: jDel,
        zaguero: jZag,
        partidosJugados: 0,
        partidosGanados: 0,
        puntos: 0,
        tantosAFavor: 0,
        tantosEnContra: 0,
        difTantos: 0,
      });
    }
    return arr;
  };

  const [parejas, setParejas] = useState<ParejaTorneo[]>(
    () => torneoGuardado?.parejas || inicializarParejas(6)
  );

  // Inputs temporales para resultados
  const [partidoEditandoId, setPartidoEditandoId] = useState<string | null>(null);
  const [p1TantosInput, setP1TantosInput] = useState<string>('25');
  const [p2TantosInput, setP2TantosInput] = useState<string>('20');
  const [errorResultado, setErrorResultado] = useState<string>('');

  // Edición de playoffs
  const [playoffEditId, setPlayoffEditId] = useState<string | null>(null);
  const [playoffRes, setPlayoffRes] = useState<string>('');
  const [playoffGanador, setPlayoffGanador] = useState<string>('');

  const cambiarCantidad = (cant: number) => {
    setCantParejas(cant);
    setParejas(inicializarParejas(cant));
    onGuardarTorneo(null);
  };

  const sortearParejasAleatorias = () => {
    const activos = jugadores.filter((j) => j.activo);
    const delanteros = activos.filter((j) => j.rol === 'Delantero' || j.rol === 'Ambos');
    const zagueros = activos.filter((j) => j.rol === 'Zaguero' || j.rol === 'Ambos');

    const shuffledDel = [...delanteros].sort(() => Math.random() - 0.5);
    const shuffledZag = [...zagueros].sort(() => Math.random() - 0.5);

    setParejas((prev) =>
      prev.map((p, idx) => {
        const d = shuffledDel[idx % shuffledDel.length]?.nombre || p.delantero;
        const z = shuffledZag[idx % shuffledZag.length]?.nombre || p.zaguero;
        return {
          ...p,
          delantero: d,
          zaguero: z,
          nombre: `Pareja ${p.id} (${d.split(' ')[1] || d} - ${z.split(' ')[1] || z})`,
        };
      })
    );
  };

  const generarFixture = () => {
    const zonas = construirZonasYPartidos(parejas);
    const nuevoTorneo: TorneoData = {
      titulo: tituloTorneo,
      categoria: categoriaTorneo,
      cantidadParejas: cantParejas,
      parejas: [...parejas],
      zonas,
      playoffs: [
        {
          id: 'semi-1',
          ronda: 'Semis',
          p1Nombre: '1º Zona A',
          p2Nombre: '2º Zona B',
        },
        {
          id: 'semi-2',
          ronda: 'Semis',
          p1Nombre: '1º Zona B',
          p2Nombre: '2º Zona A',
        },
        {
          id: 'final',
          ronda: 'Final',
          p1Nombre: 'Ganador Semi 1',
          p2Nombre: 'Ganador Semi 2',
        },
      ],
    };

    onGuardarTorneo(nuevoTorneo);
    onNotificar('Fixture de torneo generado y guardado');
    confetti({ particleCount: 50, spread: 60 });
  };

  const guardarResultado = (partidoId: string) => {
    if (!torneoGuardado) return;
    setErrorResultado('');
    const t1 = parseInt(p1TantosInput) || 0;
    const t2 = parseInt(p2TantosInput) || 0;
    if (t1 === t2) {
      setErrorResultado('En Pelota Paleta no hay empate; una pareja debe ganar.');
      return;
    }

    const actualizado = registrarResultadoPartido(torneoGuardado, partidoId, t1, t2);
    onGuardarTorneo(actualizado);
    setPartidoEditandoId(null);
    onNotificar(`Resultado guardado (${t1}-${t2})`);
  };

  const guardarPlayoff = () => {
    if (!torneoGuardado || !playoffEditId) return;
    const actualizado: TorneoData = {
      ...torneoGuardado,
      playoffs: torneoGuardado.playoffs.map((pl) =>
        pl.id === playoffEditId
          ? {
              ...pl,
              resultado: playoffRes.trim() || undefined,
              ganadorNombre: playoffGanador.trim() || undefined,
            }
          : pl
      ),
    };
    onGuardarTorneo(actualizado);
    if (playoffEditId === 'final' && playoffGanador.trim()) {
      confetti({ particleCount: 80, spread: 70 });
      onNotificar(`Campeón registrado: ${playoffGanador.trim()}`);
    } else {
      onNotificar('Llave de playoff actualizada');
    }
    setPlayoffEditId(null);
  };

  const estructura = calcularEstructuraZonas(cantParejas);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white font-display truncate">
                Gestor de Torneos de Pelota Paleta
              </h2>
              <p className="text-xs text-slate-400 truncate">
                Armado de parejas, zonas, playoffs y guardado automático del progreso.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {torneoGuardado && (
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition no-print cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
            )}
            <button
              onClick={onCerrar}
              aria-label="Cerrar gestor de torneos"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Configuración inicial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Nombre del Torneo:</label>
              <input
                type="text"
                value={tituloTorneo}
                onChange={(e) => setTituloTorneo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-semibold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Categoría:</label>
              <select
                value={categoriaTorneo}
                onChange={(e) => setCategoriaTorneo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="1ra y 2da Categoría">1ra y 2da Categoría</option>
                <option value="2da y 3ra Categoría">2da y 3ra Categoría</option>
                <option value="Libre / Abierto">Libre / Abierto Trinquete</option>
                <option value="Veteranos">Veteranos (+45)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Cantidad de Parejas:</label>
              <div className="flex gap-1.5">
                {[4, 6, 8, 12].map((num) => (
                  <button
                    key={num}
                    onClick={() => cambiarCantidad(num)}
                    className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      cantParejas === num
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Formulario de Parejas */}
          {!torneoGuardado && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Configuración de Parejas ({parejas.length} duplas)
                </span>
                <button
                  onClick={sortearParejasAleatorias}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Sorteo Automático Equilibrado</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {parejas.map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="font-bold text-emerald-400">Pareja #{p.id}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Delantero:</span>
                        <input
                          type="text"
                          value={p.delantero}
                          onChange={(e) => {
                            const val = e.target.value;
                            setParejas((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, delantero: val } : item))
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Zaguero:</span>
                        <input
                          type="text"
                          value={p.zaguero}
                          onChange={(e) => {
                            const val = e.target.value;
                            setParejas((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, zaguero: val } : item))
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  onClick={generarFixture}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>CONSTRUIR Y GUARDAR FIXTURE ({estructura.cantZonas} Zonas)</span>
                </button>
              </div>
            </div>
          )}

          {/* Fixture y Partidos Generados */}
          {torneoGuardado && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {torneoGuardado.zonas.map((zona) => {
                  const parejasZona = torneoGuardado.parejas
                    .filter((p) => zona.parejasIds.includes(p.id))
                    .sort((a, b) => b.puntos - a.puntos || b.difTantos - a.difTantos);

                  return (
                    <div
                      key={zona.nombre}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3"
                    >
                      <div className="text-sm font-bold text-emerald-400 font-display flex items-center justify-between pb-2 border-b border-slate-800">
                        <span>{zona.nombre}</span>
                        <span className="text-xs text-slate-400 font-normal">
                          Pasan los 2 mejores a Semis
                        </span>
                      </div>

                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-1">Pareja</th>
                            <th className="py-1 text-center">PJ</th>
                            <th className="py-1 text-center">PG</th>
                            <th className="py-1 text-center font-bold text-emerald-400">Pts</th>
                            <th className="py-1 text-right">Dif</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {parejasZona.map((p, rank) => (
                            <tr key={p.id} className="hover:bg-slate-900/40">
                              <td className="py-1.5 font-medium text-white truncate max-w-44">
                                <span className="text-[10px] text-slate-500 mr-1.5">{rank + 1}º</span>
                                {p.delantero.split(' ')[0]} / {p.zaguero.split(' ')[0]}
                              </td>
                              <td className="py-1.5 text-center text-slate-300 tabular-nums">{p.partidosJugados}</td>
                              <td className="py-1.5 text-center text-slate-300 tabular-nums">{p.partidosGanados}</td>
                              <td className="py-1.5 text-center font-bold text-emerald-400 tabular-nums">{p.puntos}</td>
                              <td className="py-1.5 text-right font-medium text-slate-400 tabular-nums">{p.difTantos}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Partidos de {zona.nombre}</div>
                        {zona.partidos.map((partido) => (
                          <div
                            key={partido.id}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-white font-medium">{partido.p1Nombre}</span>
                              <span className="text-slate-500 mx-2">vs</span>
                              <span className="text-white font-medium">{partido.p2Nombre}</span>
                            </div>

                            <div className="shrink-0">
                              {partido.jugado ? (
                                <div className="text-emerald-400 font-extrabold tabular-nums bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                                  {partido.resultadoP1} - {partido.resultadoP2}
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setErrorResultado('');
                                    setPartidoEditandoId(partido.id);
                                    setP1TantosInput('25');
                                    setP2TantosInput('20');
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[11px] transition cursor-pointer"
                                >
                                  Cargar Tantos
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cuadro de Playoffs / Final */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="text-sm font-bold text-emerald-400 font-display flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    <span>Cuadro Eliminatorio (Playoffs)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {torneoGuardado.playoffs.map((pl) => (
                    <div
                      key={pl.id}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between"
                    >
                      <div>
                        <div className="text-[10px] font-bold uppercase text-emerald-400">{pl.ronda}</div>
                        <div className="font-semibold text-white mt-1">
                          {pl.p1Nombre} <span className="text-slate-500">vs</span> {pl.p2Nombre}
                        </div>
                        {pl.resultado && (
                          <div className="text-slate-300 mt-1 tabular-nums">Marcador: {pl.resultado}</div>
                        )}
                        {pl.ganadorNombre && (
                          <div className="text-emerald-400 font-extrabold mt-1">
                            Ganador: {pl.ganadorNombre}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPlayoffEditId(pl.id);
                          setPlayoffRes(pl.resultado || '');
                          setPlayoffGanador(pl.ganadorNombre || '');
                        }}
                        className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-[11px] transition cursor-pointer"
                      >
                        Actualizar Llave
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end no-print">
                <button
                  onClick={() => onGuardarTorneo(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Reiniciar y configurar nuevo torneo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Cargar Resultado Partido */}
        {partidoEditandoId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 space-y-4">
              <h4 className="text-sm font-bold text-white font-display">Registrar Resultado del Partido</h4>
              <p className="text-xs text-slate-400">Ingresa los tantos obtenidos por cada pareja (a 25 o 30 tantos).</p>

              {errorResultado && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorResultado}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Pareja 1</label>
                  <input
                    type="number"
                    value={p1TantosInput}
                    onChange={(e) => setP1TantosInput(e.target.value)}
                    className="w-full text-center bg-slate-950 border border-slate-700 rounded-lg py-2 text-lg font-bold text-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Pareja 2</label>
                  <input
                    type="number"
                    value={p2TantosInput}
                    onChange={(e) => setP2TantosInput(e.target.value)}
                    className="w-full text-center bg-slate-950 border border-slate-700 rounded-lg py-2 text-lg font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setPartidoEditandoId(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => guardarResultado(partidoEditandoId)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Guardar Tantos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar Playoff */}
        {playoffEditId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 space-y-4">
              <h4 className="text-sm font-bold text-white font-display">Actualizar Playoff</h4>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1">Ganador / Pareja:</label>
                  <input
                    type="text"
                    placeholder="Ej: Andreasen / Andreasen"
                    value={playoffGanador}
                    onChange={(e) => setPlayoffGanador(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Marcador (ej. 12-8, 12-10):</label>
                  <input
                    type="text"
                    placeholder="25-19"
                    value={playoffRes}
                    onChange={(e) => setPlayoffRes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setPlayoffEditId(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarPlayoff}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
