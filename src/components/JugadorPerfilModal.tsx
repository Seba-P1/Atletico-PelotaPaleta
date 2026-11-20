import React, { useState } from 'react';
import { ClubConfig, ConsumoIndividual, Jugador } from '../types';
import {
  evaluarEstadoFinancieroJugador,
  formatearPeriodoMes,
} from '../utils/billingLogic';
import { formatearMoneda } from '../utils/turnosLogic';
import {
  X,
  UserCheck,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Coffee,
  Ban,
  ShieldCheck,
  CreditCard,
  LogOut,
  Phone,
  Mail,
  MapPin,
  Copy,
  Check,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { RolAcceso } from '../types';

interface JugadorPerfilModalProps {
  jugador: Jugador;
  clubConfig: ClubConfig;
  consumosJugador: ConsumoIndividual[];
  cargandoConsumos?: boolean;
  rolAcceso?: RolAcceso;
  onCanjearCodigo?: (codigo: string) => Promise<{ etiquetaRol?: string }>;
  onCerrarSesion: () => void;
  onCerrar: () => void;
}

export const JugadorPerfilModal: React.FC<JugadorPerfilModalProps> = ({
  jugador,
  clubConfig,
  consumosJugador,
  cargandoConsumos = false,
  rolAcceso = 'jugador',
  onCanjearCodigo,
  onCerrarSesion,
  onCerrar,
}) => {
  const [aliasCopiado, setAliasCopiado] = useState(false);
  const [codigoInput, setCodigoInput] = useState('');
  const [canjeando, setCanjeando] = useState(false);
  const [codigoMsg, setCodigoMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const estado = evaluarEstadoFinancieroJugador(jugador, { clubConfig });

  const handleCanjear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCanjearCodigo || !codigoInput.trim()) return;
    setCanjeando(true);
    setCodigoMsg(null);
    try {
      const res = await onCanjearCodigo(codigoInput.trim().toUpperCase());
      setCodigoMsg({
        tipo: 'ok',
        texto: `Acceso habilitado: ${res.etiquetaRol || 'Permiso actualizado'}. Ya podés operar desde la barra superior.`,
      });
      setCodigoInput('');
    } catch (err) {
      setCodigoMsg({
        tipo: 'err',
        texto: err instanceof Error ? err.message : 'No se pudo validar el código.',
      });
    } finally {
      setCanjeando(false);
    }
  };

  const copiarAlias = async () => {
    if (!clubConfig.aliasTransferencia) return;
    try {
      await navigator.clipboard.writeText(clubConfig.aliasTransferencia);
      setAliasCopiado(true);
      window.setTimeout(() => setAliasCopiado(false), 2200);
    } catch {
      setAliasCopiado(false);
    }
  };
  const consumosPendientes = consumosJugador.filter((c) => !c.pagado);
  const montoCuota = clubConfig.montoMensualidad ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="perfil-jugador-titulo"
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3
                id="perfil-jugador-titulo"
                className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-display truncate"
              >
                {jugador.nombre}
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Cat. {jugador.categoria} · {jugador.rol}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {jugador.esSocioClub === false
                    ? 'Invitado / No Socio'
                    : jugador.numeroSocio
                    ? `Socio #${jugador.numeroSocio}`
                    : 'Socio CARC'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar perfil"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Estado de Habilitación para Turnos */}
        {estado.bloqueadoTurnos ? (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/70 text-rose-900 dark:text-rose-200 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-rose-700 dark:text-rose-400">
              <Ban className="w-4 h-4 shrink-0" />
              <span>Turnos Bloqueados por Comisión Directiva</span>
            </div>
            <p className="text-xs leading-relaxed">
              Actualmente no podés confirmar nuevas reservas de cancha hasta regularizar tu situación con la Comisión Directiva.
              {estado.motivoBloqueo ? ` Motivo informado: ${estado.motivoBloqueo}.` : ''}
            </p>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  Habilitado para sacar turnos
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  {estado.requiereAtencion
                    ? 'Tenés avisos o saldos pendientes abajo. Recordá regularizarlos con administración.'
                    : 'Tu cuenta se encuentra habilitada sin restricciones.'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 shrink-0">
              Activo
            </span>
          </div>
        )}

        {/* Mensualidad del Club (Vencimiento día 10 y aviso 3 días antes) */}
        <div
          className={`p-4 rounded-xl border space-y-2.5 ${
            estado.estadoMensualidad === 'vencida'
              ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/70'
              : estado.mostrarAvisoPorVencer
              ? 'bg-amber-50/90 dark:bg-amber-950/35 border-amber-300 dark:border-amber-700/70'
              : estado.mensualidadPaga
              ? 'bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
              : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
              {estado.estadoMensualidad === 'vencida' || estado.mostrarAvisoPorVencer ? (
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    estado.estadoMensualidad === 'vencida'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                />
              ) : (
                <CalendarClock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
              <span>Mensualidad / Seguro del Club (vencimiento día {estado.diaVencimiento})</span>
            </div>

            <span
              className={`text-[11px] font-extrabold ${
                estado.estadoMensualidad === 'vencida'
                  ? 'text-rose-700 dark:text-rose-400'
                  : estado.mostrarAvisoPorVencer
                  ? 'text-amber-700 dark:text-amber-300'
                  : estado.mensualidadPaga
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {estado.estadoMensualidad === 'no_aplica'
                ? 'Invitado'
                : estado.mensualidadPaga
                ? `Al día (${estado.nombreMesActual})`
                : estado.estadoMensualidad === 'vencida'
                ? 'Vencida'
                : estado.mostrarAvisoPorVencer
                ? 'Por vencer'
                : 'Pendiente en término'}
            </span>
          </div>

          {estado.estadoMensualidad === 'no_aplica' ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Estás registrado como pelotari invitado (no socio). Si te asociás al club, tu estado mensual aparecerá aquí.
            </p>
          ) : estado.mensualidadPaga ? (
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  Cuota de <strong>{estado.nombreMesActual}</strong> registrada como abonada.
                </span>
              </div>
              {estado.ultimoMesPago && (
                <span className="text-[11px] text-slate-500 tabular-nums">
                  Últ. pago: {formatearPeriodoMes(estado.ultimoMesPago)}
                </span>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p
                className={`text-xs font-semibold leading-relaxed ${
                  estado.estadoMensualidad === 'vencida'
                    ? 'text-rose-800 dark:text-rose-200'
                    : estado.mostrarAvisoPorVencer
                    ? 'text-amber-900 dark:text-amber-200'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {estado.mensajeMensualidad}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
                <span>
                  Último mes abonado:{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {formatearPeriodoMes(estado.ultimoMesPago)}
                  </strong>
                </span>
                {montoCuota > 0 && (
                  <span className="tabular-nums font-bold text-slate-800 dark:text-slate-200">
                    Valor cuota mensual: {formatearMoneda(montoCuota)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Estado en Cantina / Cuenta Corriente */}
        <div
          className={`p-4 rounded-xl border space-y-3 ${
            estado.deudaCantina > 0
              ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-300 dark:border-amber-800/60'
              : 'bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
              <Coffee className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Estado en Cantina / Cuenta Corriente</span>
            </div>

            <div
              className={`text-sm font-extrabold tabular-nums ${
                estado.deudaCantina > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : estado.saldoAFavorCantina > 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {estado.deudaCantina > 0
                ? `Debés ${formatearMoneda(estado.deudaCantina)}`
                : estado.saldoAFavorCantina > 0
                ? `A favor ${formatearMoneda(estado.saldoAFavorCantina)}`
                : 'Sin deuda ($ 0)'}
            </div>
          </div>

          {estado.deudaCantina > 0 ? (
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              Tenés un saldo pendiente en la cantina de{' '}
              <strong className="tabular-nums">{formatearMoneda(estado.deudaCantina)}</strong>. Podés
              abonarlo en barra en efectivo o por transferencia al alias del club.
            </p>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              No registrás deudas pendientes en cantina.
            </p>
          )}

          {cargandoConsumos ? (
            <div className="text-[11px] text-slate-500">Cargando detalle de consumos...</div>
          ) : consumosPendientes.length > 0 ? (
            <div className="space-y-1.5 pt-2 border-t border-amber-200/70 dark:border-amber-800/50">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Consumos pendientes anotados ({consumosPendientes.length})
              </div>
              <div className="divide-y divide-amber-200/50 dark:divide-slate-800 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-amber-200/60 dark:border-slate-800 max-h-40 overflow-y-auto">
                {consumosPendientes.map((c) => (
                  <div
                    key={c.id}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {c.detalle}
                      </div>
                      <div className="text-[10px] text-slate-500 tabular-nums">
                        {c.fecha} · {c.hora} hs
                      </div>
                    </div>
                    <span className="font-extrabold text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
                      {formatearMoneda(c.monto)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Datos para Transferencia Alias Mercado Pago o Efectivo */}
        {(estado.requiereAtencion || !estado.mensualidadPaga) && clubConfig.aliasTransferencia && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Alias Mercado Pago:{' '}
                  <span className="font-mono select-all text-emerald-700 dark:text-emerald-400">
                    {clubConfig.aliasTransferencia}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Transferí el seguro mensual o aboná en Efectivo en cantina ({clubConfig.titularCuenta}).
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={copiarAlias}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            >
              {aliasCopiado ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Alias</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Resumen Ficha Personal */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {jugador.dni && (
            <div className="text-slate-600 dark:text-slate-300 tabular-nums">
              <span className="text-slate-400">DNI:</span> <strong>{jugador.dni}</strong>
            </div>
          )}
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-400">Mano hábil:</span>{' '}
            <strong>{jugador.manoHabil || 'Derecha'}</strong>
          </div>
          {jugador.telefono && (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 tabular-nums">
              <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{jugador.telefono}</span>
            </div>
          )}
          {jugador.email && (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
              <Mail className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{jugador.email}</span>
            </div>
          )}
          {jugador.localidad && (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{jugador.localidad}</span>
            </div>
          )}
        </div>

        {/* Canjear código de acceso Comisión Directiva o Cantina */}
        {onCanjearCodigo && rolAcceso !== 'super_admin' && (
          <form
            onSubmit={handleCanjear}
            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5"
          >
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>¿Sos parte de Comisión Directiva o Cantina?</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Ingresá el código institucional con tu propia cuenta para activar el acceso correspondiente.
            </p>
            {codigoMsg && (
              <div
                className={`p-2 rounded-lg text-[11px] font-semibold ${
                  codigoMsg.tipo === 'ok'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {codigoMsg.texto}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                placeholder="Código de Comisión o Cantina"
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={canjeando || !codigoInput.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
              >
                {canjeando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Validar</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onCerrar();
              onCerrarSesion();
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>

          <button
            type="button"
            onClick={onCerrar}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
