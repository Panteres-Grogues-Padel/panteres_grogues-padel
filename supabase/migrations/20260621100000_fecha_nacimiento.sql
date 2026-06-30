-- Data de naixement: onboarding + edició admin

ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS fecha_nacimiento date;

DROP FUNCTION IF EXISTS completar_onboarding(
  text, text, text, text, text, text, text, text, text, text
);

CREATE OR REPLACE FUNCTION completar_onboarding(
  p_pronombre text,
  p_nombre text,
  p_primer_apellido text,
  p_segundo_apellido text,
  p_fecha_nacimiento text,
  p_nickname text,
  p_numero_socio text,
  p_id_app_antigua text,
  p_documento_identidad text,
  p_email_contacto text,
  p_telefono text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id uuid;
  v_pronombre text;
  v_nombre text;
  v_primer text;
  v_segundo text;
  v_fecha_nacimiento date;
  v_nickname text;
  v_numero_socio text;
  v_id_app_antigua text;
  v_documento text;
  v_email_contacto text;
  v_telefono text;
  v_nombre_completo text;
  v_row jugadores%ROWTYPE;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'No autenticat.';
  END IF;

  v_pronombre := NULLIF(TRIM(p_pronombre), '');
  v_nombre := NULLIF(TRIM(p_nombre), '');
  v_primer := NULLIF(TRIM(p_primer_apellido), '');
  v_segundo := NULLIF(TRIM(p_segundo_apellido), '');
  v_nickname := NULLIF(TRIM(p_nickname), '');
  v_numero_socio := NULLIF(TRIM(p_numero_socio), '');
  v_id_app_antigua := NULLIF(TRIM(p_id_app_antigua), '');
  v_documento := NULLIF(TRIM(p_documento_identidad), '');
  v_email_contacto := NULLIF(TRIM(p_email_contacto), '');
  v_telefono := NULLIF(TRIM(p_telefono), '');

  IF NULLIF(TRIM(p_fecha_nacimiento), '') IS NULL THEN
    RAISE EXCEPTION 'La data de naixement és obligatòria.';
  END IF;

  BEGIN
    v_fecha_nacimiento := TRIM(p_fecha_nacimiento)::date;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'La data de naixement no és vàlida.';
  END;

  IF v_pronombre IS NULL OR v_pronombre NOT IN ('Ell', 'Ella', 'Elle', 'Altre', 'Prefereixo no dir-ho') THEN
    RAISE EXCEPTION 'El pronom és obligatori.';
  END IF;

  IF v_nombre IS NULL THEN
    RAISE EXCEPTION 'El nom és obligatori.';
  END IF;

  IF v_primer IS NULL THEN
    RAISE EXCEPTION 'El primer cognom és obligatori.';
  END IF;

  IF v_segundo IS NULL THEN
    RAISE EXCEPTION 'El segon cognom és obligatori.';
  END IF;

  IF v_nickname IS NULL THEN
    RAISE EXCEPTION 'El nickname és obligatori.';
  END IF;

  IF v_numero_socio IS NULL THEN
    RAISE EXCEPTION 'El número de soci és obligatori.';
  END IF;

  IF v_id_app_antigua IS NULL THEN
    RAISE EXCEPTION 'L''ID app antiga és obligatori.';
  END IF;

  IF v_documento IS NULL THEN
    RAISE EXCEPTION 'El document d''identitat és obligatori.';
  END IF;

  IF v_email_contacto IS NULL THEN
    RAISE EXCEPTION 'L''email de contacte és obligatori.';
  END IF;

  IF v_telefono IS NULL THEN
    RAISE EXCEPTION 'El telèfon de contacte és obligatori.';
  END IF;

  v_nombre_completo := TRIM(CONCAT_WS(' ', v_nombre, v_primer, v_segundo));

  UPDATE jugadores
  SET
    pronombre = v_pronombre,
    nombre = v_nombre,
    primer_apellido = v_primer,
    segundo_apellido = v_segundo,
    fecha_nacimiento = v_fecha_nacimiento,
    nombre_completo = v_nombre_completo,
    nickname = v_nickname,
    numero_socio = v_numero_socio,
    id_app_antigua = v_id_app_antigua,
    documento_identidad = v_documento,
    email_contacto = v_email_contacto,
    telefono = v_telefono,
    updated_at = now()
  WHERE auth_id = v_auth_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION completar_onboarding(
  text, text, text, text, text, text, text, text, text, text, text
) TO authenticated;

DROP FUNCTION IF EXISTS editar_jugador_admin(
  uuid, text, text, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean
);

CREATE OR REPLACE FUNCTION editar_jugador_admin(
  p_jugador_id uuid,
  p_nombre text DEFAULT NULL,
  p_primer_apellido text DEFAULT NULL,
  p_segundo_apellido text DEFAULT NULL,
  p_nickname text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_numero_socio text DEFAULT NULL,
  p_id_app_antigua text DEFAULT NULL,
  p_pronombre text DEFAULT NULL,
  p_documento_identidad text DEFAULT NULL,
  p_email_contacto text DEFAULT NULL,
  p_telefono text DEFAULT NULL,
  p_fecha_nacimiento text DEFAULT NULL,
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
  v_fecha_nacimiento date;
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

  IF p_fecha_nacimiento IS NULL THEN
    v_fecha_nacimiento := v_row.fecha_nacimiento;
  ELSIF NULLIF(TRIM(p_fecha_nacimiento), '') IS NULL THEN
    v_fecha_nacimiento := NULL;
  ELSE
    BEGIN
      v_fecha_nacimiento := TRIM(p_fecha_nacimiento)::date;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'La data de naixement no és vàlida.';
    END;
  END IF;

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
    pronombre = CASE
      WHEN p_pronombre IS NULL THEN pronombre
      ELSE NULLIF(TRIM(p_pronombre), '')
    END,
    documento_identidad = CASE
      WHEN p_documento_identidad IS NULL THEN documento_identidad
      ELSE NULLIF(TRIM(p_documento_identidad), '')
    END,
    email_contacto = CASE
      WHEN p_email_contacto IS NULL THEN email_contacto
      ELSE NULLIF(TRIM(p_email_contacto), '')
    END,
    telefono = CASE
      WHEN p_telefono IS NULL THEN telefono
      ELSE NULLIF(TRIM(p_telefono), '')
    END,
    fecha_nacimiento = v_fecha_nacimiento,
    es_coordinador = COALESCE(p_es_coordinador, es_coordinador),
    es_tesorero = COALESCE(p_es_tesorero, es_tesorero),
    es_super_admin = COALESCE(p_es_super_admin, es_super_admin),
    activo = COALESCE(p_activo, activo),
    updated_at = now()
  WHERE id = p_jugador_id;

  RETURN to_jsonb((SELECT j FROM jugadores j WHERE j.id = p_jugador_id));
END;
$$;

GRANT EXECUTE ON FUNCTION editar_jugador_admin(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean
) TO authenticated;
