-- Panel d'administració: camps extra a jugadors, cuotes i RPCs

ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS primer_apellido text;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS segundo_apellido text;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS numero_socio text;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS id_app_antigua text;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS es_super_admin boolean NOT NULL DEFAULT false;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS es_tesorero boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS cuotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id uuid NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('anual', 'trimestral')),
  periodo text NOT NULL,
  pagada boolean NOT NULL DEFAULT false,
  fecha_pago date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jugador_id, tipo, periodo)
);

CREATE INDEX IF NOT EXISTS cuotas_jugador_id_idx ON cuotas (jugador_id);

ALTER TABLE cuotas ENABLE ROW LEVEL SECURITY;

-- Helpers de permisos (patró es_coordinador)
CREATE OR REPLACE FUNCTION es_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT j.es_super_admin
      FROM jugadores j
      WHERE j.auth_id = auth.uid()
        AND j.activo = true
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION es_tesorero()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT j.es_tesorero
      FROM jugadores j
      WHERE j.auth_id = auth.uid()
        AND j.activo = true
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION es_admin_o_tesorero()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT es_super_admin() OR es_tesorero();
$$;

GRANT EXECUTE ON FUNCTION es_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION es_tesorero() TO authenticated;
GRANT EXECUTE ON FUNCTION es_admin_o_tesorero() TO authenticated;

CREATE OR REPLACE FUNCTION get_jugadores_admin()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin_o_tesorero() THEN
    RAISE EXCEPTION 'No autoritzat.';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(to_jsonb(j) ORDER BY j.nombre_completo, j.nombre), '[]'::jsonb)
    FROM jugadores j
  );
END;
$$;

CREATE OR REPLACE FUNCTION crear_jugador_admin(
  p_nombre text,
  p_primer_apellido text,
  p_segundo_apellido text,
  p_nickname text,
  p_email text,
  p_numero_socio text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_nombre text;
  v_primer text;
  v_segundo text;
  v_nombre_completo text;
BEGIN
  IF NOT es_super_admin() THEN
    RAISE EXCEPTION 'Només super admin pot crear jugadors.';
  END IF;

  v_nombre := NULLIF(TRIM(p_nombre), '');
  v_primer := NULLIF(TRIM(p_primer_apellido), '');
  v_segundo := NULLIF(TRIM(p_segundo_apellido), '');

  IF v_nombre IS NULL THEN
    RAISE EXCEPTION 'El nom és obligatori.';
  END IF;

  IF NULLIF(TRIM(p_email), '') IS NULL THEN
    RAISE EXCEPTION 'L''email és obligatori.';
  END IF;

  v_nombre_completo := TRIM(CONCAT_WS(' ', v_nombre, v_primer, v_segundo));

  INSERT INTO jugadores (
    nombre,
    primer_apellido,
    segundo_apellido,
    nombre_completo,
    nickname,
    email,
    numero_socio
  )
  VALUES (
    v_nombre,
    v_primer,
    v_segundo,
    v_nombre_completo,
    NULLIF(TRIM(p_nickname), ''),
    NULLIF(TRIM(p_email), ''),
    NULLIF(TRIM(p_numero_socio), '')
  )
  RETURNING id INTO v_id;

  INSERT INTO ranking (jugador_id)
  VALUES (v_id)
  ON CONFLICT (jugador_id) DO NOTHING;

  RETURN to_jsonb((SELECT j FROM jugadores j WHERE j.id = v_id));
END;
$$;

CREATE OR REPLACE FUNCTION editar_jugador_admin(
  p_jugador_id uuid,
  p_nombre text DEFAULT NULL,
  p_primer_apellido text DEFAULT NULL,
  p_segundo_apellido text DEFAULT NULL,
  p_nickname text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_numero_socio text DEFAULT NULL,
  p_id_app_antigua text DEFAULT NULL,
  p_es_coordinador boolean DEFAULT NULL,
  p_es_tesorero boolean DEFAULT NULL,
  p_es_super_admin boolean DEFAULT NULL,
  p_activo boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jugadores%ROWTYPE;
  v_nombre text;
  v_primer text;
  v_segundo text;
BEGIN
  IF NOT es_super_admin() THEN
    RAISE EXCEPTION 'Només super admin pot editar jugadors.';
  END IF;

  SELECT * INTO v_row
  FROM jugadores
  WHERE id = p_jugador_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  v_nombre := COALESCE(NULLIF(TRIM(p_nombre), ''), v_row.nombre);
  v_primer := CASE
    WHEN p_primer_apellido IS NULL THEN v_row.primer_apellido
    ELSE NULLIF(TRIM(p_primer_apellido), '')
  END;
  v_segundo := CASE
    WHEN p_segundo_apellido IS NULL THEN v_row.segundo_apellido
    ELSE NULLIF(TRIM(p_segundo_apellido), '')
  END;

  UPDATE jugadores
  SET
    nombre = v_nombre,
    primer_apellido = v_primer,
    segundo_apellido = v_segundo,
    nombre_completo = TRIM(CONCAT_WS(' ', v_nombre, v_primer, v_segundo)),
    nickname = CASE
      WHEN p_nickname IS NULL THEN nickname
      ELSE NULLIF(TRIM(p_nickname), '')
    END,
    email = CASE
      WHEN p_email IS NULL THEN email
      ELSE NULLIF(TRIM(p_email), '')
    END,
    numero_socio = CASE
      WHEN p_numero_socio IS NULL THEN numero_socio
      ELSE NULLIF(TRIM(p_numero_socio), '')
    END,
    id_app_antigua = CASE
      WHEN p_id_app_antigua IS NULL THEN id_app_antigua
      ELSE NULLIF(TRIM(p_id_app_antigua), '')
    END,
    es_coordinador = COALESCE(p_es_coordinador, es_coordinador),
    es_tesorero = COALESCE(p_es_tesorero, es_tesorero),
    es_super_admin = COALESCE(p_es_super_admin, es_super_admin),
    activo = COALESCE(p_activo, activo),
    updated_at = now()
  WHERE id = p_jugador_id;

  RETURN to_jsonb((SELECT j FROM jugadores j WHERE j.id = p_jugador_id));
END;
$$;

CREATE OR REPLACE FUNCTION get_cuotas(p_jugador_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin_o_tesorero() THEN
    RAISE EXCEPTION 'No autoritzat.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM jugadores WHERE id = p_jugador_id) THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.periodo, c.tipo), '[]'::jsonb)
    FROM cuotas c
    WHERE c.jugador_id = p_jugador_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION marcar_cuota_pagada(
  p_jugador_id uuid,
  p_tipo text,
  p_periodo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo text;
  v_periodo text;
  v_cuota cuotas%ROWTYPE;
BEGIN
  IF NOT es_admin_o_tesorero() THEN
    RAISE EXCEPTION 'No autoritzat.';
  END IF;

  v_tipo := NULLIF(TRIM(p_tipo), '');
  v_periodo := NULLIF(TRIM(p_periodo), '');

  IF v_tipo IS NULL OR v_tipo NOT IN ('anual', 'trimestral') THEN
    RAISE EXCEPTION 'Tipus de quota no vàlid.';
  END IF;

  IF v_periodo IS NULL THEN
    RAISE EXCEPTION 'El període és obligatori.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM jugadores WHERE id = p_jugador_id) THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  INSERT INTO cuotas (jugador_id, tipo, periodo, pagada, fecha_pago)
  VALUES (p_jugador_id, v_tipo, v_periodo, true, CURRENT_DATE)
  ON CONFLICT (jugador_id, tipo, periodo)
  DO UPDATE SET
    pagada = true,
    fecha_pago = CURRENT_DATE
  RETURNING * INTO v_cuota;

  RETURN to_jsonb(v_cuota);
END;
$$;

GRANT EXECUTE ON FUNCTION get_jugadores_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION crear_jugador_admin(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION editar_jugador_admin(
  uuid, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean
) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cuotas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION marcar_cuota_pagada(uuid, text, text) TO authenticated;
