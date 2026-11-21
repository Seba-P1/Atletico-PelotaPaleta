-- ============================================================================
-- MIGRACIÓN: Vincular ficha existente del padrón a cuenta autenticada
-- Permite que un pelotari pre-cargado reclame y valide su ficha con su DNI
-- ============================================================================

CREATE OR REPLACE FUNCTION public.vincular_mi_ficha_padron(
  p_jugador_id bigint,
  p_dni text,
  p_telefono text DEFAULT NULL,
  p_fecha_nacimiento date DEFAULT NULL,
  p_contacto_emergencia text DEFAULT NULL,
  p_observaciones text DEFAULT NULL
)
RETURNS public.jugadores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_dni_limpio text;
  v_dni_ficha text;
  v_jugador public.jugadores%ROWTYPE;
BEGIN
  -- 1. Obtener email del usuario autenticado
  v_email := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  IF v_email = '' THEN
    RAISE EXCEPTION 'Debés iniciar sesión o confirmar tu cuenta para vincular tu ficha del padrón.';
  END IF;

  -- 2. Limpiar DNI ingresado
  v_dni_limpio := regexp_replace(trim(COALESCE(p_dni, '')), '[^0-9]', '', 'g');
  IF length(v_dni_limpio) < 6 THEN
    RAISE EXCEPTION 'Ingresá tu DNI numérico sin puntos (mínimo 6 dígitos) para validar tu perfil.';
  END IF;

  -- 3. Buscar la ficha del padrón seleccionada
  SELECT * INTO v_jugador
  FROM public.jugadores
  WHERE id = p_jugador_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la ficha seleccionada en el padrón de pelotaris.';
  END IF;

  -- 4. Validar coincidencia de DNI si la ficha ya tenía DNI cargado
  v_dni_ficha := regexp_replace(trim(COALESCE(v_jugador.dni, '')), '[^0-9]', '', 'g');
  IF length(v_dni_ficha) >= 6 AND v_dni_ficha <> v_dni_limpio THEN
    RAISE EXCEPTION 'El DNI ingresado no coincide con el registrado para %. Verificalo o consultá con la Comisión Directiva.', v_jugador.nombre;
  END IF;

  -- 5. Actualizar la ficha vinculándola con el email y completando datos personales
  UPDATE public.jugadores
  SET
    email = v_email,
    dni = COALESCE(NULLIF(v_dni_ficha, ''), v_dni_limpio),
    telefono = COALESCE(NULLIF(trim(COALESCE(p_telefono, '')), ''), telefono),
    fecha_nacimiento = COALESCE(p_fecha_nacimiento, fecha_nacimiento),
    contacto_emergencia = COALESCE(NULLIF(trim(COALESCE(p_contacto_emergencia, '')), ''), contacto_emergencia),
    observaciones = CASE
      WHEN p_observaciones IS NOT NULL AND trim(p_observaciones) <> '' THEN
        CASE
          WHEN observaciones IS NOT NULL AND trim(observaciones) <> '' THEN
            observaciones || ' · ' || trim(p_observaciones)
          ELSE trim(p_observaciones)
        END
      ELSE observaciones
    END,
    activo = true
  WHERE id = p_jugador_id
  RETURNING * INTO v_jugador;

  -- 6. Enlazar consumos huérfanos históricos de cantina
  UPDATE public.consumos_individuales
  SET socio_id = v_jugador.id
  WHERE socio_id IS NULL
    AND lower(trim(socio_nombre)) = lower(trim(v_jugador.nombre));

  RETURN v_jugador;
END;
$$;

GRANT EXECUTE ON FUNCTION public.vincular_mi_ficha_padron(bigint, text, text, date, text, text) TO authenticated;
