-- editar_jugador_admin: camps onboarding (pronombre, document, email contacte)

DROP FUNCTION IF EXISTS editar_jugador_admin(
  uuid, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean
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
  uuid, text, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, boolean
) TO authenticated;
