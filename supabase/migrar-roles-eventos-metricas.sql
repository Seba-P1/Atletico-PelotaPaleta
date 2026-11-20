-- ============================================================================
-- MIGRACIÓN ADITIVA CARC TRINQUETE:
-- Roles con Códigos (Comisión Directiva vs Cantina), Regla 08:00 AM / Solo Hoy,
-- Bloqueo de Día por Evento, Hero & Promos Cantina, Servicio de Invitado y Auditoría
-- ============================================================================
-- Ejecutar en Supabase SQL Editor (seguro para bases ya creadas; no borra datos).

-- 1. Nuevas columnas en club_config (Regla 8AM, Hero y Promos)
ALTER TABLE public.club_config ADD COLUMN IF NOT EXISTS solo_turnos_en_el_dia boolean NOT NULL DEFAULT true;
ALTER TABLE public.club_config ADD COLUMN IF NOT EXISTS hora_apertura_turnos integer NOT NULL DEFAULT 8;
ALTER TABLE public.club_config ADD COLUMN IF NOT EXISTS hero_badge text DEFAULT 'Trinquete Oficial · Río Colorado';
ALTER TABLE public.club_config ADD COLUMN IF NOT EXISTS hero_titulo text DEFAULT 'Cancha de Pelota Paleta CARC';
ALTER TABLE public.club_config ADD COLUMN IF NOT EXISTS hero_subtitulo text DEFAULT 'Reservá tu turno en el día desde las 08:00 hs, consultá promociones del buffet y seguí tu estado al día.';
ALTER TABLE public.club_config ADD COLUMN IF NOT EXISTS hero_imagen_url text;
ALTER TABLE public.club_config ADD COLUMN IF NOT EXISTS promos_cantina jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Auditoría y Servicio de Invitado en turnos, consumos y caja
ALTER TABLE public.turnos ADD COLUMN IF NOT EXISTS registrado_por text;
ALTER TABLE public.movimientos_caja ADD COLUMN IF NOT EXISTS registrado_por text;
ALTER TABLE public.consumos_individuales ADD COLUMN IF NOT EXISTS es_invitado boolean NOT NULL DEFAULT false;
ALTER TABLE public.consumos_individuales ADD COLUMN IF NOT EXISTS observacion_invitado text;
ALTER TABLE public.consumos_individuales ADD COLUMN IF NOT EXISTS registrado_por text;

-- 3. Tabla de Días Bloqueados por Eventos Especiales
CREATE TABLE IF NOT EXISTS public.dias_bloqueados (
  fecha date PRIMARY KEY,
  bloqueado boolean NOT NULL DEFAULT true,
  motivo text NOT NULL DEFAULT 'Jornada suspendida por evento especial del club',
  actualizado_por text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_dias_bloqueados_updated ON public.dias_bloqueados;
CREATE TRIGGER trg_dias_bloqueados_updated BEFORE UPDATE ON public.dias_bloqueados
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Tabla de Códigos de Acceso por Panel (Comisión Directiva vs Cantina)
CREATE TABLE IF NOT EXISTS public.club_access_codes (
  rol text PRIMARY KEY CHECK (rol IN ('admin', 'cantinero')),
  codigo text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_club_access_codes_updated ON public.club_access_codes;
CREATE TRIGGER trg_club_access_codes_updated BEFORE UPDATE ON public.club_access_codes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.club_access_codes (rol, codigo) VALUES
  ('admin', 'COMISION-CARC'),
  ('cantinero', 'CANTINA-CARC')
ON CONFLICT (rol) DO NOTHING;

-- 5. Funciones de autorización por rol (Super Admin vs Staff)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND rol = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_club_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = auth.uid()
      AND rol IN ('admin', 'cantinero')
  );
$$;

-- Mantener is_club_admin() alineado a Super Admin para proteger configuración, bloqueos y reportes
CREATE OR REPLACE FUNCTION public.is_club_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin();
$$;

-- Helper para obtener nombre del operador actual (para auditoría)
CREATE OR REPLACE FUNCTION public.current_staff_label()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT nombre FROM public.admin_users WHERE user_id = auth.uid() LIMIT 1),
    NULLIF(trim(COALESCE(auth.jwt() -> 'user_metadata' ->> 'nombre_completo', '')), ''),
    NULLIF(trim(COALESCE(auth.jwt() ->> 'email', '')), ''),
    'Usuario'
  );
$$;

-- 6. RLS actualizado con aislamiento estricto para Cantina vs Comisión Directiva
ALTER TABLE public.dias_bloqueados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_access_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dias_bloqueados_public_read" ON public.dias_bloqueados;
CREATE POLICY "dias_bloqueados_public_read" ON public.dias_bloqueados
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "dias_bloqueados_super_admin_all" ON public.dias_bloqueados;
CREATE POLICY "dias_bloqueados_super_admin_all" ON public.dias_bloqueados
FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Códigos de acceso: SOLO Comisión Directiva puede leer/editar
DROP POLICY IF EXISTS "club_access_codes_super_admin_all" ON public.club_access_codes;
CREATE POLICY "club_access_codes_super_admin_all" ON public.club_access_codes
FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Turnos: Staff (Cantina + Comisión) puede modificar/gestionar turnos
DROP POLICY IF EXISTS "turnos_admin_all" ON public.turnos;
CREATE POLICY "turnos_admin_all" ON public.turnos
FOR ALL TO authenticated USING (public.is_club_staff()) WITH CHECK (public.is_club_staff());

-- Cantina y Productos: Staff (Cantina + Comisión) puede operar
DROP POLICY IF EXISTS "productos_admin_all" ON public.productos_cantina;
CREATE POLICY "productos_admin_all" ON public.productos_cantina
FOR ALL TO authenticated USING (public.is_club_staff()) WITH CHECK (public.is_club_staff());

DROP POLICY IF EXISTS "consumos_admin_all" ON public.consumos_individuales;
CREATE POLICY "consumos_admin_all" ON public.consumos_individuales
FOR ALL TO authenticated USING (public.is_club_staff()) WITH CHECK (public.is_club_staff());

-- Jugadores: Staff puede leer (incluso inactivos), SOLO Comisión Directiva modifica (ej. bloqueos/mensualidad)
DROP POLICY IF EXISTS "jugadores_public_read" ON public.jugadores;
CREATE POLICY "jugadores_public_read" ON public.jugadores
FOR SELECT TO anon, authenticated USING (activo = true OR public.is_club_staff());

DROP POLICY IF EXISTS "jugadores_admin_all" ON public.jugadores;
CREATE POLICY "jugadores_admin_all" ON public.jugadores
FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Movimientos de Caja (Reportes y Métricas): SOLO Comisión Directiva puede leer/borrar; Staff puede insertar vía operaciones
DROP POLICY IF EXISTS "caja_admin_all" ON public.movimientos_caja;
DROP POLICY IF EXISTS "caja_super_admin_select" ON public.movimientos_caja;
CREATE POLICY "caja_super_admin_select" ON public.movimientos_caja
FOR SELECT TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "caja_staff_insert" ON public.movimientos_caja;
CREATE POLICY "caja_staff_insert" ON public.movimientos_caja
FOR INSERT TO authenticated WITH CHECK (public.is_club_staff());

DROP POLICY IF EXISTS "caja_super_admin_update_delete" ON public.movimientos_caja;
CREATE POLICY "caja_super_admin_update_delete" ON public.movimientos_caja
FOR DELETE TO authenticated USING (public.is_super_admin());

-- 7. RPC para canjear código específico de Comisión Directiva o Cantina
CREATE OR REPLACE FUNCTION public.canjear_codigo_acceso(
  p_codigo text,
  p_nombre text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_codigo_clean text;
  v_rol_encontrado text;
  v_nombre_final text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión o registrarte primero para validar un código de acceso.';
  END IF;

  v_codigo_clean := upper(trim(COALESCE(p_codigo, '')));
  IF v_codigo_clean = '' THEN
    RAISE EXCEPTION 'Ingresa un código de acceso válido.';
  END IF;

  SELECT rol INTO v_rol_encontrado
  FROM public.club_access_codes
  WHERE upper(trim(codigo)) = v_codigo_clean
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El código ingresado no es válido para Comisión Directiva ni para Cantina.';
  END IF;

  v_email := COALESCE(NULLIF(trim(COALESCE(auth.jwt() ->> 'email', '')), ''), 'usuario@carc.com');
  v_nombre_final := COALESCE(
    NULLIF(trim(COALESCE(p_nombre, '')), ''),
    NULLIF(trim(COALESCE(auth.jwt() -> 'user_metadata' ->> 'nombre_completo', '')), ''),
    split_part(v_email, '@', 1)
  );

  INSERT INTO public.admin_users (user_id, email, nombre, rol)
  VALUES (v_uid, v_email, v_nombre_final, v_rol_encontrado)
  ON CONFLICT (user_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    nombre = COALESCE(NULLIF(EXCLUDED.nombre, ''), public.admin_users.nombre),
    rol = EXCLUDED.rol;

  RETURN jsonb_build_object(
    'ok', true,
    'rol', v_rol_encontrado,
    'nombre', v_nombre_final
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.canjear_codigo_acceso(text, text) TO authenticated;

-- 8. RPC reservar_turno actualizada (solo hoy desde 08:00 hs AR + bloqueo día especial + auditoría)
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
BEGIN
  v_es_staff := public.is_club_staff();
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

  IF NOT v_es_staff THEN
    SELECT * INTO v_dia_bloqueado
    FROM public.dias_bloqueados
    WHERE fecha = p_fecha AND bloqueado = true;

    IF FOUND THEN
      RAISE EXCEPTION 'Los turnos de esta fecha están suspendidos: %', v_dia_bloqueado.motivo;
    END IF;

    IF COALESCE(v_cfg.solo_turnos_en_el_dia, true) THEN
      IF p_fecha <> v_fecha_ar THEN
        RAISE EXCEPTION 'Solo se pueden reservar turnos en el día (%).', to_char(v_fecha_ar, 'DD/MM/YYYY');
      END IF;
      IF v_hora_num < COALESCE(v_cfg.hora_apertura_turnos, 8) THEN
        RAISE EXCEPTION 'La reserva de turnos del día se habilita a partir de las %:00 hs.', lpad(COALESCE(v_cfg.hora_apertura_turnos, 8)::text, 2, '0');
      END IF;
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
    organizador_nombre, notas, costo_total, pagado, metodo_pago, fecha_reserva, registrado_por
  )
  VALUES (
    v_turno_id, p_horario_id, p_fecha, 'ocupado', p_p1, p_p2,
    p_organizador_nombre, NULLIF(trim(COALESCE(p_notas, '')), ''), v_costo_total,
    v_pagado, v_metodo, now(), v_operador
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

GRANT EXECUTE ON FUNCTION public.reservar_turno(text, date, jsonb, jsonb, text, text, boolean, text)
TO anon, authenticated;

-- 9. RPC atómica para cobrar turno desde Cantina o Comisión Directiva
CREATE OR REPLACE FUNCTION public.cobrar_turno_staff(
  p_turno_id text,
  p_metodo_pago text
)
RETURNS public.turnos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno public.turnos%ROWTYPE;
  v_horario public.horarios_config%ROWTYPE;
  v_costo numeric;
  v_now_ar timestamp;
  v_operador text;
BEGIN
  IF NOT public.is_club_staff() THEN
    RAISE EXCEPTION 'Acceso denegado: solo el personal autorizado puede cobrar turnos.';
  END IF;

  SELECT * INTO v_turno FROM public.turnos WHERE id = p_turno_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turno no encontrado.';
  END IF;

  IF v_turno.pagado THEN
    RETURN v_turno;
  END IF;

  SELECT * INTO v_horario FROM public.horarios_config WHERE id = v_turno.horario_id;
  v_costo := GREATEST(
    COALESCE(v_turno.costo_total, 0),
    COALESCE(v_horario.precio_cancha, 0) + COALESCE(v_horario.precio_luz, 0)
  );
  v_now_ar := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_operador := public.current_staff_label();

  UPDATE public.turnos
  SET
    pagado = true,
    metodo_pago = p_metodo_pago,
    costo_total = v_costo
  WHERE id = p_turno_id
  RETURNING * INTO v_turno;

  IF v_costo > 0 AND p_metodo_pago IN ('efectivo', 'transferencia') THEN
    INSERT INTO public.movimientos_caja (
      id, fecha, hora, tipo, categoria, descripcion, monto, metodo_pago, turno_id, registrado_por
    )
    VALUES (
      'mov-' || replace(gen_random_uuid()::text, '-', ''),
      v_now_ar::date,
      to_char(v_now_ar, 'HH24:MI'),
      'ingreso',
      'cancha',
      'Cobro Cancha Turno ' || v_turno.horario_id || ' hs (' || COALESCE(v_turno.organizador_nombre, 'Turno') || ')',
      v_costo,
      p_metodo_pago,
      v_turno.id,
      v_operador
    );
  END IF;

  RETURN v_turno;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cobrar_turno_staff(text, text) TO authenticated;

-- 10. RPC Cantina con Servicio de Invitado y Operador registrado_por
DROP FUNCTION IF EXISTS public.registrar_consumo_cantina(text, bigint, text, numeric, boolean, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.registrar_consumo_cantina(
  p_socio_nombre text,
  p_socio_id bigint,
  p_detalle text,
  p_monto numeric,
  p_pagado boolean,
  p_metodo_pago text DEFAULT NULL,
  p_mesa text DEFAULT NULL,
  p_productos_usados jsonb DEFAULT '[]'::jsonb,
  p_es_invitado boolean DEFAULT false,
  p_observacion_invitado text DEFAULT NULL
)
RETURNS public.consumos_individuales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumo_id text;
  v_now_ar timestamp;
  v_fecha_ar date;
  v_hora_ar text;
  v_item jsonb;
  v_consumo public.consumos_individuales%ROWTYPE;
  v_operador text;
BEGIN
  IF NOT public.is_club_staff() THEN
    RAISE EXCEPTION 'Acceso denegado: solo el personal de cantina o comisión puede registrar consumos.';
  END IF;

  v_now_ar := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_fecha_ar := v_now_ar::date;
  v_hora_ar := to_char(v_now_ar, 'HH24:MI');
  v_consumo_id := 'cons-' || replace(gen_random_uuid()::text, '-', '');
  v_operador := public.current_staff_label();

  INSERT INTO public.consumos_individuales (
    id, fecha, hora, socio_nombre, socio_id, detalle, monto,
    pagado, metodo_pago, fecha_cobro, mesa, productos_usados,
    es_invitado, observacion_invitado, registrado_por
  )
  VALUES (
    v_consumo_id,
    v_fecha_ar,
    v_hora_ar,
    trim(p_socio_nombre),
    CASE WHEN COALESCE(p_es_invitado, false) THEN NULL ELSE p_socio_id END,
    trim(p_detalle),
    p_monto,
    p_pagado,
    CASE WHEN p_pagado THEN p_metodo_pago ELSE NULL END,
    CASE WHEN p_pagado THEN v_hora_ar ELSE NULL END,
    NULLIF(trim(COALESCE(p_mesa, '')), ''),
    p_productos_usados,
    COALESCE(p_es_invitado, false),
    NULLIF(trim(COALESCE(p_observacion_invitado, '')), ''),
    v_operador
  )
  RETURNING * INTO v_consumo;

  IF jsonb_typeof(p_productos_usados) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_productos_usados)
    LOOP
      UPDATE public.productos_cantina
      SET stock = GREATEST(0, stock - COALESCE((v_item->>'cantidad')::integer, 1))
      WHERE id = v_item->>'productoId';
    END LOOP;
  END IF;

  IF (NOT COALESCE(p_es_invitado, false)) AND (NOT p_pagado OR p_metodo_pago = 'cuenta_corriente') THEN
    UPDATE public.jugadores
    SET saldo_cuenta_corriente = saldo_cuenta_corriente - p_monto
    WHERE (p_socio_id IS NOT NULL AND id = p_socio_id)
       OR (p_socio_id IS NULL AND lower(trim(nombre)) = lower(trim(p_socio_nombre)));
  END IF;

  IF p_pagado AND p_metodo_pago IN ('efectivo', 'transferencia') THEN
    INSERT INTO public.movimientos_caja (
      id, fecha, hora, tipo, categoria, descripcion, monto, metodo_pago, consumo_id, registrado_por
    )
    VALUES (
      'mov-' || replace(gen_random_uuid()::text, '-', ''),
      v_fecha_ar,
      v_hora_ar,
      'ingreso',
      'cantina',
      'Cantina ' || CASE WHEN COALESCE(p_es_invitado, false) THEN '(Invitado: ' || trim(p_socio_nombre) || ')' ELSE '(' || trim(p_socio_nombre) || ')' END || ': ' || trim(p_detalle),
      p_monto,
      p_metodo_pago,
      v_consumo_id,
      v_operador
    );
  END IF;

  RETURN v_consumo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_consumo_cantina(text, bigint, text, numeric, boolean, text, text, jsonb, boolean, text)
TO authenticated;

-- 11. Actualizar cobrar_consumo_cantina para permitir Staff y registrar operador
CREATE OR REPLACE FUNCTION public.cobrar_consumo_cantina(
  p_consumo_id text,
  p_metodo_pago text
)
RETURNS public.consumos_individuales
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consumo public.consumos_individuales%ROWTYPE;
  v_now_ar timestamp;
  v_hora_ar text;
  v_operador text;
BEGIN
  IF NOT public.is_club_staff() THEN
    RAISE EXCEPTION 'Acceso denegado: solo el personal autorizado puede cobrar consumos.';
  END IF;

  SELECT * INTO v_consumo
  FROM public.consumos_individuales
  WHERE id = p_consumo_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consumo no encontrado.';
  END IF;

  IF v_consumo.pagado THEN
    RETURN v_consumo;
  END IF;

  v_now_ar := now() AT TIME ZONE 'America/Argentina/Buenos_Aires';
  v_hora_ar := to_char(v_now_ar, 'HH24:MI');
  v_operador := public.current_staff_label();

  UPDATE public.consumos_individuales
  SET
    pagado = true,
    metodo_pago = p_metodo_pago,
    fecha_cobro = v_hora_ar
  WHERE id = p_consumo_id
  RETURNING * INTO v_consumo;

  IF NOT COALESCE(v_consumo.es_invitado, false) THEN
    UPDATE public.jugadores
    SET saldo_cuenta_corriente = saldo_cuenta_corriente + v_consumo.monto
    WHERE (v_consumo.socio_id IS NOT NULL AND id = v_consumo.socio_id)
       OR (v_consumo.socio_id IS NULL AND lower(trim(nombre)) = lower(trim(v_consumo.socio_nombre)));
  END IF;

  IF p_metodo_pago IN ('efectivo', 'transferencia') THEN
    INSERT INTO public.movimientos_caja (
      id, fecha, hora, tipo, categoria, descripcion, monto, metodo_pago, consumo_id, registrado_por
    )
    VALUES (
      'mov-' || replace(gen_random_uuid()::text, '-', ''),
      v_now_ar::date,
      v_hora_ar,
      'ingreso',
      'cantina',
      'Cobro Cantina (' || v_consumo.socio_nombre || '): ' || v_consumo.detalle,
      v_consumo.monto,
      p_metodo_pago,
      v_consumo.id,
      v_operador
    );
  END IF;

  RETURN v_consumo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cobrar_consumo_cantina(text, text) TO authenticated;

-- 12. Realtime para dias_bloqueados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'dias_bloqueados'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dias_bloqueados;
  END IF;
END $$;
