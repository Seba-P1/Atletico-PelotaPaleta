-- ============================================================================
-- Migración: Reglas estrictas de reserva CARC Trinquete
-- 1. Solo HOY desde las 08:00 hs (Argentina) y bloqueo de horarios pasados (para TODOS los roles)
-- 2. Bloqueo estricto a invitados sin cuenta (requiere usuario autenticado)
-- 3. Límite de 1 turno por día por persona (pelotaris)
-- Ejecutar en Supabase -> SQL Editor -> New Query -> Run
-- ============================================================================

ALTER TABLE public.turnos ADD COLUMN IF NOT EXISTS registrado_user_id uuid;

CREATE OR REPLACE FUNCTION public.reservar_turno(
  p_horario_id text,
  p_fecha date,
  p_p1 jsonb,
  p_p2 jsonb,
  p_organizador_nombre text,
  p_notas text DEFAULT NULL,
  p_pagado boolean DEFAULT false,
  p_metodo_pago text DEFAULT NULL
)
RETURNS public.turnos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_horario public.horarios_config%ROWTYPE;
  v_cfg public.club_config%ROWTYPE;
  v_dia_bloqueado public.dias_bloqueados%ROWTYPE;
  v_turno_id text;
  v_costo_total numeric;
  v_pagado boolean;
  v_metodo text;
  v_turno public.turnos%ROWTYPE;
  v_now_ar timestamp;
  v_fecha_ar date;
  v_hora_num integer;
  v_hora_ar text;
  v_bloqueado_nombre text;
  v_es_staff boolean;
  v_operador text;
  v_user_id uuid;
  v_email text;
  v_jugador_nombre text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Solo los usuarios registrados pueden reservar turnos. Iniciá sesión o registrate primero.';
  END IF;

  v_es_staff := public.is_club_staff();
  v_email := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  v_now_ar := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_fecha_ar := v_now_ar::date;
  v_hora_num := EXTRACT(HOUR FROM v_now_ar)::integer;
  v_hora_ar := to_char(v_now_ar, 'HH24:MI');

  SELECT * INTO v_cfg FROM public.club_config WHERE id = 1;
  SELECT * INTO v_horario FROM public.horarios_config WHERE id = p_horario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado no existe.';
  END IF;

  IF v_horario.activo = false AND NOT v_es_staff THEN
    RAISE EXCEPTION 'El horario seleccionado no se encuentra habilitado.';
  END IF;

  -- Reglas de fecha y horario: aplican a TODOS los roles sin excepción
  IF p_fecha < v_fecha_ar THEN
    RAISE EXCEPTION 'No es posible reservar turnos en fechas pasadas.';
  END IF;

  IF COALESCE(v_cfg.solo_turnos_en_el_dia, true) THEN
    IF p_fecha <> v_fecha_ar THEN
      RAISE EXCEPTION 'Solo se pueden reservar turnos en el día (%).', to_char(v_fecha_ar, 'DD/MM/YYYY');
    END IF;
    IF v_hora_num < COALESCE(v_cfg.hora_apertura_turnos, 8) THEN
      RAISE EXCEPTION 'La reserva de turnos del día se habilita a partir de las %:00 hs.', lpad(COALESCE(v_cfg.hora_apertura_turnos, 8)::text, 2, '0');
    END IF;
  END IF;

  IF p_fecha = v_fecha_ar AND v_horario.inicio ~ '^\d{1,2}:\d{2}$' AND v_now_ar::time >= v_horario.inicio::time THEN
    RAISE EXCEPTION 'El turno de las % hs ya comenzó o finalizó (hora actual % hs).', v_horario.inicio, v_hora_ar;
  END IF;

  IF NOT v_es_staff THEN
    SELECT * INTO v_dia_bloqueado
    FROM public.dias_bloqueados
    WHERE fecha = p_fecha AND bloqueado = true;

    IF FOUND THEN
      RAISE EXCEPTION 'Los turnos de esta fecha están suspendidos: %', v_dia_bloqueado.motivo;
    END IF;

    SELECT j.nombre INTO v_bloqueado_nombre
    FROM public.jugadores j
    WHERE j.bloqueado_turnos = true
      AND lower(trim(j.nombre)) IN (
        lower(trim(COALESCE(p_p1->>'delantero', ''))),
        lower(trim(COALESCE(p_p1->>'zaguero', ''))),
        lower(trim(COALESCE(p_p2->>'delantero', ''))),
        lower(trim(COALESCE(p_p2->>'zaguero', ''))),
        lower(trim(COALESCE(p_organizador_nombre, '')))
      )
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'El jugador % se encuentra bloqueado para sacar turnos por decisión de la Comisión Directiva. Regularizá tu mensualidad o deuda en cantina.', v_bloqueado_nombre;
    END IF;

    SELECT j.nombre INTO v_jugador_nombre
    FROM public.jugadores j
    WHERE v_email <> '' AND lower(trim(COALESCE(j.email, ''))) = v_email
    LIMIT 1;

    v_jugador_nombre := COALESCE(
      NULLIF(trim(v_jugador_nombre), ''),
      NULLIF(trim(COALESCE(auth.jwt()->'user_metadata'->>'nombre', '')), ''),
      NULLIF(trim(COALESCE(p_organizador_nombre, '')), '')
    );

    IF EXISTS (
      SELECT 1
      FROM public.turnos t
      WHERE t.fecha = p_fecha
        AND t.estado = 'ocupado'
        AND (
          t.registrado_user_id = v_user_id
          OR (
            v_jugador_nombre IS NOT NULL AND v_jugador_nombre <> '' AND (
              lower(trim(COALESCE(t.organizador_nombre, ''))) = lower(trim(v_jugador_nombre))
              OR lower(trim(COALESCE(t.registrado_por, ''))) = lower(trim(v_jugador_nombre))
              OR lower(trim(COALESCE(t.p1->>'delantero', ''))) = lower(trim(v_jugador_nombre))
              OR lower(trim(COALESCE(t.p1->>'zaguero', ''))) = lower(trim(v_jugador_nombre))
              OR lower(trim(COALESCE(t.p2->>'delantero', ''))) = lower(trim(v_jugador_nombre))
              OR lower(trim(COALESCE(t.p2->>'zaguero', ''))) = lower(trim(v_jugador_nombre))
            )
          )
        )
    ) THEN
      RAISE EXCEPTION 'Ya tenés un turno reservado hoy. Solo se permite 1 turno por día por persona.';
    END IF;
  END IF;

  v_operador := CASE
    WHEN v_es_staff THEN public.current_staff_label()
    ELSE COALESCE(NULLIF(trim(p_organizador_nombre), ''), 'Jugador')
  END;

  v_pagado := CASE WHEN v_es_staff THEN COALESCE(p_pagado, false) ELSE false END;
  v_metodo := CASE WHEN v_pagado THEN p_metodo_pago ELSE NULL END;
  v_costo_total := COALESCE(v_horario.precio_cancha, 0) + COALESCE(v_horario.precio_luz, 0);
  v_turno_id := to_char(p_fecha, 'YYYY-MM-DD') || '__' || p_horario_id;

  INSERT INTO public.turnos (
    id, horario_id, fecha, estado, p1, p2,
    organizador_nombre, notas, costo_total, pagado, metodo_pago, fecha_reserva, registrado_por, registrado_user_id
  )
  VALUES (
    v_turno_id, p_horario_id, p_fecha, 'ocupado', p_p1, p_p2,
    p_organizador_nombre, NULLIF(trim(COALESCE(p_notas, '')), ''), v_costo_total,
    v_pagado, v_metodo, now(), v_operador, v_user_id
  )
  ON CONFLICT (fecha, horario_id) DO UPDATE
  SET
    estado = 'ocupado',
    p1 = EXCLUDED.p1,
    p2 = EXCLUDED.p2,
    organizador_nombre = EXCLUDED.organizador_nombre,
    notas = EXCLUDED.notas,
    costo_total = EXCLUDED.costo_total,
    pagado = EXCLUDED.pagado,
    metodo_pago = EXCLUDED.metodo_pago,
    fecha_reserva = now(),
    registrado_por = EXCLUDED.registrado_por,
    registrado_user_id = EXCLUDED.registrado_user_id,
    resultado = NULL
  WHERE public.turnos.estado = 'libre'
  RETURNING * INTO v_turno;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El turno ya se encuentra ocupado o en mantenimiento.';
  END IF;

  IF v_pagado AND v_costo_total > 0 AND v_metodo IN ('efectivo', 'transferencia') THEN
    INSERT INTO public.movimientos_caja (
      id, fecha, hora, tipo, categoria, descripcion, monto, metodo_pago, turno_id, registrado_por
    )
    VALUES (
      'mov-' || replace(gen_random_uuid()::text, '-', ''),
      v_fecha_ar,
      v_hora_ar,
      'ingreso',
      'cancha',
      'Cobro Cancha Turno ' || p_horario_id || ' hs (' || to_char(p_fecha, 'YYYY-MM-DD') || ' · ' || p_organizador_nombre || ')',
      v_costo_total,
      v_metodo,
      v_turno_id,
      v_operador
    );
  END IF;

  RETURN v_turno;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_turno(text, date, jsonb, jsonb, text, text, boolean, text)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.reservar_turno(text, date, jsonb, jsonb, text, text, boolean, text)
TO authenticated;
