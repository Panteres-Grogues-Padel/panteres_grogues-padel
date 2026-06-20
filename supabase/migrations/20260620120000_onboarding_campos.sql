-- Onboarding ampliat: nous camps i RPC completar_onboarding

ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS pronombre text;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS documento_identidad text;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS email_contacto text;

DROP FUNCTION IF EXISTS completar_onboarding(text, text, text, text, text);

CREATE OR REPLACE FUNCTION completar_onboarding(
  p_pronombre text,
  p_nombre text,
  p_primer_apellido text,
  p_segundo_apellido text,
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

  IF v_pronombre IS NULL OR v_pronombre NOT IN ('Ell', 'Ella', 'Elle') THEN
    RAISE EXCEPTION 'El pronom és obligatori (Ell, Ella o Elle).';
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
  text, text, text, text, text, text, text, text, text, text
) TO authenticated;
