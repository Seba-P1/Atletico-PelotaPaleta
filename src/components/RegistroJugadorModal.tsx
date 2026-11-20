import React, { useState } from 'react';
import {
  CategoriaJugador,
  ClubConfig,
  Jugador,
  ManoHabil,
  RolJugador,
} from '../types';
import { X, UserPlus, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff, LogIn, ShieldCheck, KeyRound, ChevronDown } from 'lucide-react';

export interface NuevoJugadorRegistroInput {
  nombrePila: string;
  apellido: string;
  dni: string;
  fechaNacimiento?: string;
  email: string;
  password: string;
  telefono: string;
  localidad?: string;
  rol: RolJugador;
  categoria: CategoriaJugador;
  manoHabil: ManoHabil;
  esSocioClub: boolean;
  numeroSocio?: string;
  contactoEmergencia?: string;
  observaciones?: string;
  codigoAcceso?: string;
}

interface RegistroJugadorModalProps {
  clubConfig: ClubConfig;
  jugadoresExistentes: Jugador[];
  onRegistrar: (datos: NuevoJugadorRegistroInput) => Promise<void>;
  onIrAIngresar?: () => void;
  onCerrar: () => void;
}

export const RegistroJugadorModal: React.FC<RegistroJugadorModalProps> = ({
  clubConfig,
  jugadoresExistentes,
  onRegistrar,
  onIrAIngresar,
  onCerrar,
}) => {
  const [nombrePila, setNombrePila] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [localidad, setLocalidad] = useState('Río Colorado');
  const [rol, setRol] = useState<RolJugador>('Delantero');
  const [categoria, setCategoria] = useState<CategoriaJugador>('2da');
  const [manoHabil, setManoHabil] = useState<ManoHabil>('Derecha');
  const [esSocioClub, setEsSocioClub] = useState<boolean>(true);
  const [numeroSocio, setNumeroSocio] = useState('');
  const [contactoEmergencia, setContactoEmergencia] = useState('');
  const [obraSocial, setObraSocial] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [mostrarCodigoStaff, setMostrarCodigoStaff] = useState(false);
  const [codigoAcceso, setCodigoAcceso] = useState('');

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const nom = nombrePila.trim();
    const ape = apellido.trim();
    const dniLimpio = dni.replace(/[^0-9]/g, '');
    const tel = telefono.trim();
    const em = email.trim();
    const emerg = contactoEmergencia.trim();

    if (nom.length < 2 || ape.length < 2) {
      setErrorMsg('Ingresa tu nombre y apellido completos.');
      return;
    }
    if (dniLimpio.length < 6) {
      setErrorMsg('Ingresa un DNI numérico válido (sin puntos ni letras).');
      return;
    }
    if (tel.length < 6) {
      setErrorMsg('Ingresa un teléfono o WhatsApp válido para coordinar tus partidos.');
      return;
    }
    if (!fechaNacimiento) {
      setErrorMsg('Selecciona tu fecha de nacimiento.');
      return;
    }
    if (!em || !em.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      return;
    }
    if (password.trim().length < 6) {
      setErrorMsg('Elige una contraseña de al menos 6 caracteres para poder ingresar luego.');
      return;
    }
    if (emerg.length < 5) {
      setErrorMsg('Ingresa un contacto de emergencia (nombre y teléfono).');
      return;
    }

    const nombreCompleto = `${nom} ${ape}`.toLowerCase();
    const dniDuplicado = jugadoresExistentes.some(
      (j) => (j.dni || '').replace(/[^0-9]/g, '') === dniLimpio
    );
    if (dniDuplicado) {
      setErrorMsg('Ya existe un pelotari registrado con ese DNI en el padrón del club.');
      return;
    }
    const nombreDuplicado = jugadoresExistentes.some(
      (j) => j.nombre.trim().toLowerCase() === nombreCompleto
    );
    if (nombreDuplicado) {
      setErrorMsg('Ya existe un pelotari registrado con ese nombre y apellido.');
      return;
    }

    setGuardando(true);
    try {
      const obsFinal = [
        obraSocial.trim() ? `Obra Social: ${obraSocial.trim()}` : '',
        observaciones.trim(),
      ]
        .filter(Boolean)
        .join(' · ');

      await onRegistrar({
        nombrePila: nom,
        apellido: ape,
        dni: dniLimpio,
        fechaNacimiento,
        email: em,
        password: password.trim(),
        telefono: tel,
        localidad: localidad.trim() || 'Río Colorado',
        rol,
        categoria,
        manoHabil,
        esSocioClub,
        numeroSocio: esSocioClub ? numeroSocio.trim() || undefined : undefined,
        contactoEmergencia: emerg,
        observaciones: obsFinal || undefined,
        codigoAcceso: codigoAcceso.trim() ? codigoAcceso.trim().toUpperCase() : undefined,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo completar el registro. Intenta nuevamente.'
      );
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-slate-100 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white font-display">
                Registro de Pelotari · {clubConfig.nombreClub}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Datos obligatorios para la póliza del <strong className="text-slate-700 dark:text-slate-200">Seguro Deportivo del Club</strong> y habilitación de turnos.
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar registro"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Bloque 1: Datos Personales */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              1. Datos Personales y Contacto
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  required
                  value={nombrePila}
                  onChange={(e) => setNombrePila(e.target.value)}
                  placeholder="Ej: Juan Pablo"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Apellido *
                </label>
                <input
                  type="text"
                  required
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="Ej: Pérez"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  DNI (sin puntos) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ej: 34567890"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 tabular-nums"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  required
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: +54 9 2931 445566"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Email (tu usuario para ingresar) *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pelotari@email.com"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Contraseña (mín. 6 caracteres) *
                </label>
                <div className="relative">
                  <input
                    type={mostrarPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Para usar la opción Ingresar"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-9 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPass((prev) => !prev)}
                    aria-label={mostrarPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {mostrarPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Localidad / Ciudad *
                </label>
                <input
                  type="text"
                  required
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  placeholder="Ej: Río Colorado / La Adela"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Perfil Deportivo */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              2. Perfil Deportivo en Trinquete
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Posición / Rol *
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as RolJugador)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Delantero">Delantero</option>
                  <option value="Zaguero">Zaguero</option>
                  <option value="Ambos">Ambos (Polifuncional)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Categoría *
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as CategoriaJugador)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-semibold"
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
                  Mano Hábil *
                </label>
                <select
                  value={manoHabil}
                  onChange={(e) => setManoHabil(e.target.value as ManoHabil)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Derecha">Derecha (Diestro)</option>
                  <option value="Zurda">Zurda (Zurdo)</option>
                  <option value="Ambidiestro">Ambidiestro</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bloque 3: Vínculo Club y Emergencia */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              3. Membresía CARC & Contacto de Emergencia
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  ¿Sos socio activo del club?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEsSocioClub(true)}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs transition cursor-pointer ${
                      esSocioClub
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    Soy Socio CARC
                  </button>
                  <button
                    type="button"
                    onClick={() => setEsSocioClub(false)}
                    className={`py-2 px-3 rounded-lg border font-bold text-xs transition cursor-pointer ${
                      !esSocioClub
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    No Socio / Invitado
                  </button>
                </div>
              </div>

              {esSocioClub && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    N° de Socio (si lo recordás)
                  </label>
                  <input
                    type="text"
                    value={numeroSocio}
                    onChange={(e) => setNumeroSocio(e.target.value)}
                    placeholder="Ej: 1042 (opcional)"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Contacto de Emergencia (Nombre y Teléfono) *
              </label>
              <input
                type="text"
                required
                value={contactoEmergencia}
                onChange={(e) => setContactoEmergencia(e.target.value)}
                placeholder="Ej: María Gómez (Esposa) - 2931 551122"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Obra Social / Cobertura Médica (opcional)
                </label>
                <input
                  type="text"
                  value={obraSocial}
                  onChange={(e) => setObraSocial(e.target.value)}
                  placeholder="Ej: OSDE / IPROSS / Particular"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Observaciones / Aclaraciones (opcional)
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Alergias o disponibilidad horaria..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Tu DNI y fecha de nacimiento quedan respaldados para el seguro deportivo obligatorio del Trinquete.</span>
            </div>
          </div>

          {/* Bloque 4 Opcional: Código de Comisión Directiva o Cantina */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button
              type="button"
              onClick={() => setMostrarCodigoStaff((v) => !v)}
              className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>¿Tenés código de acceso para Comisión Directiva o Cantina?</span>
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${mostrarCodigoStaff ? 'rotate-180' : ''}`} />
            </button>

            {mostrarCodigoStaff && (
              <div className="px-4 pb-3.5 pt-1 space-y-2 border-t border-slate-200/70 dark:border-slate-800">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Si integrás la Comisión Directiva o trabajás en la Cantina, ingresá el código institucional provisto por el club para habilitar tu panel automáticamente con tu propia cuenta.
                </p>
                <input
                  type="text"
                  value={codigoAcceso}
                  onChange={(e) => setCodigoAcceso(e.target.value.toUpperCase())}
                  placeholder="Ej: Código de Comisión o Código de Cantina (opcional)"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wider text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Tus datos se guardan en el padrón oficial del club.</span>
              </span>
              {onIrAIngresar && (
                <button
                  type="button"
                  onClick={() => {
                    onCerrar();
                    onIrAIngresar();
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline self-start cursor-pointer"
                >
                  <LogIn className="w-3 h-3" />
                  <span>¿Ya estás registrado? Ingresar a tu cuenta</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onCerrar}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                {guardando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>{guardando ? 'Registrando...' : 'Completar Registro'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
