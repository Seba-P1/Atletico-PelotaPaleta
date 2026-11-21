import React, { useState, useMemo } from 'react';
import {
  CategoriaJugador,
  ClubConfig,
  Jugador,
  ManoHabil,
  RolJugador,
} from '../types';
import {
  X,
  UserPlus,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  KeyRound,
  ChevronDown,
  Search,
  Users,
  UserCheck,
} from 'lucide-react';
import { validarReclamoFichaPadron } from '../utils/authLogic';

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

export interface VincularPadronInput {
  jugadorId: number;
  dni: string;
  email: string;
  password: string;
  telefono?: string;
  fechaNacimiento?: string;
  contactoEmergencia?: string;
  observaciones?: string;
  codigoAcceso?: string;
}

interface RegistroJugadorModalProps {
  clubConfig: ClubConfig;
  jugadoresExistentes: Jugador[];
  onRegistrar: (datos: NuevoJugadorRegistroInput) => Promise<void>;
  onVincularPadron?: (datos: VincularPadronInput) => Promise<void>;
  modoInicial?: 'padron' | 'nuevo';
  onIrAIngresar?: () => void;
  onCerrar: () => void;
}

export const RegistroJugadorModal: React.FC<RegistroJugadorModalProps> = ({
  clubConfig,
  jugadoresExistentes,
  onRegistrar,
  onVincularPadron,
  modoInicial,
  onIrAIngresar,
  onCerrar,
}) => {
  const jugadoresOrdenados = useMemo(() => {
    return jugadoresExistentes
      .filter((j) => j.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [jugadoresExistentes]);

  const [modoActivo, setModoActivo] = useState<'padron' | 'nuevo'>(() => {
    if (modoInicial) return modoInicial;
    return jugadoresOrdenados.length > 0 && onVincularPadron ? 'padron' : 'nuevo';
  });

  // Estado pestaña "Ya figuro en el padrón"
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState<Jugador | null>(null);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [dniPadron, setDniPadron] = useState('');
  const [emailPadron, setEmailPadron] = useState('');
  const [passwordPadron, setPasswordPadron] = useState('');
  const [mostrarPassPadron, setMostrarPassPadron] = useState(false);
  const [telefonoPadron, setTelefonoPadron] = useState('');
  const [fechaNacimientoPadron, setFechaNacimientoPadron] = useState('');
  const [contactoEmergenciaPadron, setContactoEmergenciaPadron] = useState('');
  const [observacionesPadron, setObservacionesPadron] = useState('');
  const [mostrarCodigoStaffPadron, setMostrarCodigoStaffPadron] = useState(false);
  const [codigoAccesoPadron, setCodigoAccesoPadron] = useState('');

  // Estado pestaña "Soy pelotari nuevo"
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

  const jugadoresFiltrados = useMemo(() => {
    const q = filtroBusqueda.trim().toLowerCase();
    if (!q) return jugadoresOrdenados;
    return jugadoresOrdenados.filter(
      (j) =>
        j.nombre.toLowerCase().includes(q) ||
        (j.nombrePila && j.nombrePila.toLowerCase().includes(q)) ||
        (j.apellido && j.apellido.toLowerCase().includes(q)) ||
        (j.categoria && j.categoria.toLowerCase().includes(q))
    );
  }, [jugadoresOrdenados, filtroBusqueda]);

  const handleSeleccionarJugador = (j: Jugador) => {
    setJugadorSeleccionado(j);
    setDropdownAbierto(false);
    setFiltroBusqueda('');
    setErrorMsg('');
    if (j.email) setEmailPadron(j.email);
    if (j.telefono) setTelefonoPadron(j.telefono);
    if (j.fechaNacimiento) setFechaNacimientoPadron(j.fechaNacimiento);
    if (j.contactoEmergencia) setContactoEmergenciaPadron(j.contactoEmergencia);
  };

  const handleCambiarJugador = () => {
    setJugadorSeleccionado(null);
    setDniPadron('');
    setDropdownAbierto(true);
  };

  const handleSubmitPadron = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!onVincularPadron) return;

    const valid = validarReclamoFichaPadron(jugadorSeleccionado || undefined, dniPadron);
    if (!valid.valido) {
      setErrorMsg(valid.error || 'DNI no válido para el jugador seleccionado.');
      return;
    }

    const em = emailPadron.trim();
    if (!em || !em.includes('@')) {
      setErrorMsg('Ingresá un correo electrónico válido para tu cuenta.');
      return;
    }

    if (passwordPadron.trim().length < 6) {
      setErrorMsg('Elegí una contraseña de al menos 6 caracteres.');
      return;
    }

    setGuardando(true);
    try {
      await onVincularPadron({
        jugadorId: jugadorSeleccionado!.id,
        dni: valid.dniLimpio,
        email: em,
        password: passwordPadron.trim(),
        telefono: telefonoPadron.trim() || undefined,
        fechaNacimiento: fechaNacimientoPadron.trim() || undefined,
        contactoEmergencia: contactoEmergenciaPadron.trim() || undefined,
        observaciones: observacionesPadron.trim() || undefined,
        codigoAcceso: codigoAccesoPadron.trim() ? codigoAccesoPadron.trim().toUpperCase() : undefined,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo vincular tu ficha. Intenta nuevamente.'
      );
      setGuardando(false);
    }
  };

  const handleSubmitNuevo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const nom = nombrePila.trim();
    const ape = apellido.trim();
    const dniLimpio = dni.replace(/[^0-9]/g, '');
    const tel = telefono.trim();
    const em = email.trim();
    const emerg = contactoEmergencia.trim();

    if (nom.length < 2 || ape.length < 2) {
      setErrorMsg('Ingresá tu nombre y apellido completos.');
      return;
    }
    if (dniLimpio.length < 6) {
      setErrorMsg('Ingresá un DNI numérico válido (sin puntos ni letras).');
      return;
    }
    if (tel.length < 6) {
      setErrorMsg('Ingresá un teléfono o WhatsApp válido para coordinar tus partidos.');
      return;
    }
    if (!fechaNacimiento) {
      setErrorMsg('Seleccioná tu fecha de nacimiento.');
      return;
    }
    if (!em || !em.includes('@')) {
      setErrorMsg('Ingresá un correo electrónico válido.');
      return;
    }
    if (password.trim().length < 6) {
      setErrorMsg('Elegí una contraseña de al menos 6 caracteres para poder ingresar luego.');
      return;
    }
    if (emerg.length < 5) {
      setErrorMsg('Ingresá un contacto de emergencia (nombre y teléfono).');
      return;
    }

    const nombreCompleto = `${nom} ${ape}`.toLowerCase();
    const dniDuplicado = jugadoresExistentes.some(
      (j) => (j.dni || '').replace(/[^0-9]/g, '') === dniLimpio
    );
    if (dniDuplicado) {
      setErrorMsg('Ya existe un pelotari registrado con ese DNI en el padrón del club. Si ya figurás, podés validar tu perfil en la otra pestaña.');
      return;
    }
    const nombreDuplicado = jugadoresExistentes.some(
      (j) => j.nombre.trim().toLowerCase() === nombreCompleto
    );
    if (nombreDuplicado) {
      setErrorMsg('Ya existe un pelotari registrado con ese nombre y apellido en el padrón.');
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
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de 2 pestañas */}
        {jugadoresOrdenados.length > 0 && onVincularPadron && (
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setModoActivo('padron');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                modoActivo === 'padron'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Ya figuro en el padrón ({jugadoresOrdenados.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModoActivo('nuevo');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                modoActivo === 'nuevo'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Soy pelotari nuevo</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ----------------- MODO PADRÓN ----------------- */}
        {modoActivo === 'padron' && onVincularPadron && (
          <form onSubmit={handleSubmitPadron} className="space-y-4 text-xs">
            {/* Paso 1: Elegir del padrón */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                1. Seleccioná tu nombre del padrón
              </div>

              {!jugadorSeleccionado ? (
                <div className="relative">
                  <button
                    type="button"
                    aria-expanded={dropdownAbierto}
                    onClick={() => setDropdownAbierto((prev) => !prev)}
                    className="w-full flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl px-3.5 py-3 text-left transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                      <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-medium text-xs">Elegí tu nombre de la lista del padrón...</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownAbierto ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownAbierto && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden p-2 space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={filtroBusqueda}
                          onChange={(e) => setFiltroBusqueda(e.target.value)}
                          placeholder="Escribí tu nombre o apellido para filtrar..."
                          autoFocus
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                        {jugadoresFiltrados.length === 0 ? (
                          <div className="p-3 text-center text-slate-400 text-xs">
                            No encontramos jugadores con ese nombre. Probá con otra búsqueda o usá la pestaña "Soy pelotari nuevo".
                          </div>
                        ) : (
                          jugadoresFiltrados.map((j) => (
                            <button
                              key={j.id}
                              type="button"
                              onClick={() => handleSeleccionarJugador(j)}
                              className="w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition cursor-pointer"
                            >
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white text-xs">{j.nombre}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Cat. {j.categoria || '2da'} · {j.rol || 'Delantero'}
                                </div>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  j.email
                                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                {j.email ? 'Con email' : 'Listo para validar'}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-emerald-900 dark:text-emerald-200 text-xs truncate">
                        {jugadorSeleccionado.nombre}
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Cat. {jugadorSeleccionado.categoria || '2da'} · {jugadorSeleccionado.rol || 'Delantero'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCambiarJugador}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer shrink-0"
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>

            {/* Paso 2: Validar identidad y crear acceso */}
            {jugadorSeleccionado && (
              <>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    2. Validá tu identidad y creá tu contraseña
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        DNI (para validar que sos vos, sin puntos) *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={dniPadron}
                        onChange={(e) => setDniPadron(e.target.value)}
                        placeholder="Ej: 34567890"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Tu Email (para ingresar luego) *
                      </label>
                      <input
                        type="email"
                        required
                        value={emailPadron}
                        onChange={(e) => setEmailPadron(e.target.value)}
                        placeholder="tu.email@ejemplo.com"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Contraseña propia (mín. 6 caracteres) *
                      </label>
                      <div className="relative">
                        <input
                          type={mostrarPassPadron ? 'text' : 'password'}
                          required
                          value={passwordPadron}
                          onChange={(e) => setPasswordPadron(e.target.value)}
                          placeholder="Elegí una clave que recuerdes"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarPassPadron((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {mostrarPassPadron ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Teléfono / WhatsApp (opcional)
                      </label>
                      <input
                        type="tel"
                        value={telefonoPadron}
                        onChange={(e) => setTelefonoPadron(e.target.value)}
                        placeholder="Ej: 2931 123456"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Contacto de Emergencia (opcional)
                      </label>
                      <input
                        type="text"
                        value={contactoEmergenciaPadron}
                        onChange={(e) => setContactoEmergenciaPadron(e.target.value)}
                        placeholder="Nombre y teléfono de un familiar"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Código institucional opcional */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMostrarCodigoStaffPadron((v) => !v)}
                    className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-900/60 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>¿Tenés código de acceso para Comisión Directiva o Cantina?</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${mostrarCodigoStaffPadron ? 'rotate-180' : ''}`} />
                  </button>

                  {mostrarCodigoStaffPadron && (
                    <div className="px-4 pb-3.5 pt-1 space-y-2 border-t border-slate-200/70 dark:border-slate-800">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Si integrás la Comisión Directiva o trabajás en la Cantina, ingresá el código institucional para activar tus permisos automáticamente.
                      </p>
                      <input
                        type="text"
                        value={codigoAccesoPadron}
                        onChange={(e) => setCodigoAccesoPadron(e.target.value.toUpperCase())}
                        placeholder="Ej: COMISION-CARC o CANTINA-CARC (opcional)"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wider text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Botones de acción padrón */}
                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Se verificará tu DNI con la ficha existente del padrón.</span>
                    </span>
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
                        <UserCheck className="w-4 h-4" />
                      )}
                      <span>{guardando ? 'Validando...' : 'Validar y Activar mi Cuenta'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </form>
        )}

        {/* ----------------- MODO NUEVO PELOTARI ----------------- */}
        {modoActivo === 'nuevo' && (
          <form onSubmit={handleSubmitNuevo} className="space-y-4 text-xs">
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
                    placeholder="Ej: 2931 123456"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Localidad
                  </label>
                  <input
                    type="text"
                    value={localidad}
                    onChange={(e) => setLocalidad(e.target.value)}
                    placeholder="Río Colorado"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Email (para ingresar luego) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu.email@ejemplo.com"
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Elegí una clave que recuerdes"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarPass((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloque 2: Perfil Deportivo y Club */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                2. Perfil Deportivo y Relación con el Club
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Posición habitual
                  </label>
                  <select
                    value={rol}
                    onChange={(e) => setRol(e.target.value as RolJugador)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="Delantero">Delantero</option>
                    <option value="Zaguero">Zaguero</option>
                    <option value="Ambos">Ambos (Indistinto)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Categoría
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as CategoriaJugador)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="1ra">1ra Categoría</option>
                    <option value="2da">2da Categoría</option>
                    <option value="3ra">3ra Categoría</option>
                    <option value="4ta">4ta Categoría</option>
                    <option value="Principiante">Principiante</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Mano hábil
                  </label>
                  <select
                    value={manoHabil}
                    onChange={(e) => setManoHabil(e.target.value as ManoHabil)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  >
                    <option value="Derecha">Diestro</option>
                    <option value="Zurda">Zurdo</option>
                    <option value="Ambidiestro">Ambidiestro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    id="esSocioClub"
                    checked={esSocioClub}
                    onChange={(e) => setEsSocioClub(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                  />
                  <label htmlFor="esSocioClub" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    ¿Sos socio/a social activo de CARC?
                  </label>
                </div>

                {esSocioClub && (
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      N° de Socio CARC (si lo recordás)
                    </label>
                    <input
                      type="text"
                      value={numeroSocio}
                      onChange={(e) => setNumeroSocio(e.target.value)}
                      placeholder="Ej: 1420"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bloque 3: Salud y Emergencias */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                3. Salud y Contacto de Emergencia
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
                  placeholder="Ej: María Gómez (esposa) - 2931 987654"
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
        )}
      </div>
    </div>
  );
};
