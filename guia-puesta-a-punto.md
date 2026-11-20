# Guía de Puesta a Punto en Producción — CARC Trinquete & Cantina

Este documento está redactado paso a paso para que puedas:
1. **Crear y desplegar la base de datos en Supabase** en menos de 5 minutos.
2. **Entregarle este archivo a Antigravity** (junto con el proyecto descargado) para que conecte automáticamente la aplicación React con Supabase (persistencia en la nube, tiempo real y autenticación segura de administrador).
3. **Publicar la web app (PWA)** en un hosting gratuito y rápido (Vercel, Netlify o Cloudflare Pages).

---

## Parte 1 — Qué ya viene 100% resuelto en este proyecto

La aplicación ya cuenta con toda la lógica de negocio, validaciones y arquitectura desacoplada lista para enchufar a la base de datos sin reescribir pantallas:

- **Turnero Multidía (`fecha__horarioId`)**: Reserva para Hoy, Mañana y próximos días configurables (`diasAnticipacionReserva`). Incluye edición de parejas, bloqueo por mantenimiento, cobro en cancha y resultado de sets.
- **Acceso por Rol**: Los socios ingresan directo y **solo ven el Turnero y la Cartelera**. La Cantina, Caja, Torneos y Panel Admin están restringidos.
- **Cantina Individual + Inventario + Cuenta Corriente**: Al registrar consumos con productos rápidos descuenta stock automáticamente, suma o resta deuda en la Cuenta Corriente del socio y registra los cobros en Caja Diaria. Modo Mesas es optativo desde Config.
- **Panel Administrativo Completo** (con menú lateral en PC y menú desplegable en celular):
  - *Turnos y Horarios*: Activar/desactivar turnos, modificar precios de cancha y ficha de luz, crear o eliminar franjas.
  - *Caja Diaria & Arqueo*: Ingresos y egresos manuales (proveedores, hielo, mantenimiento), filtro por fecha / historial y balance en Efectivo vs. Transferencias.
  - *Cartelera & Anuncios*: Publicaciones visibles en portada para torneos y precios de buffet.
  - *Padrón de Pelotaris*: Alta/edición, activar/desactivar socio, eliminar y botón **Cobrar** para saldar Cuenta Corriente directo a Caja.
  - *Stock de Cantina*: Catálogo completo, reposición rápida (`-1`, `+6`, `+12`), edición y borrado.
  - *Seguridad & Config*: Datos del club, Alias/CBU para transferencias (mostrado al socio al reservar), días visibles del calendario y modo mesas.
  - *Copias & Respaldo*: Exportación e importación JSON completa y reinicio selectivo por fecha.
- **Gestor de Torneos Persistente**: Armado de zonas de 4 a 16 parejas, carga de tantos, tabla automática de posiciones y cuadro de Playoffs/Final guardados.
- **Capa de Persistencia Desacoplada**: `src/lib/supabaseClient.ts` y `src/services/storageService.ts` listos para recibir el cliente oficial `@supabase/supabase-js`.

---

## Parte 2 — Crear la Base de Datos en Supabase (Pasos Manuales)

### Paso 1: Crear el proyecto en Supabase
1. Ingresa a [https://supabase.com](https://supabase.com) e inicia sesión.
2. Haz clic en **New Project**.
3. Nombre sugerido: `carc-trinquete-cantina`. Elige región **South America (São Paulo)** (`sa-east-1`) para mínima latencia en Argentina.
4. Guarda la contraseña de base de datos en un lugar seguro y espera ~1 minuto a que termine de aprovisionar.

### Paso 2: Ejecutar el archivo SQL completo
1. En el menú izquierdo de Supabase, entra a **SQL Editor** → **New query**.
2. Abre el archivo **`supabase/schema.sql`** de este proyecto, copia **todo** su contenido y pégalo en el editor SQL.
3. Haz clic en **Run** (o `Ctrl + Enter`).
4. Verifica que no haya errores. Esto creará automáticamente:
   - Las **10 tablas** (`club_config`, `admin_users`, `horarios_config`, `jugadores`, `turnos`, `productos_cantina`, `consumos_individuales`, `movimientos_caja`, `publicaciones_club`, `torneos`).
   - Las reglas **RLS (Row Level Security)** para que un socio público pueda leer/reservar turnos sin ver la caja ni la cantina.
   - Las funciones **RPC atómicas** (`reservar_turno`, `registrar_consumo_cantina`, `cobrar_consumo_cantina`) que evitan reservas duplicadas simultáneas y descuadres de stock/caja.
   - **Supabase Realtime** activado en todas las tablas operativas.
   - Los datos iniciales del club (18 pelotaris, 10 horarios, catálogo de cantina y 2 avisos de cartelera).

### Paso 3: Crear el usuario Administrador en Supabase Auth
Para dejar atrás el PIN local (`1942`) y usar autenticación real y segura:
1. En Supabase, ve a **Authentication** → **Users** → **Add user** → **Create new user**.
2. Ingresa el email y contraseña reales del encargado/administrador del club (ejemplo: `cantina@carc.com.ar`) y marca **Auto Confirm User**.
3. Copia el **User UID** (UUID) que aparece en la lista de usuarios.
4. Ve a **SQL Editor** y ejecuta esta consulta reemplazando el UUID y email:

```sql
INSERT INTO public.admin_users (user_id, email, nombre, rol)
VALUES (
  'PEGA-AQUI-EL-UUID-DEL-USUARIO',
  'cantina@carc.com.ar',
  'Encargado CARC',
  'admin'
)
ON CONFLICT (user_id) DO NOTHING;
```

### Paso 4: Copiar las credenciales del proyecto
1. En Supabase, ve a **Project Settings** → **API** (o **Data API / API Keys**).
2. Copia estos dos valores:
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon / public key** (comienza con `eyJ...` o `sb_publishable_...`)
3. Crea un archivo `.env` en la raíz del proyecto local (copiando `.env.example`) con:

```env
VITE_SUPABASE_URL="https://TU-PROYECTO.supabase.co"
VITE_SUPABASE_ANON_KEY="TU_ANON_PUBLIC_KEY"
```

---

## Parte 3 — Prompt e Instrucciones Técnicas para Antigravity

Cuando descargues el proyecto, ábrelo en **Antigravity** y pásale la siguiente instrucción (o dile directamente *"Lee `guia-puesta-a-punto.md` y ejecuta toda la Parte 3"*):

> ### Instrucción para Antigravity
> Toma como referencia el esquema ya desplegado en `supabase/schema.sql`, el cliente base `src/lib/supabaseClient.ts` y la capa `src/services/storageService.ts`, y completa la integración con Supabase realizando exactamente los siguientes puntos sin romper el diseño ni la separación de roles (Socio vs. Admin):
>
> 1. **Instalar SDK oficial**:
>    - Instala `@supabase/supabase-js` en `package.json`.
> 2. **Configurar `src/lib/supabaseClient.ts`**:
>    - Inicializa `export const supabase = createClient(url, anonKey)` usando `import.meta.env.VITE_SUPABASE_URL` y `import.meta.env.VITE_SUPABASE_ANON_KEY`.
>    - Mantén un chequeo seguro si faltan las variables para que la app no colapse y muestre aviso claro en modo local.
> 3. **Implementar adaptador Supabase + Realtime en `src/services/storageService.ts` (o un `supabaseRepository.ts` invocado por `App.tsx`)**:
>    - Al montar `App.tsx`, carga desde Supabase:
>      - Siempre (público / socio): `club_config`, `horarios_config`, `jugadores`, `turnos` (desde hoy en adelante según `dias_anticipacion_reserva`) y `publicaciones_club` activas.
>      - Solo cuando `esAdmin === true` (sesión Supabase Auth verificada contra `public.admin_users` o `is_club_admin()`): `productos_cantina`, `consumos_individuales`, `movimientos_caja` y `torneos`.
>    - Conecta canales de **Supabase Realtime** (`supabase.channel(...)`) sobre `turnos`, `horarios_config`, `publicaciones_club` y `club_config` (y sobre `consumos_individuales`, `movimientos_caja`, `productos_cantina` cuando sea Admin) para que cualquier reserva o cambio de precio aparezca en vivo en todos los celulares sin recargar la página.
>    - En las acciones críticas, llama a las funciones RPC atómicas de PostgreSQL en lugar de hacer `upsert` sueltos:
>      - `handleConfirmarReserva` → `supabase.rpc('reservar_turno', ...)` (así dos socios nunca pueden reservar el mismo horario al mismo segundo).
>      - Registrar consumo en `CantinaIndividualView` → `supabase.rpc('registrar_consumo_cantina', ...)` (crea consumo, descuenta stock y actualiza saldo en una sola transacción).
>      - Cobrar consumo pendiente en `CantinaIndividualView` → `supabase.rpc('cobrar_consumo_cantina', ...)` (marca pagado, acredita saldo e inserta movimiento en caja).
>    - Asegúrate de mapear `snake_case` (PostgreSQL) ↔ `camelCase` (TypeScript `src/types/index.ts`) en un único mapper centralizado.
> 4. **Reemplazar el PIN local (`1942`) por Supabase Auth real**:
>    - En el modal `Acceso de Administración` de `src/App.tsx`:
>      - Si Supabase está configurado, muestra campos de **Email y Contraseña** llamando a `supabase.auth.signInWithPassword({ email, password })`.
>      - Tras iniciar sesión, consulta `public.admin_users` (`eq('user_id', user.id)`) para confirmar permisos reales de administrador antes de activar `esAdmin = true`.
>      - Escucha `supabase.auth.onAuthStateChange` al iniciar la app para mantener la sesión del cantinero abierta al recargar y llama a `supabase.auth.signOut()` en `handleCerrarSesionAdmin`.
>      - Conserva el modo PIN local (`1942`) únicamente como fallback cuando `isSupabaseConfigured()` sea `false`.
> 5. **Verificación previa al deploy**:
>    - Ejecuta `npm test` (o `npx tsx --test src/utils/logic.test.ts`), `npm run lint` y `npm run build` asegurando cero errores TypeScript y cero overflow horizontal móvil.

---

## Parte 4 — Publicar en Hosting en Producción

Una vez conectado Supabase y probado en local (`npm run dev`):

### Opción recomendada: Vercel (o Netlify / Cloudflare Pages)
1. Sube tu repositorio a **GitHub** (asegúrate de que `.env` esté en `.gitignore` y **no** subas claves privadas).
2. Entra a [https://vercel.com](https://vercel.com) → **Add New Project** → importa el repositorio.
3. Configura el Build:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. En **Environment Variables**, agrega exactamente las mismas variables que en tu `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Haz clic en **Deploy**.
6. Si usas Netlify en lugar de Vercel, agrega un archivo `public/_redirects` con `/* /index.html 200` (en Vercel crea `vercel.json` con rewrite a `/index.html` si agregas rutas en el futuro).
7. En **Supabase → Authentication → URL Configuration**:
   - Agrega tu dominio productivo (`https://tu-club.vercel.app`) en **Site URL** y **Redirect URLs**.

### Verificar PWA e Imágenes en Producción
- Todas las imágenes del banner y escudo (`src/assets/images/*`) se importan mediante módulos ES en Vite, por lo que quedan empaquetadas en `dist/assets/` con hash cache-safe y cargarán siempre sin depender de URLs externas.
- Al abrir la URL HTTPS desde un teléfono Android (Chrome) o iPhone (Safari → *Agregar a pantalla de inicio*), el manifiesto Web App (`public/manifest.webmanifest`) y el botón de instalación permitirán instalar la app con ícono propio en la pantalla principal.

---

## Parte 5 — Limpieza antes de abrir al público real (Opcional)
Cuando termines tus pruebas y quieras arrancar con datos limpios reales en Supabase, puedes limpiar consumos y movimientos de prueba ejecutando en **SQL Editor**:

```sql
DELETE FROM public.movimientos_caja;
DELETE FROM public.consumos_individuales;
DELETE FROM public.turnos;
DELETE FROM public.torneos;
UPDATE public.jugadores SET saldo_cuenta_corriente = 0;
```

*(Esto conserva tus horarios, catálogo de precios, padrón de socios, cartelera y configuración del club listos para el primer día real).*
