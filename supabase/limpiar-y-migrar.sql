-- ============================================================================
-- LIMPIEZA DE DATOS FICTICIOS Y ACTUALIZACIÓN DE REGISTRO COMPLETO DE JUGADORES
-- Ejecutar en Supabase SQL Editor si ya habías ejecutado schema.sql anteriormente.
-- Mantiene intactos tus usuarios administradores (admin_users), config y horarios.
-- ============================================================================

-- 1. Eliminar TODOS los datos ficticios / de prueba dejando el padrón y movimientos limpios
TRUNCATE TABLE
  public.movimientos_caja,
  public.consumos_individuales,
  public.turnos,
  public.jugadores,
  public.productos_cantina,
  public.publicaciones_club,
  public.torneos
RESTART IDENTITY CASCADE;

-- 2. Ampliar la tabla public.jugadores con todos los campos del registro completo
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS nombre_pila text;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS apellido text;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS dni text;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS fecha_nacimiento date;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS localidad text DEFAULT 'Río Colorado';
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS mano_habil text DEFAULT 'Derecha';
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS es_socio_club boolean NOT NULL DEFAULT true;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS numero_socio text;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS contacto_emergencia text;
ALTER TABLE public.jugadores ADD COLUMN IF NOT EXISTS observaciones text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jugadores_mano_habil_check'
  ) THEN
    ALTER TABLE public.jugadores
      ADD CONSTRAINT jugadores_mano_habil_check
      CHECK (mano_habil IN ('Derecha', 'Zurda', 'Ambidiestro') OR mano_habil IS NULL);
  END IF;
END $$;

-- Índice único por DNI (solo cuando se carga un DNI no vacío)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jugadores_dni_unique
  ON public.jugadores (regexp_replace(dni, '[^0-9]', '', 'g'))
  WHERE dni IS NOT NULL AND trim(dni) <> '';

-- 3. Función RPC segura para auto-registro público de jugadores desde la web
CREATE OR REPLACE FUNCTION public.registrar_jugador(
  p_nombre_pila text,
  p_apellido text,
  p_dni text,
  p_fecha_nacimiento date DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_telefono text DEFAULT '',
  p_localidad text DEFAULT 'Río Colorado',
  p_rol text DEFAULT 'Delantero',
  p_categoria text DEFAULT '2da',
  p_mano_habil text DEFAULT 'Derecha',
  p_es_socio_club boolean DEFAULT true,
  p_numero_socio text DEFAULT NULL,
  p_contacto_emergencia text DEFAULT NULL,
  p_observaciones text DEFAULT NULL
)
RETURNS public.jugadores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre_pila text;
  v_apellido text;
  v_nombre_completo text;
  v_dni_limpio text;
  v_jugador public.jugadores%ROWTYPE;
BEGIN
  v_nombre_pila := trim(COALESCE(p_nombre_pila, ''));
  v_apellido := trim(COALESCE(p_apellido, ''));
  v_dni_limpio := regexp_replace(trim(COALESCE(p_dni, '')), '[^0-9]', '', 'g');

  IF length(v_nombre_pila) < 2 OR length(v_apellido) < 2 THEN
    RAISE EXCEPTION 'Debes ingresar tu nombre y apellido completos.';
  END IF;

  IF length(v_dni_limpio) < 6 THEN
    RAISE EXCEPTION 'Debes ingresar un DNI numérico válido (mínimo 6 dígitos).';
  END IF;

  IF length(trim(COALESCE(p_telefono, ''))) < 6 THEN
    RAISE EXCEPTION 'Debes ingresar un teléfono o WhatsApp válido.';
  END IF;

  v_nombre_completo := v_nombre_pila || ' ' || v_apellido;

  IF EXISTS (
    SELECT 1 FROM public.jugadores
    WHERE regexp_replace(COALESCE(dni, ''), '[^0-9]', '', 'g') = v_dni_limpio
  ) THEN
    RAISE EXCEPTION 'Ya existe un jugador registrado con el DNI ingresado.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.jugadores
    WHERE lower(trim(nombre)) = lower(v_nombre_completo)
  ) THEN
    RAISE EXCEPTION 'Ya existe un jugador registrado con ese nombre y apellido.';
  END IF;

  INSERT INTO public.jugadores (
    nombre,
    nombre_pila,
    apellido,
    dni,
    fecha_nacimiento,
    email,
    rol,
    categoria,
    mano_habil,
    telefono,
    localidad,
    es_socio_club,
    numero_socio,
    contacto_emergencia,
    observaciones,
    saldo_cuenta_corriente,
    activo,
    partidos_jugados
  )
  VALUES (
    v_nombre_completo,
    v_nombre_pila,
    v_apellido,
    v_dni_limpio,
    p_fecha_nacimiento,
    NULLIF(trim(COALESCE(p_email, '')), ''),
    p_rol,
    p_categoria,
    COALESCE(NULLIF(trim(COALESCE(p_mano_habil, '')), ''), 'Derecha'),
    trim(p_telefono),
    COALESCE(NULLIF(trim(COALESCE(p_localidad, '')), ''), 'Río Colorado'),
    COALESCE(p_es_socio_club, true),
    NULLIF(trim(COALESCE(p_numero_socio, '')), ''),
    NULLIF(trim(COALESCE(p_contacto_emergencia, '')), ''),
    NULLIF(trim(COALESCE(p_observaciones, '')), ''),
    0,
    true,
    0
  )
  RETURNING * INTO v_jugador;

  RETURN v_jugador;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_jugador(
  text, text, text, date, text, text, text, text, text, text, boolean, text, text, text
) TO anon, authenticated;
