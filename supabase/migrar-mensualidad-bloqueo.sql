-- ============================================================================
-- MIGRACIÓN INCREMENTAL SEGURA (NO BORRA DATOS EXISTENTES)
-- Mensualidad (vencimiento día 10), Bloqueo manual por Comisión y Detalle Cantina en Perfil
-- Ejecutá este script en el SQL Editor de Supabase para actualizar tu base actual
-- manteniendo todos tus jugadores, turnos y movimientos intactos.
-- ============================================================================

-- 1. Configuración de cuota mensual en club_config
ALTER TABLE public.club_config
  ADD COLUMN IF NOT EXISTS monto_mensualidad numeric NOT NULL DEFAULT 15000,
  ADD COLUMN IF NOT EXISTS dia_vencimiento_mensualidad integer NOT NULL DEFAULT 10;

-- 2. Seguimiento de mensualidad y toggle de bloqueo en jugadores
ALTER TABLE public.jugadores
  ADD COLUMN IF NOT EXISTS ultimo_mes_pago text,
  ADD COLUMN IF NOT EXISTS bloqueado_turnos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_bloqueo text;

-- 3. Actualizar RPC reservar_turno para impedir reserva si algún participante está bloqueado
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
  v_turno_id text;
  v_costo_total numeric;
  v_pagado boolean;
  v_metodo text;
  v_turno public.turnos%ROWTYPE;
  v_hora_ar text;
  v_bloqueado_nombre text;
BEGIN
  SELECT * INTO v_horario
  FROM public.horarios_config
  WHERE id = p_horario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El horario seleccionado no existe.';
  END IF;

  IF v_horario.activo = false AND NOT public.is_club_admin() THEN
    RAISE EXCEPTION 'El horario seleccionado no se encuentra habilitado.';
  END IF;

  IF NOT public.is_club_admin() THEN
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
  END IF;

  v_pagado := CASE WHEN public.is_club_admin() THEN COALESCE(p_pagado, false) ELSE false END;
  v_metodo := CASE WHEN v_pagado THEN p_metodo_pago ELSE NULL END;
  v_costo_total := COALESCE(v_horario.precio_cancha, 0) + COALESCE(v_horario.precio_luz, 0);
  v_turno_id := to_char(p_fecha, 'YYYY-MM-DD') || '__' || p_horario_id;

  INSERT INTO public.turnos (
    id, horario_id, fecha, estado, p1, p2,
    organizador_nombre, notas, costo_total, pagado, metodo_pago, fecha_reserva
  )
  VALUES (
    v_turno_id, p_horario_id, p_fecha, 'ocupado', p_p1, p_p2,
    p_organizador_nombre, NULLIF(trim(COALESCE(p_notas, '')), ''), v_costo_total,
    v_pagado, v_metodo, now()
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
    resultado = NULL
  WHERE public.turnos.estado = 'libre'
  RETURNING * INTO v_turno;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El turno ya se encuentra ocupado o en mantenimiento.';
  END IF;

  IF v_pagado AND v_costo_total > 0 AND v_metodo IN ('efectivo', 'transferencia') THEN
    v_hora_ar := to_char(now() AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI');
    INSERT INTO public.movimientos_caja (
      id, fecha, hora, tipo, categoria, descripcion, monto, metodo_pago, turno_id
    )
    VALUES (
      'mov-' || replace(gen_random_uuid()::text, '-', ''),
      CURRENT_DATE,
      v_hora_ar,
      'ingreso',
      'cancha',
      'Cobro Cancha Turno ' || p_horario_id || ' hs (' || to_char(p_fecha, 'YYYY-MM-DD') || ' · ' || p_organizador_nombre || ')',
      v_costo_total,
      v_metodo,
      v_turno_id
    );
  END IF;

  RETURN v_turno;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reservar_turno(text, date, jsonb, jsonb, text, text, boolean, text)
TO anon, authenticated;

-- 4. RPC para que cada jugador autenticado vea el detalle de sus consumos en cantina
CREATE OR REPLACE FUNCTION public.obtener_mis_consumos()
RETURNS SETOF public.consumos_individuales
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_jugador public.jugadores%ROWTYPE;
BEGIN
  v_email := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  IF v_email = '' THEN
    RETURN;
  END IF;

  SELECT * INTO v_jugador
  FROM public.jugadores
  WHERE lower(trim(COALESCE(email, ''))) = v_email
  ORDER BY id ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.*
  FROM public.consumos_individuales c
  WHERE c.socio_id = v_jugador.id
     OR (c.socio_id IS NULL AND lower(trim(c.socio_nombre)) = lower(trim(v_jugador.nombre)))
  ORDER BY c.fecha DESC, c.created_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_mis_consumos() TO authenticated;
