import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { TurneroView } from './components/TurneroView';
import { CantinaIndividualView } from './components/CantinaIndividualView';
import { AdminPanel } from './components/AdminPanel';
import { TorneoModal } from './components/TorneoModal';
import { ReservaModal } from './components/ReservaModal';
import { DetalleTurnoModal } from './components/DetalleTurnoModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  RegistroJugadorModal,
  NuevoJugadorRegistroInput,
  VincularPadronInput,
} from './components/RegistroJugadorModal';
import { LoginModal } from './components/LoginModal';
import { JugadorPerfilModal } from './components/JugadorPerfilModal';
import { MobileBottomNav, SocioTabActivo } from './components/MobileBottomNav';
import {
  ConfirmacionRegistroModal,
  ConfirmacionRegistroState,
} from './components/ConfirmacionRegistroModal';
import { PWAUpdater } from './components/PWAUpdater';

import {
  Jugador,
  HorarioConfig,
  ProductoCantina,
  Turno,
  ComandaCantina,
  MovimientoCaja,
  ConsumoIndividual,
  PublicacionClub,
  MetodoPago,
  ResultadoPartido,
  ClubConfig,
  TorneoData,
  ParejaTurno,
  ProductoUsadoConsumo,
  AdminSeccionId,
  RolAcceso,
  DiaBloqueado,
} from './types';

import {
  formatearMoneda,
  generarClaveTurno,
  normalizarTurnosLegacy,
  evaluarVentanaReserva,
  evaluarBloqueoDia,
  obtenerFechaHoraArgentina,
} from './utils/turnosLogic';
import {
  buscarJugadorPorEmail,
  buscarJugadorPorEmailYDni,
  resolverSesionLocal,
  obtenerPermisosRol,
  resolverCodigoAcceso,
  AccessCodesConfig,
  DEFAULT_ACCESS_CODES,
  parsearRetornoConfirmacionEmail,
  validarReclamoFichaPadron,
} from './utils/authLogic';
import {
  evaluarEstadoFinancieroJugador,
  formatearPeriodoMes,
  resolverUltimoMesAlMarcarNoPago,
} from './utils/billingLogic';
import { storageService, STORAGE_KEYS } from './services/storageService';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient';
import { supabaseRepository } from './services/supabaseRepository';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const hoyAr = obtenerFechaHoraArgentina();
  const hoyStr = hoyAr.fechaIso;
  const desdeFechaDate = new Date(`${hoyStr}T12:00:00`);
  desdeFechaDate.setDate(desdeFechaDate.getDate() - 3);
  const desdeFechaStr = desdeFechaDate.toISOString().split('T')[0];

  const supabaseConfigurado = isSupabaseConfigured();
  const [supabaseConectado, setSupabaseConectado] = useState<boolean>(supabaseConfigurado);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  // Tema por defecto: MODO CLARO (Minimalista Verde y Blanco CARC)
  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TEMA);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TEMA, tema);
    if (tema === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [tema]);

  const toggleTema = () => {
    setTema((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Control de acceso basado en rol: guest / jugador / cantinero / super_admin (Comisión Directiva)
  const [rolAcceso, setRolAcceso] = useState<RolAcceso>(() => {
    if (supabaseConfigurado) return 'guest';
    const localSession = storageService.loadLocalSession();
    if (localSession?.rol) return localSession.rol;
    if (localSession?.esAdmin || localStorage.getItem(STORAGE_KEYS.ES_ADMIN) === 'true') {
      return 'super_admin';
    }
    return localSession ? 'jugador' : 'guest';
  });
  const permisos = React.useMemo(() => obtenerPermisosRol(rolAcceso), [rolAcceso]);

  const [usuarioAutenticado, setUsuarioAutenticado] = useState<boolean>(() => {
    if (supabaseConfigurado) return false;
    const localSession = storageService.loadLocalSession();
    if (localSession) return true;
    return localStorage.getItem(STORAGE_KEYS.ES_ADMIN) === 'true';
  });

  useEffect(() => {
    if (!supabaseConectado) {
      localStorage.setItem(STORAGE_KEYS.ES_ADMIN, permisos.esSuperAdmin.toString());
    }
  }, [permisos.esSuperAdmin, supabaseConectado]);

  // PIN de administrador local (usado solo cuando Supabase no está configurado)
  const [adminPin, setAdminPin] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) || '1942';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, adminPin);
  }, [adminPin]);

  const [accessCodes, setAccessCodes] = useState<AccessCodesConfig>(() =>
    supabaseConfigurado ? DEFAULT_ACCESS_CODES : storageService.loadAccessCodes()
  );

  useEffect(() => {
    if (!supabaseConectado) {
      storageService.saveAccessCodes(accessCodes);
    }
  }, [accessCodes, supabaseConectado]);

  const [diasBloqueados, setDiasBloqueados] = useState<Record<string, DiaBloqueado>>(() =>
    supabaseConfigurado ? {} : storageService.loadDiasBloqueados()
  );

  useEffect(() => {
    if (!supabaseConectado) {
      storageService.saveDiasBloqueados(diasBloqueados);
    }
  }, [diasBloqueados, supabaseConectado]);

  const [modalLoginAbierto, setModalLoginAbierto] = useState<boolean>(false);

  // Navegación
  const [vistaActiva, setVistaActiva] = useState<'turnos' | 'cantina' | 'admin' | 'torneo'>('turnos');
  const [seccionAdmin, setSeccionAdmin] = useState<AdminSeccionId>('metricas');
  const [sheetAdminAbierto, setSheetAdminAbierto] = useState<boolean>(false);
  const [socioTabActivo, setSocioTabActivo] = useState<SocioTabActivo>('turnos');
  const [nombreUsuario, setNombreUsuario] = useState<string>(() => {
    if (supabaseConfigurado) return 'Socio Pelotari';
    const localSession = storageService.loadLocalSession();
    if (localSession?.nombre) return localSession.nombre;
    return localStorage.getItem(STORAGE_KEYS.ES_ADMIN) === 'true'
      ? 'Comisión Directiva'
      : 'Socio Pelotari';
  });
  const [sessionEmail, setSessionEmail] = useState<string | null>(() => {
    if (supabaseConfigurado) return null;
    return storageService.loadLocalSession()?.email || null;
  });

  const operadorNombre = React.useMemo(() => {
    if (nombreUsuario && nombreUsuario !== 'Socio Pelotari') return nombreUsuario;
    if (permisos.esSuperAdmin) return 'Comisión Directiva';
    if (permisos.esCantinero) return 'Cantina';
    return 'Pelotari';
  }, [nombreUsuario, permisos.esSuperAdmin, permisos.esCantinero]);

  const abrirLogin = useCallback(() => {
    setModalLoginAbierto(true);
  }, []);

  // Atajos directos para abrir el modal de ingreso (además del botón visible "Ingresar"):
  // 1) URL: ?admin=1, #admin o /admin
  // 2) Atajo de teclado: Ctrl + Shift + A (o Cmd + Shift + A)
  // 3) 5 toques seguidos sobre el nombre del club en el pie de página
  useEffect(() => {
    const { search, hash, pathname } = window.location;
    const params = new URLSearchParams(search);
    const pideAdminPorUrl =
      params.get('admin') === '1' ||
      params.has('admin') ||
      hash.toLowerCase() === '#admin' ||
      pathname.toLowerCase() === '/admin';

    if (pideAdminPorUrl) {
      if (!permisos.esStaff) {
        abrirLogin();
      }
      window.history.replaceState(null, '', '/');
    }
  }, [permisos.esStaff, abrirLogin]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!permisos.esStaff) {
          abrirLogin();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [permisos.esStaff, abrirLogin]);

  const adminTapRef = useRef<{ count: number; timer: number | null }>({ count: 0, timer: null });
  const handleDiscreetAdminTap = () => {
    if (permisos.esStaff) return;
    adminTapRef.current.count += 1;
    if (adminTapRef.current.timer) {
      window.clearTimeout(adminTapRef.current.timer);
    }
    if (adminTapRef.current.count >= 5) {
      adminTapRef.current.count = 0;
      abrirLogin();
      return;
    }
    adminTapRef.current.timer = window.setTimeout(() => {
      adminTapRef.current.count = 0;
    }, 1800);
  };

  // Toast nativo
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const mostrarToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3800);
  }, []);

  // Diálogo de confirmación accesible (sin window.confirm)
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    titulo: string;
    mensaje: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  const solicitarConfirmacion = (cfg: {
    titulo: string;
    mensaje: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary';
    onConfirm: () => void;
  }) => {
    setConfirmState({ open: true, ...cfg });
  };

  // Bloqueo estricto de rutas por rol (Comisión vs Cantina vs Jugador/Invitado)
  useEffect(() => {
    if (!permisos.esStaff && vistaActiva !== 'turnos') {
      setVistaActiva('turnos');
    } else if (!permisos.esSuperAdmin && (vistaActiva === 'admin' || vistaActiva === 'torneo')) {
      setVistaActiva('turnos');
    }
  }, [permisos.esStaff, permisos.esSuperAdmin, vistaActiva]);

  // Configuración institucional del club
  const [clubConfig, setClubConfig] = useState<ClubConfig>(() => storageService.loadClubConfig());
  const [modoMesasActivo, setModoMesasActivo] = useState<boolean>(() => clubConfig.modoMesasActivo);

  useEffect(() => {
    if (!supabaseConectado) {
      storageService.saveClubConfig({ ...clubConfig, modoMesasActivo });
    }
  }, [clubConfig, modoMesasActivo, supabaseConectado]);

  // Fecha activa en Turnero
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(hoyStr);

  // Colecciones persistentes (cuando Supabase está configurado, arranca vacío hasta sincronizar DB real)
  const [publicaciones, setPublicaciones] = useState<PublicacionClub[]>(() =>
    supabaseConfigurado ? [] : storageService.loadPublicaciones()
  );
  const [turnos, setTurnos] = useState<Record<string, Turno>>(() =>
    supabaseConfigurado ? {} : storageService.loadTurnos(hoyStr)
  );
  const [jugadores, setJugadores] = useState<Jugador[]>(() =>
    supabaseConfigurado ? [] : storageService.loadJugadores()
  );
  const [horarios, setHorarios] = useState<HorarioConfig[]>(() => storageService.loadHorarios());
  const [consumos, setConsumos] = useState<ConsumoIndividual[]>(() =>
    supabaseConfigurado ? [] : storageService.loadConsumos()
  );
  const [productos, setProductos] = useState<ProductoCantina[]>(() =>
    supabaseConfigurado ? [] : storageService.loadProductos()
  );
  const [comandas, setComandas] = useState<ComandaCantina[]>(() =>
    supabaseConfigurado ? [] : storageService.loadComandas()
  );
  const [movimientosCaja, setMovimientosCaja] = useState<MovimientoCaja[]>(() =>
    supabaseConfigurado ? [] : storageService.loadMovimientosCaja()
  );
  const [torneoGuardado, setTorneoGuardado] = useState<TorneoData | null>(() =>
    supabaseConfigurado ? null : storageService.loadTorneo()
  );

  // Guardado local offline / modo demo cuando Supabase no está activo
  useEffect(() => {
    if (!supabaseConectado) storageService.savePublicaciones(publicaciones);
  }, [publicaciones, supabaseConectado]);

  useEffect(() => {
    if (!supabaseConectado) storageService.saveTurnos(turnos);
  }, [turnos, supabaseConectado]);

  useEffect(() => {
    if (!supabaseConectado) storageService.saveJugadores(jugadores);
  }, [jugadores, supabaseConectado]);

  useEffect(() => {
    if (!supabaseConectado) storageService.saveHorarios(horarios);
  }, [horarios, supabaseConectado]);

  useEffect(() => {
    if (!supabaseConectado) storageService.saveConsumos(consumos);
  }, [consumos, supabaseConectado]);

  useEffect(() => {
    if (!supabaseConectado) storageService.saveProductos(productos);
  }, [productos, supabaseConectado]);

  useEffect(() => {
    if (!supabaseConectado) storageService.saveComandas(comandas);
  }, [comandas, supabaseConectado]);

  useEffect(() => {
    if (!supabaseConectado) storageService.saveMovimientosCaja(movimientosCaja);
  }, [movimientosCaja, supabaseConectado]);

  // --------------------------------------------------------------------------
  // SINCRONIZACIÓN CON SUPABASE (BOOTSTRAP, AUTH & REALTIME)
  // --------------------------------------------------------------------------
  const cargarDatosPublicos = useCallback(async () => {
    if (!supabaseConfigurado) return;
    try {
      const data = await supabaseRepository.fetchPublicData(desdeFechaStr);
      setClubConfig(data.clubConfig);
      setModoMesasActivo(data.clubConfig.modoMesasActivo);
      setHorarios(data.horarios);
      setJugadores(data.jugadores);
      setTurnos(data.turnos);
      setPublicaciones(data.publicaciones);
      setDiasBloqueados(data.diasBloqueados || {});
      setSupabaseConectado(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('does not exist') ||
        msg.includes('Could not find the table') ||
        msg.includes('42P01')
      ) {
        setSupabaseConectado(false);
        console.warn('Supabase conectado pero las tablas aún no fueron creadas con schema.sql:', msg);
      } else {
        console.error('Error cargando datos públicos de Supabase:', msg);
      }
    }
  }, [supabaseConfigurado, desdeFechaStr]);

  const cargarDatosAdmin = useCallback(
    async (esSuperAdminOverride?: boolean) => {
      if (!supabaseConfigurado) return;
      const esSuper = esSuperAdminOverride ?? permisos.esSuperAdmin;
      try {
        const adminData = await supabaseRepository.fetchAdminData(esSuper);
        setProductos(adminData.productos);
        setConsumos(adminData.consumos);
        if (esSuper) {
          setMovimientosCaja(adminData.movimientosCaja);
          setTorneoGuardado(adminData.torneo);
          const codes = await supabaseRepository.fetchAccessCodes();
          if (codes) setAccessCodes(codes);
        } else {
          setMovimientosCaja([]);
          setTorneoGuardado(null);
        }
      } catch (err) {
        console.error('Error cargando datos administrativos de Supabase:', err);
      }
    },
    [supabaseConfigurado, permisos.esSuperAdmin]
  );

  const retornoEmailRef = useRef(
    typeof window !== 'undefined'
      ? parsearRetornoConfirmacionEmail(window.location.search, window.location.hash)
      : { status: 'none' as const }
  );
  const [confirmacionRegistroModal, setConfirmacionRegistroModal] =
    useState<ConfirmacionRegistroState | null>(null);

  useEffect(() => {
    if (supabaseConfigurado) return;
    const ret = retornoEmailRef.current;
    if (ret.status === 'none') return;
    retornoEmailRef.current = { status: 'none' };
    window.history.replaceState(null, '', window.location.pathname || '/');
    if (ret.status === 'error') {
      setConfirmacionRegistroModal({
        estado: 'error',
        mensajeError: ret.mensajeError,
      });
    } else {
      setConfirmacionRegistroModal({
        estado: 'confirmado',
        nombre: usuarioAutenticado ? nombreUsuario : undefined,
        email: sessionEmail || undefined,
        rolAcceso,
        usuarioAutenticado,
      });
    }
  }, [supabaseConfigurado, usuarioAutenticado, nombreUsuario, sessionEmail, rolAcceso]);

  useEffect(() => {
    if (!supabaseConfigurado) return;

    let activo = true;
    const aplicarSesionSupabase = async () => {
      let session = await supabaseRepository.getCurrentSession();
      if (!activo) return null;
      if (session) {
        const reclamoPendiente = storageService.loadPendingPadronClaim(session.email);
        if (reclamoPendiente) {
          try {
            const vinculado = await supabaseRepository.vincularMiFichaPadronRpc({
              jugadorId: reclamoPendiente.jugadorId,
              dni: reclamoPendiente.dni,
              telefono: reclamoPendiente.telefono,
              fechaNacimiento: reclamoPendiente.fechaNacimiento,
              contactoEmergencia: reclamoPendiente.contactoEmergencia,
              observaciones: reclamoPendiente.observaciones,
            });
            setJugadores((prev) =>
              prev.map((j) => (j.id === vinculado.id ? vinculado : j))
            );
          } catch (err) {
            console.error('Error procesando reclamo pendiente de padrón:', err);
          } finally {
            storageService.clearPendingPadronClaim();
          }
        }

        const codigoPendiente = storageService.loadPendingAccessCode(session.email);
        if (codigoPendiente) {
          try {
            const upd = await supabaseRepository.canjearCodigoAccesoRpc(
              codigoPendiente,
              session.nombreMostrado
            );
            if (upd) {
              session = upd;
            }
          } catch (err) {
            console.error('Error canjeando código pendiente de acceso:', err);
          } finally {
            storageService.clearPendingAccessCode();
          }
        }

        setUsuarioAutenticado(true);
        setNombreUsuario(session.nombreMostrado);
        setSessionEmail(session.email || null);
        setRolAcceso(session.rolAcceso);
        setAdminEmail(session.rolAcceso === 'super_admin' ? session.email : null);
        if (session.rolAcceso === 'super_admin' || session.rolAcceso === 'cantinero') {
          await cargarDatosAdmin(session.rolAcceso === 'super_admin');
        }
        return session;
      } else {
        setUsuarioAutenticado(false);
        setRolAcceso('guest');
        setAdminEmail(null);
        setSessionEmail(null);
        setNombreUsuario('Socio Pelotari');
        return null;
      }
    };

    const inicializar = async () => {
      await cargarDatosPublicos();
      const sessionRes = await aplicarSesionSupabase();

      const ret = retornoEmailRef.current;
      if (ret.status !== 'none') {
        retornoEmailRef.current = { status: 'none' };
        window.history.replaceState(null, '', window.location.pathname || '/');
        if (ret.status === 'error') {
          setConfirmacionRegistroModal({
            estado: 'error',
            mensajeError: ret.mensajeError,
          });
        } else {
          setConfirmacionRegistroModal({
            estado: 'confirmado',
            nombre: sessionRes ? sessionRes.nombreMostrado : undefined,
            email: sessionRes?.email || undefined,
            rolAcceso: sessionRes?.rolAcceso || 'jugador',
            usuarioAutenticado: Boolean(sessionRes),
          });
        }
      }
    };
    void inicializar();

    const { data: authListener } = supabase
      ? supabase.auth.onAuthStateChange(async (event) => {
          if (!activo) return;
          if (event === 'SIGNED_OUT') {
            setUsuarioAutenticado(false);
            setRolAcceso('guest');
            setAdminEmail(null);
            setSessionEmail(null);
            setNombreUsuario('Socio Pelotari');
            setVistaActiva('turnos');
            return;
          }
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await cargarDatosPublicos();
            await aplicarSesionSupabase();
          }
        })
      : { data: { subscription: null } };

    return () => {
      activo = false;
      authListener.subscription?.unsubscribe();
    };
  }, [supabaseConfigurado, cargarDatosPublicos, cargarDatosAdmin]);

  // Realtime público (turnos, horarios, cartelera, padrón, días bloqueados)
  const publicDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!supabaseConectado) return;
    const unsubscribe = supabaseRepository.subscribePublicRealtime(() => {
      if (publicDebounceRef.current) window.clearTimeout(publicDebounceRef.current);
      publicDebounceRef.current = window.setTimeout(() => {
        void cargarDatosPublicos();
      }, 250);
    });
    return () => {
      if (publicDebounceRef.current) window.clearTimeout(publicDebounceRef.current);
      unsubscribe();
    };
  }, [supabaseConectado, cargarDatosPublicos]);

  // Realtime operativo / administrativo (cantina, stock; y caja/torneos solo si es Comisión)
  const adminDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!supabaseConectado || !permisos.esStaff) return;
    const unsubscribe = supabaseRepository.subscribeAdminRealtime(() => {
      if (adminDebounceRef.current) window.clearTimeout(adminDebounceRef.current);
      adminDebounceRef.current = window.setTimeout(() => {
        void Promise.all([cargarDatosAdmin(permisos.esSuperAdmin), cargarDatosPublicos()]);
      }, 250);
    }, permisos.esSuperAdmin);
    return () => {
      if (adminDebounceRef.current) window.clearTimeout(adminDebounceRef.current);
      unsubscribe();
    };
  }, [supabaseConectado, permisos.esStaff, permisos.esSuperAdmin, cargarDatosAdmin, cargarDatosPublicos]);

  // Modales
  const [modalReservaHorarioId, setModalReservaHorarioId] = useState<string | null>(null);
  const [modalDetalleTurnoId, setModalDetalleTurnoId] = useState<string | null>(null);
  const [mostrarModalTorneo, setMostrarModalTorneo] = useState<boolean>(false);
  const [modalRegistroJugadorAbierto, setModalRegistroJugadorAbierto] = useState<boolean>(false);
  const [modoRegistroInicial, setModoRegistroInicial] = useState<'padron' | 'nuevo' | undefined>(undefined);
  const [modalPerfilAbierto, setModalPerfilAbierto] = useState<boolean>(false);
  const [misConsumosSupabase, setMisConsumosSupabase] = useState<ConsumoIndividual[]>([]);
  const [cargandoMisConsumos, setCargandoMisConsumos] = useState<boolean>(false);

  const jugadorLogueado = React.useMemo(() => {
    if (!usuarioAutenticado) return null;
    if (sessionEmail) {
      const porEmail = buscarJugadorPorEmail(jugadores, sessionEmail);
      if (porEmail) return porEmail;
    }
    const nombreNorm = nombreUsuario.trim().toLowerCase();
    if (
      !nombreNorm ||
      nombreNorm === 'socio pelotari' ||
      nombreNorm === 'socio jugador' ||
      nombreNorm === 'administrador' ||
      nombreNorm === 'comisión directiva' ||
      nombreNorm === 'cantina'
    ) {
      return null;
    }
    return jugadores.find((j) => j.nombre.trim().toLowerCase() === nombreNorm) || null;
  }, [usuarioAutenticado, sessionEmail, jugadores, nombreUsuario]);

  const cargarMisConsumos = useCallback(async () => {
    if (!supabaseConectado || !usuarioAutenticado) return;
    setCargandoMisConsumos(true);
    try {
      const lista = await supabaseRepository.fetchMisConsumosRpc();
      setMisConsumosSupabase(lista);
    } finally {
      setCargandoMisConsumos(false);
    }
  }, [supabaseConectado, usuarioAutenticado]);

  useEffect(() => {
    if (usuarioAutenticado && supabaseConectado) {
      void cargarMisConsumos();
    } else if (!usuarioAutenticado) {
      setMisConsumosSupabase([]);
    }
  }, [usuarioAutenticado, supabaseConectado, cargarMisConsumos]);

  // Preselección al pasar desde Turno -> Cantina
  const [clienteCantinaNombre, setClienteCantinaNombre] = useState<string | null>(null);

  // Ingreso unificado (Jugadores + detección automática de Comisión Directiva / Cantina)
  const handleIniciarSesion = async (emailOIdentificador: string, password: string) => {
    if (supabaseConectado) {
      let session = await supabaseRepository.signInWithCredentials(emailOIdentificador, password);
      const reclamoPendiente = storageService.loadPendingPadronClaim(session.email);
      if (reclamoPendiente) {
        try {
          const vinculado = await supabaseRepository.vincularMiFichaPadronRpc({
            jugadorId: reclamoPendiente.jugadorId,
            dni: reclamoPendiente.dni,
            telefono: reclamoPendiente.telefono,
            fechaNacimiento: reclamoPendiente.fechaNacimiento,
            contactoEmergencia: reclamoPendiente.contactoEmergencia,
            observaciones: reclamoPendiente.observaciones,
          });
          setJugadores((prev) =>
            prev.map((j) => (j.id === vinculado.id ? vinculado : j))
          );
        } catch (err) {
          console.error('Error procesando reclamo pendiente de padrón al iniciar sesión:', err);
        } finally {
          storageService.clearPendingPadronClaim();
        }
      }

      const codigoPendiente = storageService.loadPendingAccessCode(session.email);
      if (codigoPendiente) {
        try {
          const upd = await supabaseRepository.canjearCodigoAccesoRpc(
            codigoPendiente,
            session.nombreMostrado
          );
          if (upd) {
            session = upd;
          }
        } catch (err) {
          console.error('Error canjeando código pendiente de acceso:', err);
        } finally {
          storageService.clearPendingAccessCode();
        }
      }

      setUsuarioAutenticado(true);
      setNombreUsuario(session.nombreMostrado);
      setSessionEmail(session.email || null);
      setRolAcceso(session.rolAcceso);
      setAdminEmail(session.rolAcceso === 'super_admin' ? session.email : null);

      if (session.rolAcceso === 'super_admin' || session.rolAcceso === 'cantinero') {
        await Promise.all([
          cargarDatosPublicos(),
          cargarDatosAdmin(session.rolAcceso === 'super_admin'),
        ]);
        setModalLoginAbierto(false);
        mostrarToast(
          session.rolAcceso === 'super_admin'
            ? `Bienvenido/a, ${session.nombreMostrado}. Panel de Comisión Directiva habilitado.`
            : `Bienvenido/a, ${session.nombreMostrado}. Acceso a Cantina y Turnos habilitado.`
        );
      } else {
        await cargarDatosPublicos();
        setModalLoginAbierto(false);
        mostrarToast(`¡Bienvenido/a, ${session.nombreMostrado}!`);
      }
      return;
    }

    const res = resolverSesionLocal({
      identificador: emailOIdentificador,
      password,
      adminPin,
      localAccounts: storageService.loadLocalAccounts(),
      jugadores,
    });

    if (!res.authenticated) {
      throw new Error(res.error || 'Email o contraseña incorrectos.');
    }

    storageService.saveLocalSession({
      esAdmin: res.rol === 'super_admin',
      rol: res.rol,
      email: res.email,
      nombre: res.nombreMostrado,
      jugadorId: res.jugadorId,
    });
    setUsuarioAutenticado(true);
    setRolAcceso(res.rol);
    setAdminEmail(res.rol === 'super_admin' ? res.email : null);
    setSessionEmail(res.email || null);
    setNombreUsuario(res.nombreMostrado);
    setModalLoginAbierto(false);
    mostrarToast(
      res.rol === 'super_admin'
        ? 'Acceso de Comisión Directiva habilitado automáticamente'
        : res.rol === 'cantinero'
        ? 'Acceso de Cantina y Turnos habilitado'
        : `¡Bienvenido/a, ${res.nombreMostrado}!`
    );
  };

  // Canjear código de acceso institucional (Comisión Directiva o Cantina)
  const handleCanjearCodigoAcceso = async (codigo: string): Promise<{ etiquetaRol?: string }> => {
    if (supabaseConectado) {
      const session = await supabaseRepository.canjearCodigoAccesoRpc(codigo, nombreUsuario);
      if (!session) throw new Error('No se pudo validar tu sesión actual.');
      setRolAcceso(session.rolAcceso);
      setAdminEmail(session.rolAcceso === 'super_admin' ? session.email : null);
      if (session.rolAcceso === 'super_admin' || session.rolAcceso === 'cantinero') {
        await Promise.all([
          cargarDatosPublicos(),
          cargarDatosAdmin(session.rolAcceso === 'super_admin'),
        ]);
      }
      const etiquetaRol =
        session.rolAcceso === 'super_admin'
          ? 'Comisión Directiva (Super Admin)'
          : session.rolAcceso === 'cantinero'
          ? 'Encargado de Cantina y Turnos'
          : 'Pelotari';
      mostrarToast(`Permiso actualizado: ${etiquetaRol}`);
      return { etiquetaRol };
    }

    const res = resolverCodigoAcceso(codigo, accessCodes);
    if (!res.valido) {
      throw new Error(res.error || 'El código de acceso ingresado no es válido.');
    }
    if (sessionEmail) {
      const accounts = storageService.loadLocalAccounts();
      const existing = accounts[sessionEmail.trim().toLowerCase()];
      if (existing) {
        storageService.saveLocalAccount({ ...existing, rol: res.rol });
      }
    }
    storageService.saveLocalSession({
      esAdmin: res.rol === 'super_admin',
      rol: res.rol,
      email: sessionEmail || '',
      nombre: nombreUsuario,
      jugadorId: jugadorLogueado?.id,
    });
    setRolAcceso(res.rol);
    setAdminEmail(res.rol === 'super_admin' ? sessionEmail : null);
    mostrarToast(`Permiso actualizado: ${res.etiquetaRol}`);
    return { etiquetaRol: res.etiquetaRol };
  };

  // Activar contraseña para jugadores que ya figuraban en el padrón sin clave
  const handleActivarAccesoJugador = async (email: string, dni: string, password: string) => {
    const jugadorMatch = buscarJugadorPorEmailYDni(jugadores, email, dni);
    if (!jugadorMatch) {
      throw new Error(
        'No encontramos un pelotari registrado con ese Email y DNI combinados. Verifica tus datos o regístrate.'
      );
    }

    if (supabaseConectado) {
      const authRes = await supabaseRepository.signUpJugadorAuth({
        email,
        password,
        nombreCompleto: jugadorMatch.nombre,
        dni,
      });

      setModalLoginAbierto(false);
      if (authRes.hasSession) {
        setUsuarioAutenticado(true);
        setRolAcceso('jugador');
        setAdminEmail(null);
        setSessionEmail(email.trim());
        setNombreUsuario(jugadorMatch.nombre);
        mostrarToast(`¡Acceso activado! Bienvenido/a, ${jugadorMatch.nombre}.`);
      } else {
        setConfirmacionRegistroModal({
          estado: 'pendiente',
          nombre: jugadorMatch.nombre,
          email: email.trim(),
          tieneCodigoPendiente: false,
        });
      }
      return;
    }

    storageService.saveLocalAccount({
      email,
      password,
      nombre: jugadorMatch.nombre,
      jugadorId: jugadorMatch.id,
      rol: 'jugador',
    });
    storageService.saveLocalSession({
      esAdmin: false,
      rol: 'jugador',
      email,
      nombre: jugadorMatch.nombre,
      jugadorId: jugadorMatch.id,
    });
    setUsuarioAutenticado(true);
    setRolAcceso('jugador');
    setAdminEmail(null);
    setSessionEmail(email.trim());
    setNombreUsuario(jugadorMatch.nombre);
    setModalLoginAbierto(false);
    mostrarToast(`¡Acceso activado! Bienvenido/a, ${jugadorMatch.nombre}.`);
  };

  const handleCerrarSesion = async () => {
    if (supabaseConectado) {
      await supabaseRepository.signOut();
    } else {
      storageService.saveLocalSession(null);
    }
    setRolAcceso('guest');
    setUsuarioAutenticado(false);
    setAdminEmail(null);
    setSessionEmail(null);
    setModalPerfilAbierto(false);
    setNombreUsuario('Socio Pelotari');
    setVistaActiva('turnos');
    mostrarToast('Sesión cerrada.');
  };

  // Auto-registro público completo de jugadores (crea ficha + credenciales de ingreso + código opcional)
  const handleRegistrarJugadorPublico = async (datos: NuevoJugadorRegistroInput) => {
    const codigoTrim = datos.codigoAcceso?.trim() || '';

    if (supabaseConectado) {
      try {
        const authRes = await supabaseRepository.signUpJugadorAuth({
          email: datos.email,
          password: datos.password,
          nombreCompleto: `${datos.nombrePila} ${datos.apellido}`.trim(),
          dni: datos.dni,
        });

        const creado = await supabaseRepository.registrarJugadorPublicoRpc(datos);
        setJugadores((prev) => {
          const sinDuplicado = prev.filter((item) => item.id !== creado.id);
          return [...sinDuplicado, creado];
        });
        setModalRegistroJugadorAbierto(false);

        if (authRes.hasSession) {
          setUsuarioAutenticado(true);
          setSessionEmail(datos.email.trim());
          setNombreUsuario(creado.nombre);

          if (codigoTrim) {
            try {
              const sessionUpd = await supabaseRepository.canjearCodigoAccesoRpc(codigoTrim, creado.nombre);
              if (sessionUpd) {
                setRolAcceso(sessionUpd.rolAcceso);
                setAdminEmail(sessionUpd.rolAcceso === 'super_admin' ? sessionUpd.email : null);
                if (sessionUpd.rolAcceso === 'super_admin' || sessionUpd.rolAcceso === 'cantinero') {
                  await cargarDatosAdmin(sessionUpd.rolAcceso === 'super_admin');
                }
                mostrarToast(
                  sessionUpd.rolAcceso === 'super_admin'
                    ? `¡Bienvenido/a ${creado.nombre}! Acceso de Comisión Directiva activado.`
                    : `¡Bienvenido/a ${creado.nombre}! Acceso de Cantina y Turnos activado.`
                );
                return;
              }
            } catch {
              setRolAcceso('jugador');
              setAdminEmail(null);
              mostrarToast(
                `Tu ficha se guardó, ${creado.nombre}, pero el código de panel no coincidió. Podés reintentarlo en "Mi Perfil".`
              );
              return;
            }
          }

          setRolAcceso('jugador');
          setAdminEmail(null);
          mostrarToast(`¡Bienvenido/a ${creado.nombre}! Tu ficha y cuenta quedaron activas.`);
        } else {
          if (codigoTrim) {
            storageService.savePendingAccessCode(datos.email, codigoTrim);
          }
          setConfirmacionRegistroModal({
            estado: 'pendiente',
            nombre: creado.nombre,
            email: datos.email.trim(),
            tieneCodigoPendiente: Boolean(codigoTrim),
          });
        }
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('Could not find the function') ||
          msg.includes('registrar_jugador')
        ) {
          throw new Error(
            'Falta ejecutar el script supabase/limpiar-y-migrar.sql en Supabase SQL Editor para activar el auto-registro de pelotaris.'
          );
        }
        throw err instanceof Error ? err : new Error(msg);
      }
    }

    let rolAsignado: RolAcceso = 'jugador';
    let etiquetaRol = '';
    if (codigoTrim) {
      const codeRes = resolverCodigoAcceso(codigoTrim, accessCodes);
      if (!codeRes.valido) {
        throw new Error(codeRes.error || 'El código de acceso institucional no es válido.');
      }
      rolAsignado = codeRes.rol;
      etiquetaRol = codeRes.etiquetaRol || '';
    }

    const nuevoLocal: Jugador = {
      id: Date.now(),
      nombre: `${datos.nombrePila} ${datos.apellido}`.trim(),
      nombrePila: datos.nombrePila,
      apellido: datos.apellido,
      dni: datos.dni,
      fechaNacimiento: datos.fechaNacimiento,
      email: datos.email,
      telefono: datos.telefono,
      localidad: datos.localidad,
      rol: datos.rol,
      categoria: datos.categoria,
      manoHabil: datos.manoHabil,
      esSocioClub: datos.esSocioClub,
      numeroSocio: datos.numeroSocio,
      contactoEmergencia: datos.contactoEmergencia,
      observaciones: datos.observaciones,
      saldoCuentaCorriente: 0,
      activo: true,
      partidosJugados: 0,
    };
    setJugadores((prev) => [...prev, nuevoLocal]);
    storageService.saveLocalAccount({
      email: datos.email,
      password: datos.password,
      nombre: nuevoLocal.nombre,
      jugadorId: nuevoLocal.id,
      rol: rolAsignado,
    });
    storageService.saveLocalSession({
      esAdmin: rolAsignado === 'super_admin',
      rol: rolAsignado,
      email: datos.email,
      nombre: nuevoLocal.nombre,
      jugadorId: nuevoLocal.id,
    });
    setUsuarioAutenticado(true);
    setRolAcceso(rolAsignado);
    setAdminEmail(rolAsignado === 'super_admin' ? datos.email.trim() : null);
    setSessionEmail(datos.email.trim());
    setNombreUsuario(nuevoLocal.nombre);
    setModalRegistroJugadorAbierto(false);
    mostrarToast(
      etiquetaRol
        ? `¡Bienvenido/a ${nuevoLocal.nombre}! Acceso habilitado: ${etiquetaRol}.`
        : `¡Bienvenido/a ${nuevoLocal.nombre}! Tu cuenta y ficha quedaron guardadas.`
    );
  };

  // Vincular ficha existente del padrón a cuenta propia
  const handleVincularPadron = async (datos: VincularPadronInput) => {
    const jugadorTarget = jugadores.find((j) => j.id === datos.jugadorId);
    if (!jugadorTarget) {
      throw new Error('No se encontró la ficha seleccionada en el padrón.');
    }

    const valid = validarReclamoFichaPadron(jugadorTarget, datos.dni);
    if (!valid.valido) {
      throw new Error(valid.error || 'El DNI no coincide con la ficha seleccionada.');
    }

    const codigoTrim = datos.codigoAcceso?.trim() || '';

    if (supabaseConectado) {
      const authRes = await supabaseRepository.signUpJugadorAuth({
        email: datos.email,
        password: datos.password,
        nombreCompleto: jugadorTarget.nombre,
        dni: valid.dniLimpio,
      });

      if (authRes.hasSession) {
        const vinculado = await supabaseRepository.vincularMiFichaPadronRpc({
          jugadorId: datos.jugadorId,
          dni: valid.dniLimpio,
          telefono: datos.telefono,
          fechaNacimiento: datos.fechaNacimiento,
          contactoEmergencia: datos.contactoEmergencia,
          observaciones: datos.observaciones,
        });

        setJugadores((prev) =>
          prev.map((j) => (j.id === vinculado.id ? vinculado : j))
        );
        setModalRegistroJugadorAbierto(false);
        setUsuarioAutenticado(true);
        setSessionEmail(datos.email.trim());
        setNombreUsuario(vinculado.nombre);

        if (codigoTrim) {
          try {
            const sessionUpd = await supabaseRepository.canjearCodigoAccesoRpc(
              codigoTrim,
              vinculado.nombre
            );
            if (sessionUpd) {
              setRolAcceso(sessionUpd.rolAcceso);
              setAdminEmail(sessionUpd.rolAcceso === 'super_admin' ? sessionUpd.email : null);
              if (sessionUpd.rolAcceso === 'super_admin' || sessionUpd.rolAcceso === 'cantinero') {
                await cargarDatosAdmin(sessionUpd.rolAcceso === 'super_admin');
              }
              mostrarToast(
                sessionUpd.rolAcceso === 'super_admin'
                  ? `¡Bienvenido/a ${vinculado.nombre}! Acceso de Comisión Directiva activado.`
                  : `¡Bienvenido/a ${vinculado.nombre}! Acceso de Cantina y Turnos activado.`
              );
              return;
            }
          } catch {
            setRolAcceso('jugador');
            setAdminEmail(null);
            mostrarToast(
              `¡Ficha vinculada, ${vinculado.nombre}! El código de acceso no coincidió, podés reintentarlo en "Mi Perfil".`
            );
            return;
          }
        }

        setRolAcceso('jugador');
        setAdminEmail(null);
        mostrarToast(`¡Ficha vinculada con éxito! Bienvenido/a, ${vinculado.nombre}.`);
      } else {
        storageService.savePendingPadronClaim({
          email: datos.email,
          jugadorId: datos.jugadorId,
          dni: valid.dniLimpio,
          telefono: datos.telefono,
          fechaNacimiento: datos.fechaNacimiento,
          contactoEmergencia: datos.contactoEmergencia,
          observaciones: datos.observaciones,
        });
        if (codigoTrim) {
          storageService.savePendingAccessCode(datos.email, codigoTrim);
        }
        setModalRegistroJugadorAbierto(false);
        setConfirmacionRegistroModal({
          estado: 'pendiente',
          nombre: jugadorTarget.nombre,
          email: datos.email.trim(),
          tieneCodigoPendiente: Boolean(codigoTrim),
        });
      }
      return;
    }

    // Modo local / offline
    let rolAsignado: RolAcceso = 'jugador';
    let etiquetaRol = '';
    if (codigoTrim) {
      const codeRes = resolverCodigoAcceso(codigoTrim, accessCodes);
      if (!codeRes.valido) {
        throw new Error(codeRes.error || 'El código de acceso institucional no es válido.');
      }
      rolAsignado = codeRes.rol;
      etiquetaRol = codeRes.etiquetaRol || '';
    }

    const actualizado: Jugador = {
      ...jugadorTarget,
      email: datos.email.trim(),
      dni: valid.dniLimpio,
      telefono: datos.telefono?.trim() || jugadorTarget.telefono,
      fechaNacimiento: datos.fechaNacimiento?.trim() || jugadorTarget.fechaNacimiento,
      contactoEmergencia: datos.contactoEmergencia?.trim() || jugadorTarget.contactoEmergencia,
      observaciones: datos.observaciones?.trim()
        ? jugadorTarget.observaciones
          ? `${jugadorTarget.observaciones} · ${datos.observaciones.trim()}`
          : datos.observaciones.trim()
        : jugadorTarget.observaciones,
      activo: true,
    };

    setJugadores((prev) =>
      prev.map((j) => (j.id === actualizado.id ? actualizado : j))
    );
    storageService.saveLocalAccount({
      email: datos.email,
      password: datos.password,
      nombre: actualizado.nombre,
      jugadorId: actualizado.id,
      rol: rolAsignado,
    });
    storageService.saveLocalSession({
      esAdmin: rolAsignado === 'super_admin',
      rol: rolAsignado,
      email: datos.email,
      nombre: actualizado.nombre,
      jugadorId: actualizado.id,
    });
    setUsuarioAutenticado(true);
    setRolAcceso(rolAsignado);
    setAdminEmail(rolAsignado === 'super_admin' ? datos.email.trim() : null);
    setSessionEmail(datos.email.trim());
    setNombreUsuario(actualizado.nombre);
    setModalRegistroJugadorAbierto(false);
    mostrarToast(
      etiquetaRol
        ? `¡Ficha vinculada! Bienvenido/a ${actualizado.nombre} (${etiquetaRol}).`
        : `¡Ficha vinculada con éxito! Bienvenido/a, ${actualizado.nombre}.`
    );
  };

  // --------------------------------------------------------------------------
  // TURNOS: RESERVAR, LIBERAR, MANTENIMIENTO, COBRAR, EDITAR, RESULTADO
  // --------------------------------------------------------------------------
  const handleConfirmarReserva = async (
    nuevoTurno: Turno,
    pagadoAhora: boolean,
    metodoPago?: MetodoPago
  ) => {
    if (!permisos.esStaff) {
      const bloqueoDia = evaluarBloqueoDia(nuevoTurno.fecha, diasBloqueados);
      if (bloqueoDia.bloqueado) {
        mostrarToast(bloqueoDia.motivo || 'Los turnos de este día están bloqueados por evento.');
        return;
      }
      const ventana = evaluarVentanaReserva({
        fechaSeleccionada: nuevoTurno.fecha,
        soloTurnosEnElDia: clubConfig.soloTurnosEnElDia,
        horaAperturaTurnos: clubConfig.horaAperturaTurnos,
        diasBloqueados,
        esStaff: false,
      });
      if (!ventana.habilitado) {
        mostrarToast(ventana.motivo || 'Los turnos se habilitan en el día desde las 08:00 hs.');
        return;
      }
    }

    const turnoConAudit: Turno = {
      ...nuevoTurno,
      registradoPor: permisos.esStaff ? operadorNombre : nuevoTurno.organizadorNombre,
    };

    if (supabaseConectado) {
      try {
        const guardado = await supabaseRepository.reservarTurnoRpc(
          turnoConAudit,
          permisos.esStaff ? pagadoAhora : false,
          permisos.esStaff ? metodoPago : undefined
        );
        setTurnos((prev) => ({
          ...prev,
          [guardado.id]: guardado,
        }));
        if (guardado.pagado && permisos.esSuperAdmin) {
          void cargarDatosAdmin(true);
        }
        setModalReservaHorarioId(null);
        mostrarToast(`Turno reservado y sincronizado para el ${guardado.fecha}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo completar la reserva.';
        mostrarToast(`Error: ${msg}`);
        void cargarDatosPublicos();
      }
      return;
    }

    setTurnos((prev) => ({
      ...prev,
      [turnoConAudit.id]: turnoConAudit,
    }));

    if (permisos.esStaff && pagadoAhora && turnoConAudit.costoTotal && metodoPago) {
      const ahora = new Date();
      const nuevoMov: MovimientoCaja = {
        id: `mov-${Date.now()}`,
        fecha: turnoConAudit.fecha,
        hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        tipo: 'ingreso',
        categoria: 'cancha',
        descripcion: `Cobro Cancha Turno ${turnoConAudit.horarioId} hs (${turnoConAudit.fecha} · ${turnoConAudit.organizadorNombre})`,
        monto: turnoConAudit.costoTotal,
        metodoPago,
        turnoId: turnoConAudit.id,
        registradoPor: operadorNombre,
      };
      setMovimientosCaja((prev) => [nuevoMov, ...prev]);
    }

    setModalReservaHorarioId(null);
    mostrarToast(`Turno reservado para el ${turnoConAudit.fecha}`);
  };

  const handleLiberarTurno = async (turnoIdOrHorarioId: string) => {
    const claveDirecta = turnos[turnoIdOrHorarioId]
      ? turnoIdOrHorarioId
      : generarClaveTurno(fechaSeleccionada, turnoIdOrHorarioId);
    const existente = turnos[claveDirecta];
    const horarioId =
      existente?.horarioId ||
      (claveDirecta.includes('__') ? claveDirecta.split('__')[1] : claveDirecta);
    const fecha = existente?.fecha || fechaSeleccionada;

    if (supabaseConectado) {
      if (!permisos.esStaff) {
        mostrarToast('Solo la administración o cantina puede liberar o cancelar turnos confirmados.');
        return;
      }
      try {
        const libre = await supabaseRepository.liberarTurno(claveDirecta, horarioId, fecha);
        setTurnos((prev) => ({
          ...prev,
          [claveDirecta]: libre,
        }));
        mostrarToast('Turno liberado en Supabase y disponible nuevamente');
      } catch (err) {
        mostrarToast(`Error al liberar turno: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    setTurnos((prev) => ({
      ...prev,
      [claveDirecta]: {
        id: claveDirecta,
        horarioId,
        fecha,
        estado: 'libre',
      },
    }));
    mostrarToast('Turno liberado y disponible nuevamente');
  };

  const handleBloquearMantenimiento = async (horarioId: string) => {
    if (!permisos.esStaff) return;
    const clave = generarClaveTurno(fechaSeleccionada, horarioId);

    if (supabaseConectado) {
      try {
        const bloqueado = await supabaseRepository.bloquearMantenimiento(fechaSeleccionada, horarioId);
        setTurnos((prev) => ({
          ...prev,
          [clave]: bloqueado,
        }));
        mostrarToast(`Turno ${horarioId} hs bloqueado por mantenimiento (${fechaSeleccionada})`);
      } catch (err) {
        mostrarToast(`Error al bloquear turno: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    setTurnos((prev) => ({
      ...prev,
      [clave]: {
        id: clave,
        horarioId,
        fecha: fechaSeleccionada,
        estado: 'mantenimiento',
        notas: 'Cancha cerrada temporalmente por mantenimiento',
      },
    }));
    mostrarToast(`Turno ${horarioId} hs bloqueado por mantenimiento (${fechaSeleccionada})`);
  };

  const handleActualizarTurno = async (
    turnoId: string,
    p1: ParejaTurno,
    p2: ParejaTurno,
    organizadorNombre: string,
    notas: string
  ) => {
    if (!permisos.esStaff) return;
    if (supabaseConectado) {
      try {
        const actualizado = await supabaseRepository.actualizarTurno(
          turnoId,
          p1,
          p2,
          organizadorNombre,
          notas
        );
        setTurnos((prev) => ({
          ...prev,
          [turnoId]: actualizado,
        }));
        mostrarToast('Integrantes del turno actualizados en la base de datos');
      } catch (err) {
        mostrarToast(`Error al actualizar turno: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    setTurnos((prev) => {
      const existente = prev[turnoId];
      if (!existente) return prev;
      return {
        ...prev,
        [turnoId]: {
          ...existente,
          p1,
          p2,
          organizadorNombre,
          notas: notas.trim() || undefined,
          registradoPor: operadorNombre,
        },
      };
    });
    mostrarToast('Integrantes del turno actualizados');
  };

  const handleCobrarTurno = async (turnoId: string, metodo: MetodoPago) => {
    if (!permisos.esStaff) return;
    const t = turnos[turnoId];
    if (!t) return;

    const costo = t.costoTotal || 12000;
    const ahora = new Date();
    const nuevoMov: MovimientoCaja = {
      id: `mov-${Date.now()}`,
      fecha: t.fecha || ahora.toISOString().split('T')[0],
      hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      tipo: 'ingreso',
      categoria: 'cancha',
      descripcion: `Cobro Cancha Turno ${t.horarioId} hs (${t.fecha} · ${t.organizadorNombre || 'Club'})`,
      monto: costo,
      metodoPago: metodo,
      turnoId,
      registradoPor: operadorNombre,
    };

    if (supabaseConectado) {
      try {
        const { turno: turnoActualizado, movimiento } = await supabaseRepository.cobrarTurno(
          t,
          metodo,
          costo,
          nuevoMov
        );
        setTurnos((prev) => ({
          ...prev,
          [turnoId]: turnoActualizado,
        }));
        if (movimiento && permisos.esSuperAdmin) {
          setMovimientosCaja((prev) => [movimiento, ...prev]);
        } else if (permisos.esSuperAdmin) {
          void cargarDatosAdmin(true);
        }
        mostrarToast(`Turno cobrado: ${formatearMoneda(costo)} (${metodo === 'transferencia' ? 'Alias MP' : 'Efectivo'})`);
      } catch (err) {
        mostrarToast(`Error al cobrar turno: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    setTurnos((prev) => ({
      ...prev,
      [turnoId]: {
        ...prev[turnoId],
        pagado: true,
        metodoPago: metodo,
        registradoPor: operadorNombre,
      },
    }));
    setMovimientosCaja((prev) => [nuevoMov, ...prev]);
    mostrarToast(`Turno cobrado: ${formatearMoneda(costo)} (${metodo === 'transferencia' ? 'Alias MP' : 'Efectivo'})`);
  };

  const handleGuardarResultado = async (turnoId: string, resultado: ResultadoPartido) => {
    if (!permisos.esStaff) return;
    if (supabaseConectado) {
      try {
        const actualizado = await supabaseRepository.guardarResultadoTurno(turnoId, resultado);
        setTurnos((prev) => ({
          ...prev,
          [turnoId]: actualizado,
        }));
        mostrarToast('Resultado del partido guardado');
      } catch (err) {
        mostrarToast(`Error al guardar resultado: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    setTurnos((prev) => ({
      ...prev,
      [turnoId]: {
        ...prev[turnoId],
        resultado,
      },
    }));
    mostrarToast('Resultado del partido guardado');
  };

  const handleIrACantinaConTurno = (_turnoId: string, clienteNombre: string) => {
    if (!permisos.esStaff) return;
    setClienteCantinaNombre(clienteNombre);
    setVistaActiva('cantina');
  };

  const handleReiniciarDia = async () => {
    if (!permisos.esSuperAdmin) return;
    if (supabaseConectado) {
      try {
        await supabaseRepository.reiniciarDiaTurnos(fechaSeleccionada);
        await cargarDatosPublicos();
        mostrarToast(`Todos los turnos del ${fechaSeleccionada} fueron reiniciados`);
      } catch (err) {
        mostrarToast(`Error al reiniciar turnos: ${err instanceof Error ? err.message : String(err)}`);
      }
      return;
    }

    setTurnos((prev) => {
      const siguiente: Record<string, Turno> = {};
      Object.entries(prev).forEach(([k, t]) => {
        if (t.fecha !== fechaSeleccionada) {
          siguiente[k] = t;
        }
      });
      horarios.forEach((h) => {
        const clave = generarClaveTurno(fechaSeleccionada, h.id);
        siguiente[clave] = {
          id: clave,
          horarioId: h.id,
          fecha: fechaSeleccionada,
          estado: 'libre',
        };
      });
      return siguiente;
    });
    mostrarToast(`Todos los turnos del ${fechaSeleccionada} fueron reiniciados`);
  };

  // --------------------------------------------------------------------------
  // TORNEOS & RESPALDOS
  // --------------------------------------------------------------------------
  const handleGuardarTorneo = async (nuevoTorneo: TorneoData | null) => {
    if (!permisos.esSuperAdmin) return;
    setTorneoGuardado(nuevoTorneo);
    if (!supabaseConectado) {
      storageService.saveTorneo(nuevoTorneo);
      return;
    }
    try {
      await supabaseRepository.saveTorneo(nuevoTorneo);
    } catch (err) {
      mostrarToast(`Error al guardar torneo: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCargarCopiaSeguridad = async (datos: any) => {
    if (!permisos.esSuperAdmin) return;
    const turnosNorm = datos.turnos ? normalizarTurnosLegacy(datos.turnos, hoyStr) : undefined;
    if (turnosNorm) setTurnos(turnosNorm);
    if (datos.jugadores) setJugadores(datos.jugadores);
    if (datos.horarios) setHorarios(datos.horarios);
    if (datos.productos) setProductos(datos.productos);
    if (datos.consumos) setConsumos(datos.consumos);
    if (datos.publicaciones) setPublicaciones(datos.publicaciones);
    if (datos.comandas) setComandas(datos.comandas);
    if (datos.movimientosCaja) setMovimientosCaja(datos.movimientosCaja);
    if (datos.clubConfig) setClubConfig(datos.clubConfig);
    if (datos.modoMesasActivo !== undefined) setModoMesasActivo(Boolean(datos.modoMesasActivo));
    if (datos.adminPin) setAdminPin(datos.adminPin);
    if (datos.torneo !== undefined) setTorneoGuardado(datos.torneo);

    if (supabaseConectado) {
      try {
        await supabaseRepository.restoreBackup({
          clubConfig: datos.clubConfig
            ? { ...datos.clubConfig, modoMesasActivo: Boolean(datos.modoMesasActivo ?? datos.clubConfig.modoMesasActivo) }
            : undefined,
          horarios: datos.horarios,
          jugadores: datos.jugadores,
          productos: datos.productos,
          publicaciones: datos.publicaciones,
          turnos: turnosNorm,
          movimientosCaja: datos.movimientosCaja,
          torneo: datos.torneo,
        });
        await Promise.all([cargarDatosPublicos(), cargarDatosAdmin(true)]);
        mostrarToast('Copia de seguridad restaurada y sincronizada en Supabase');
      } catch (err) {
        mostrarToast(`Error al restaurar en Supabase: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (datos.torneo !== undefined) {
      storageService.saveTorneo(datos.torneo);
    }
  };

  // --------------------------------------------------------------------------
  // CANTINA INDIVIDUAL (RPCs ATÓMICAS EN SUPABASE, INCLUYE INVITADOS)
  // --------------------------------------------------------------------------
  const handleRegistrarConsumo = async (params: {
    socioNombre: string;
    socioId?: number;
    detalle: string;
    monto: number;
    pagado: boolean;
    metodoPago?: MetodoPago;
    mesa?: string;
    productosUsados: ProductoUsadoConsumo[];
    esInvitado?: boolean;
    observacionInvitado?: string;
  }): Promise<boolean> => {
    try {
      const creado = await supabaseRepository.registrarConsumoRpc(params);
      setConsumos((prev) => [creado, ...prev]);
      await Promise.all([cargarDatosAdmin(permisos.esSuperAdmin), cargarDatosPublicos()]);
      return true;
    } catch (err) {
      mostrarToast(`Error en cantina: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };

  const handleCobrarConsumo = async (consumo: ConsumoIndividual, metodo: MetodoPago) => {
    try {
      const actualizado = await supabaseRepository.cobrarConsumoRpc(consumo.id, metodo);
      setConsumos((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
      await Promise.all([cargarDatosAdmin(permisos.esSuperAdmin), cargarDatosPublicos()]);
    } catch (err) {
      mostrarToast(`Error al cobrar consumo: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleEliminarConsumo = async (consumo: ConsumoIndividual) => {
    try {
      await supabaseRepository.eliminarConsumo(consumo);
      setConsumos((prev) => prev.filter((c) => c.id !== consumo.id));
      await cargarDatosPublicos();
    } catch (err) {
      mostrarToast(`Error al eliminar consumo: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // --------------------------------------------------------------------------
  // HANDLERS ADMIN PANEL (HORARIOS, PUBLICACIONES, SOCIOS, PRODUCTOS, CAJA, CLUB)
  // --------------------------------------------------------------------------
  const handleGuardarHorario = async (h: HorarioConfig, esNuevo: boolean) => {
    try {
      const guardado = await supabaseRepository.upsertHorario(
        h,
        esNuevo ? horarios.length + 1 : undefined
      );
      setHorarios((prev) =>
        esNuevo ? [...prev, guardado] : prev.map((item) => (item.id === guardado.id ? guardado : item))
      );
    } catch (err) {
      mostrarToast(`Error al guardar horario: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleToggleHorarioActivo = async (h: HorarioConfig) => {
    try {
      const actualizado = await supabaseRepository.upsertHorario({ ...h, activo: !h.activo });
      setHorarios((prev) => prev.map((item) => (item.id === actualizado.id ? actualizado : item)));
    } catch (err) {
      mostrarToast(`Error al actualizar horario: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleEliminarHorario = async (id: string) => {
    try {
      await supabaseRepository.deleteHorario(id);
      setHorarios((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('foreign key') || msg.includes('23503')) {
        mostrarToast('No se puede eliminar porque tiene turnos históricos. Ocultalo con el botón de ojo.');
      } else {
        mostrarToast(`Error al eliminar horario: ${msg}`);
      }
      throw err;
    }
  };

  const handleGuardarPublicacion = async (p: PublicacionClub) => {
    try {
      const guardada = await supabaseRepository.upsertPublicacion(p);
      setPublicaciones((prev) => [guardada, ...prev.filter((item) => item.id !== guardada.id)]);
    } catch (err) {
      mostrarToast(`Error al guardar publicación: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleTogglePublicacionActivo = async (p: PublicacionClub) => {
    try {
      const actualizada = await supabaseRepository.upsertPublicacion({ ...p, activo: !p.activo });
      setPublicaciones((prev) => prev.map((item) => (item.id === actualizada.id ? actualizada : item)));
    } catch (err) {
      mostrarToast(`Error al actualizar publicación: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleEliminarPublicacion = async (id: string) => {
    try {
      await supabaseRepository.deletePublicacion(id);
      setPublicaciones((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      mostrarToast(`Error al eliminar publicación: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleGuardarJugador = async (
    j: Omit<Jugador, 'id'> & { id?: number },
    esNuevo: boolean
  ) => {
    try {
      if (esNuevo) {
        const creado = await supabaseRepository.insertJugador(j);
        setJugadores((prev) => [...prev, creado]);
      } else if (j.id !== undefined) {
        const actualizado = await supabaseRepository.updateJugador(j as Jugador);
        setJugadores((prev) => prev.map((item) => (item.id === actualizado.id ? actualizado : item)));
      }
    } catch (err) {
      mostrarToast(`Error al guardar jugador: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleToggleSocioActivo = async (j: Jugador) => {
    try {
      const actualizado = await supabaseRepository.updateJugador({ ...j, activo: !j.activo });
      setJugadores((prev) => prev.map((item) => (item.id === actualizado.id ? actualizado : item)));
    } catch (err) {
      mostrarToast(`Error al actualizar socio: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleToggleBloqueoTurnosSocio = async (
    j: Jugador,
    bloqueado: boolean,
    motivo?: string
  ) => {
    try {
      const actualizado = await supabaseRepository.updateJugador({
        ...j,
        bloqueadoTurnos: bloqueado,
        motivoBloqueo: bloqueado ? motivo : undefined,
      });
      setJugadores((prev) => prev.map((item) => (item.id === actualizado.id ? actualizado : item)));
      mostrarToast(
        bloqueado
          ? `${j.nombre} bloqueado para sacar turnos por Comisión Directiva`
          : `${j.nombre} habilitado nuevamente para sacar turnos`
      );
    } catch (err) {
      mostrarToast(`Error al actualizar bloqueo: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleRegistrarPagoMensualidadSocio = async (
    j: Jugador,
    mesPago: string,
    monto: number,
    metodo: MetodoPago,
    desbloquear: boolean
  ) => {
    try {
      const actualizado = await supabaseRepository.updateJugador({
        ...j,
        ultimoMesPago: mesPago,
        bloqueadoTurnos: desbloquear ? false : j.bloqueadoTurnos,
        motivoBloqueo: desbloquear ? undefined : j.motivoBloqueo,
      });
      setJugadores((prev) => prev.map((item) => (item.id === actualizado.id ? actualizado : item)));

      if (monto > 0) {
        const ahora = new Date();
        const mov: MovimientoCaja = {
          id: `mov-cuota-${Date.now()}`,
          fecha: ahora.toISOString().split('T')[0],
          hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
          tipo: 'ingreso',
          categoria: 'cuota_socio',
          descripcion: `Mensualidad / Seguro ${formatearPeriodoMes(mesPago)} (${j.nombre})`,
          monto,
          metodoPago: metodo,
        };
        const creadoMov = await supabaseRepository.insertMovimientoCaja(mov);
        setMovimientosCaja((prev) => [creadoMov, ...prev]);
      }
      mostrarToast(
        `Mensualidad / seguro (${formatearPeriodoMes(mesPago)}) informada como PAGA para ${j.nombre}`
      );
    } catch (err) {
      mostrarToast(`Error al registrar mensualidad: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleMarcarMensualidadNoPagaSocio = async (j: Jugador, mesActual: string) => {
    try {
      const nuevoUltimoMes = resolverUltimoMesAlMarcarNoPago(j.ultimoMesPago, mesActual);
      const actualizado = await supabaseRepository.updateJugador({
        ...j,
        ultimoMesPago: nuevoUltimoMes,
      });
      setJugadores((prev) => prev.map((item) => (item.id === actualizado.id ? actualizado : item)));
      mostrarToast(
        `Mensualidad / seguro (${formatearPeriodoMes(mesActual)}) informada como NO PAGA para ${j.nombre}`
      );
    } catch (err) {
      mostrarToast(`Error al actualizar mensualidad: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleEliminarSocio = async (j: Jugador) => {
    try {
      await supabaseRepository.deleteJugador(j.id);
      setJugadores((prev) => prev.filter((item) => item.id !== j.id));
    } catch (err) {
      mostrarToast(`Error al eliminar socio: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCobrarSaldoSocio = async (j: Jugador, monto: number, metodo: MetodoPago) => {
    const ahora = new Date();
    const mov: MovimientoCaja = {
      id: `mov-${Date.now()}`,
      fecha: ahora.toISOString().split('T')[0],
      hora: ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      tipo: 'ingreso',
      categoria: 'cuota_socio',
      descripcion: `Cobro saldo cta. cte. (${j.nombre})`,
      monto,
      metodoPago: metodo,
    };
    try {
      const res = await supabaseRepository.cobrarCuentaCorrienteJugador(j, monto, mov);
      setJugadores((prev) => prev.map((item) => (item.id === res.jugador.id ? res.jugador : item)));
      setMovimientosCaja((prev) => [res.movimiento, ...prev]);
    } catch (err) {
      mostrarToast(`Error al cobrar saldo: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleGuardarProducto = async (p: ProductoCantina) => {
    try {
      const guardado = await supabaseRepository.upsertProducto(p);
      setProductos((prev) => {
        const existe = prev.some((item) => item.id === guardado.id);
        return existe
          ? prev.map((item) => (item.id === guardado.id ? guardado : item))
          : [...prev, guardado];
      });
    } catch (err) {
      mostrarToast(`Error al guardar producto: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleAjustarStockProducto = async (p: ProductoCantina, delta: number) => {
    const actualizado: ProductoCantina = { ...p, stock: Math.max(0, p.stock + delta) };
    try {
      const guardado = await supabaseRepository.upsertProducto(actualizado);
      setProductos((prev) => prev.map((item) => (item.id === guardado.id ? guardado : item)));
    } catch (err) {
      mostrarToast(`Error al ajustar stock: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleEliminarProducto = async (p: ProductoCantina) => {
    try {
      await supabaseRepository.deleteProducto(p.id);
      setProductos((prev) => prev.filter((item) => item.id !== p.id));
    } catch (err) {
      mostrarToast(`Error al eliminar producto: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleGuardarClubConfig = async (cfg: ClubConfig) => {
    try {
      const guardado = await supabaseRepository.upsertClubConfig(cfg);
      setClubConfig(guardado);
      setModoMesasActivo(guardado.modoMesasActivo);
    } catch (err) {
      mostrarToast(`Error al guardar configuración: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleAgregarMovimientoCaja = async (mov: MovimientoCaja) => {
    try {
      const creado = await supabaseRepository.insertMovimientoCaja(mov);
      setMovimientosCaja((prev) => [creado, ...prev]);
    } catch (err) {
      mostrarToast(`Error al registrar movimiento: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };

  const handleEliminarMovimientoCaja = async (mov: MovimientoCaja) => {
    try {
      await supabaseRepository.deleteMovimientoCaja(mov.id);
      setMovimientosCaja((prev) => prev.filter((m) => m.id !== mov.id));
    } catch (err) {
      mostrarToast(`Error al eliminar movimiento: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleGuardarDiaBloqueado = async (d: DiaBloqueado) => {
    if (!permisos.esSuperAdmin) return;
    if (supabaseConectado) {
      try {
        const guardado = await supabaseRepository.upsertDiaBloqueado(d);
        setDiasBloqueados((prev) => ({ ...prev, [guardado.fecha]: guardado }));
      } catch (err) {
        mostrarToast(`Error al actualizar día bloqueado: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    } else {
      setDiasBloqueados((prev) => ({ ...prev, [d.fecha]: d }));
    }
    mostrarToast(
      d.bloqueado
        ? `Todos los turnos del ${d.fecha} quedaron BLOQUEADOS`
        : `Turnos del ${d.fecha} rehabilitados normalmente`
    );
  };

  const handleGuardarAccessCode = async (rol: 'admin' | 'cantinero', codigo: string) => {
    if (!permisos.esSuperAdmin) return;
    const clean = codigo.trim().toUpperCase();
    if (!clean) return;
    if (supabaseConectado) {
      try {
        await supabaseRepository.updateAccessCode(rol, clean);
      } catch (err) {
        mostrarToast(`Error al guardar código: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    }
    setAccessCodes((prev) => ({
      ...prev,
      ...(rol === 'admin' ? { codigoComision: clean } : { codigoCantina: clean }),
    }));
    mostrarToast(
      rol === 'admin'
        ? `Código de Comisión Directiva actualizado: ${clean}`
        : `Código de Cantina y Turnos actualizado: ${clean}`
    );
  };

  const handleCargarHistorialTurnos = async () => {
    if (!supabaseConectado) return;
    try {
      const historico = await supabaseRepository.fetchTurnosHistorial(500);
      setTurnos((prev) => ({ ...historico, ...prev }));
      mostrarToast(`Historial sincronizado (${Object.keys(historico).length} turnos jugados)`);
    } catch (err) {
      mostrarToast(`Error al cargar historial: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleImportarJugadores = async (lista: Omit<Jugador, 'id'>[]) => {
    if (!permisos.esSuperAdmin || lista.length === 0) return;
    if (supabaseConectado) {
      try {
        const creados = await supabaseRepository.insertJugadoresBatch(lista);
        setJugadores((prev) => [...prev, ...creados]);
        mostrarToast(`Se importaron ${creados.length} pelotaris al padrón en Supabase.`);
      } catch (err) {
        mostrarToast(`Error al importar planilla: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
      return;
    }
    const baseId = Date.now();
    const locales: Jugador[] = lista.map((j, idx) => ({ ...j, id: baseId + idx }));
    setJugadores((prev) => [...prev, ...locales]);
    mostrarToast(`Se importaron ${locales.length} pelotaris al padrón.`);
  };

  const horarioSeleccionadoParaReserva = horarios.find((h) => h.id === modalReservaHorarioId);
  const turnoSeleccionadoParaDetalle = modalDetalleTurnoId ? turnos[modalDetalleTurnoId] : null;
  const horarioDelTurnoDetalle = turnoSeleccionadoParaDetalle
    ? horarios.find((h) => h.id === turnoSeleccionadoParaDetalle.horarioId) || horarios[0]
    : null;

  const estadoJugadorLogueado = jugadorLogueado
    ? evaluarEstadoFinancieroJugador(jugadorLogueado, { clubConfig })
    : null;
  const tieneAlertaPerfil = Boolean(estadoJugadorLogueado?.requiereAtencion);

  const abrirPerfilJugador = () => {
    if (supabaseConectado) {
      void cargarMisConsumos();
    }
    setModalPerfilAbierto(true);
  };

  const consumosJugadorActual = React.useMemo(() => {
    if (!jugadorLogueado) return [];
    if (supabaseConectado) return misConsumosSupabase;
    const nombreNorm = jugadorLogueado.nombre.trim().toLowerCase();
    return consumos.filter(
      (c) =>
        c.socioId === jugadorLogueado.id ||
        c.socioNombre.trim().toLowerCase() === nombreNorm
    );
  }, [jugadorLogueado, supabaseConectado, misConsumosSupabase, consumos]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white transition-colors duration-150 w-full max-w-full overflow-x-clip">
      <Header
        vistaActiva={vistaActiva}
        setVistaActiva={(v) => {
          if (v === 'cantina' && !permisos.esStaff) {
            abrirLogin();
            return;
          }
          if ((v === 'admin' || v === 'torneo') && !permisos.esSuperAdmin) {
            if (!permisos.esStaff) {
              abrirLogin();
            } else {
              mostrarToast('Acceso exclusivo para la Comisión Directiva.');
            }
            return;
          }
          if (v === 'torneo') {
            setMostrarModalTorneo(true);
          } else {
            if (v !== 'cantina') setClienteCantinaNombre(null);
            setVistaActiva(v);
          }
        }}
        rolAcceso={rolAcceso}
        usuarioAutenticado={usuarioAutenticado}
        onAbrirIngresar={abrirLogin}
        onAbrirPerfil={jugadorLogueado ? abrirPerfilJugador : undefined}
        tieneAlertaPerfil={tieneAlertaPerfil}
        onCerrarSesion={handleCerrarSesion}
        onSolicitarRegistroJugador={() => setModalRegistroJugadorAbierto(true)}
        nombreUsuario={nombreUsuario}
        tema={tema}
        onToggleTema={toggleTema}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 min-w-0 max-w-full">
        {vistaActiva === 'turnos' && (
          <TurneroView
            turnos={turnos}
            horarios={horarios}
            jugadores={jugadores}
            publicaciones={publicaciones}
            clubConfig={clubConfig}
            diasBloqueados={diasBloqueados}
            fechaSeleccionada={fechaSeleccionada}
            setFechaSeleccionada={setFechaSeleccionada}
            onAbrirReserva={(horarioId) => setModalReservaHorarioId(horarioId)}
            onAbrirDetalle={(turnoId) => setModalDetalleTurnoId(turnoId)}
            onIrACantinaConTurno={handleIrACantinaConTurno}
            esAdmin={permisos.esStaff}
            rolAcceso={rolAcceso}
            usuarioAutenticado={usuarioAutenticado}
            jugadorLogueado={jugadorLogueado}
            onAbrirPerfil={jugadorLogueado ? abrirPerfilJugador : undefined}
            onLiberarTurno={handleLiberarTurno}
            onBloquearMantenimiento={handleBloquearMantenimiento}
            onIrAAdminPublicaciones={
              permisos.esSuperAdmin
                ? () => {
                    setSeccionAdmin('publicaciones');
                    setVistaActiva('admin');
                  }
                : undefined
            }
            onIrAAdminEventos={
              permisos.esSuperAdmin
                ? () => {
                    setSeccionAdmin('eventos');
                    setVistaActiva('admin');
                  }
                : undefined
            }
            onAbrirIngresar={abrirLogin}
            onAbrirRegistroJugador={() => setModalRegistroJugadorAbierto(true)}
            onSolicitarConfirmacion={solicitarConfirmacion}
          />
        )}

        {permisos.esStaff && vistaActiva === 'cantina' && (
          <CantinaIndividualView
            consumos={consumos}
            setConsumos={setConsumos}
            jugadores={jugadores}
            setJugadores={setJugadores}
            productos={productos}
            setProductos={setProductos}
            movimientosCaja={movimientosCaja}
            setMovimientosCaja={setMovimientosCaja}
            modoMesasActivo={modoMesasActivo}
            esAdmin={permisos.esStaff}
            rolAcceso={rolAcceso}
            operadorNombre={operadorNombre}
            clientePreseleccionado={clienteCantinaNombre}
            clubConfig={clubConfig}
            onNotificar={mostrarToast}
            onSolicitarConfirmacion={solicitarConfirmacion}
            onRegistrarConsumo={supabaseConectado ? handleRegistrarConsumo : undefined}
            onCobrarConsumo={supabaseConectado ? handleCobrarConsumo : undefined}
            onEliminarConsumo={supabaseConectado ? handleEliminarConsumo : undefined}
            onRegistrarPagoMensualidadSocio={
              supabaseConectado && permisos.esSuperAdmin ? handleRegistrarPagoMensualidadSocio : undefined
            }
            onMarcarMensualidadNoPagaSocio={
              supabaseConectado && permisos.esSuperAdmin ? handleMarcarMensualidadNoPagaSocio : undefined
            }
          />
        )}

        {permisos.esSuperAdmin && vistaActiva === 'admin' && (
          <AdminPanel
            jugadores={jugadores}
            setJugadores={setJugadores}
            horarios={horarios}
            setHorarios={setHorarios}
            productos={productos}
            setProductos={setProductos}
            turnos={turnos}
            setTurnos={setTurnos}
            consumos={consumos}
            comandas={comandas}
            movimientosCaja={movimientosCaja}
            setMovimientosCaja={setMovimientosCaja}
            publicaciones={publicaciones}
            setPublicaciones={setPublicaciones}
            clubConfig={clubConfig}
            setClubConfig={setClubConfig}
            torneo={torneoGuardado}
            onGuardarTorneo={handleGuardarTorneo}
            fechaSeleccionada={fechaSeleccionada}
            modoMesasActivo={modoMesasActivo}
            setModoMesasActivo={setModoMesasActivo}
            adminPin={adminPin}
            setAdminPin={setAdminPin}
            onReiniciarDia={handleReiniciarDia}
            onCargarCopiaSeguridad={handleCargarCopiaSeguridad}
            onNotificar={mostrarToast}
            onSolicitarConfirmacion={solicitarConfirmacion}
            supabaseActivo={supabaseConectado}
            adminEmail={adminEmail}
            onGuardarHorario={supabaseConectado ? handleGuardarHorario : undefined}
            onToggleHorarioActivo={supabaseConectado ? handleToggleHorarioActivo : undefined}
            onEliminarHorario={supabaseConectado ? handleEliminarHorario : undefined}
            onGuardarPublicacion={supabaseConectado ? handleGuardarPublicacion : undefined}
            onTogglePublicacionActivo={supabaseConectado ? handleTogglePublicacionActivo : undefined}
            onEliminarPublicacion={supabaseConectado ? handleEliminarPublicacion : undefined}
            onGuardarJugador={supabaseConectado ? handleGuardarJugador : undefined}
            onToggleSocioActivo={supabaseConectado ? handleToggleSocioActivo : undefined}
            onToggleBloqueoTurnosSocio={supabaseConectado ? handleToggleBloqueoTurnosSocio : undefined}
            onRegistrarPagoMensualidadSocio={
              supabaseConectado ? handleRegistrarPagoMensualidadSocio : undefined
            }
            onMarcarMensualidadNoPagaSocio={
              supabaseConectado ? handleMarcarMensualidadNoPagaSocio : undefined
            }
            onEliminarSocio={supabaseConectado ? handleEliminarSocio : undefined}
            onCobrarSaldoSocio={supabaseConectado ? handleCobrarSaldoSocio : undefined}
            onGuardarProducto={supabaseConectado ? handleGuardarProducto : undefined}
            onAjustarStockProducto={supabaseConectado ? handleAjustarStockProducto : undefined}
            onEliminarProducto={supabaseConectado ? handleEliminarProducto : undefined}
            onGuardarClubConfig={supabaseConectado ? handleGuardarClubConfig : undefined}
            onAgregarMovimientoCaja={supabaseConectado ? handleAgregarMovimientoCaja : undefined}
            onEliminarMovimientoCaja={supabaseConectado ? handleEliminarMovimientoCaja : undefined}
            diasBloqueados={diasBloqueados}
            onGuardarDiaBloqueado={handleGuardarDiaBloqueado}
            accessCodes={accessCodes}
            onGuardarAccessCode={handleGuardarAccessCode}
            onCargarHistorialTurnos={supabaseConectado ? handleCargarHistorialTurnos : undefined}
            onImportarJugadores={handleImportarJugadores}
            operadorNombre={operadorNombre}
            seccionActiva={seccionAdmin}
            onCambiarSeccion={setSeccionAdmin}
            sheetMobileAbierto={sheetAdminAbierto}
            onSetSheetMobileAbierto={setSheetAdminAbierto}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 px-4 pt-5 pb-20 md:pb-5 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span
              onClick={handleDiscreetAdminTap}
              className="font-extrabold text-slate-800 dark:text-slate-300 uppercase select-none"
            >
              {clubConfig.nombreClub}
            </span>
            <span aria-hidden="true">·</span>
            <span>Trinquete de Pelota Paleta</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Verde y Blanco</span>
          </div>
          <div>
            Río Colorado, Río Negro, Argentina · Alias:{' '}
            <strong className="text-slate-700 dark:text-slate-300">
              {clubConfig.aliasTransferencia}
            </strong>
          </div>
        </div>
      </footer>

      <MobileBottomNav
        rolAcceso={rolAcceso}
        usuarioAutenticado={usuarioAutenticado}
        vistaActiva={vistaActiva}
        socioTabActivo={socioTabActivo}
        sheetAdminAbierto={sheetAdminAbierto}
        tieneAlertaPerfil={tieneAlertaPerfil}
        onSeleccionarVistaAdmin={(v) => {
          setSheetAdminAbierto(false);
          if (v === 'cantina' && !permisos.esStaff) {
            abrirLogin();
            return;
          }
          if ((v === 'admin' || v === 'torneo') && !permisos.esSuperAdmin) {
            if (!permisos.esStaff) {
              abrirLogin();
            } else {
              mostrarToast('Acceso exclusivo para la Comisión Directiva.');
            }
            return;
          }
          if (v === 'torneo') {
            setMostrarModalTorneo(true);
          } else {
            if (v !== 'cantina') setClienteCantinaNombre(null);
            setVistaActiva(v);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onToggleSheetAdmin={() => {
          if (permisos.esSuperAdmin) {
            setSheetAdminAbierto((prev) => !prev);
          }
        }}
        onIrATurnosSocio={() => {
          setVistaActiva('turnos');
          setSocioTabActivo('turnos');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onIrAJugadoresSocio={() => {
          setVistaActiva('turnos');
          setSocioTabActivo('jugadores');
          requestAnimationFrame(() => {
            const el = document.getElementById('disponibilidad-jugadores');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }}
        onAbrirIngresar={abrirLogin}
        onAbrirRegistroJugador={() => setModalRegistroJugadorAbierto(true)}
        onAbrirPerfil={jugadorLogueado ? abrirPerfilJugador : handleCerrarSesion}
      />

      {/* Modal Mi Perfil de Jugador (Mensualidad, Cantina, Bloqueo y Código de Acceso) */}
      {modalPerfilAbierto && jugadorLogueado && (
        <JugadorPerfilModal
          jugador={jugadorLogueado}
          clubConfig={clubConfig}
          consumosJugador={consumosJugadorActual}
          cargandoConsumos={cargandoMisConsumos}
          rolAcceso={rolAcceso}
          onCanjearCodigo={handleCanjearCodigoAcceso}
          onCerrarSesion={handleCerrarSesion}
          onCerrar={() => setModalPerfilAbierto(false)}
        />
      )}

      {/* Modal Ingresar Unificado (Jugadores + Comisión Directiva + Cantina) */}
      {modalLoginAbierto && (
        <LoginModal
          clubConfig={clubConfig}
          supabaseConectado={supabaseConectado}
          supabaseConfigurado={supabaseConfigurado}
          onIniciarSesion={handleIniciarSesion}
          onActivarAccesoJugador={handleActivarAccesoJugador}
          onIrARegistro={() => {
            setModoRegistroInicial('nuevo');
            setModalRegistroJugadorAbierto(true);
          }}
          onIrARegistroPadron={() => {
            setModoRegistroInicial('padron');
            setModalRegistroJugadorAbierto(true);
          }}
          onCerrar={() => setModalLoginAbierto(false)}
        />
      )}

      {/* Modal Reserva */}
      {horarioSeleccionadoParaReserva && (
        <ReservaModal
          horario={horarioSeleccionadoParaReserva}
          fechaStr={fechaSeleccionada}
          jugadores={jugadores}
          clubConfig={clubConfig}
          diasBloqueados={diasBloqueados}
          usuarioActual={nombreUsuario}
          jugadorLogueado={jugadorLogueado}
          esAdmin={permisos.esStaff}
          onAbrirRegistroJugador={() => {
            setModoRegistroInicial('nuevo');
            setModalRegistroJugadorAbierto(true);
          }}
          onConfirmarReserva={handleConfirmarReserva}
          onCerrar={() => setModalReservaHorarioId(null)}
        />
      )}

      {/* Modal Auto-Registro Completo de Jugadores */}
      {modalRegistroJugadorAbierto && (
        <RegistroJugadorModal
          clubConfig={clubConfig}
          jugadoresExistentes={jugadores}
          onRegistrar={handleRegistrarJugadorPublico}
          onVincularPadron={handleVincularPadron}
          modoInicial={modoRegistroInicial}
          onIrAIngresar={abrirLogin}
          onCerrar={() => {
            setModalRegistroJugadorAbierto(false);
            setModoRegistroInicial(undefined);
          }}
        />
      )}

      {/* Modal Detalle Turno */}
      {turnoSeleccionadoParaDetalle && horarioDelTurnoDetalle && (
        <DetalleTurnoModal
          turno={turnoSeleccionadoParaDetalle}
          horario={horarioDelTurnoDetalle}
          jugadores={jugadores}
          clubConfig={clubConfig}
          fechaStr={fechaSeleccionada}
          esAdmin={permisos.esStaff}
          onLiberarTurno={handleLiberarTurno}
          onCobrarTurno={handleCobrarTurno}
          onGuardarResultado={handleGuardarResultado}
          onActualizarTurno={handleActualizarTurno}
          onIrACantina={handleIrACantinaConTurno}
          onCerrar={() => setModalDetalleTurnoId(null)}
        />
      )}

      {/* Modal Torneos (Solo accesible para Comisión Directiva) */}
      {permisos.esSuperAdmin && mostrarModalTorneo && (
        <TorneoModal
          jugadores={jugadores}
          torneoGuardado={torneoGuardado}
          onGuardarTorneo={handleGuardarTorneo}
          onNotificar={mostrarToast}
          onCerrar={() => setMostrarModalTorneo(false)}
        />
      )}

      {/* Modal de Confirmación de Email / Registro */}
      {confirmacionRegistroModal && (
        <ConfirmacionRegistroModal
          datos={confirmacionRegistroModal}
          clubConfig={clubConfig}
          onIrAIngresar={abrirLogin}
          onIrAPanelStaff={(v) => {
            if (v === 'admin' && permisos.esSuperAdmin) {
              setVistaActiva('admin');
            } else if (v === 'cantina' && permisos.esStaff) {
              setVistaActiva('cantina');
            }
          }}
          onCerrar={() => setConfirmacionRegistroModal(null)}
        />
      )}

      {/* Confirmación In-App */}
      {confirmState && (
        <ConfirmDialog
          open={confirmState.open}
          titulo={confirmState.titulo}
          mensaje={confirmState.mensaje}
          confirmLabel={confirmState.confirmLabel}
          variant={confirmState.variant}
          onConfirm={() => {
            confirmState.onConfirm();
            setConfirmState(null);
          }}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* Auto-actualización automática de PWA */}
      <PWAUpdater />

      {/* Toast Notification estilo App Móvil Nativa */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 md:bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 border border-slate-700/50 dark:border-slate-300 pointer-events-none max-w-[92vw]"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
