-- Onboarding Google OAuth: jugador pendent + perfil sense exigir activo

CREATE OR REPLACE FUNCTION crear_jugador_pendiente()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id uuid;
  v_email text;
  v_row jugadores%ROWTYPE;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'No autenticat.';
  END IF;

  SELECT j.*
  INTO v_row
  FROM jugadores j
  WHERE j.auth_id = v_auth_id
  LIMIT 1;

  IF FOUND THEN
    RETURN to_jsonb(v_row);
  END IF;

  SELECT u.email
  INTO v_email
  FROM auth.users u
  WHERE u.id = v_auth_id;

  IF NULLIF(TRIM(v_email), '') IS NULL THEN
    RAISE EXCEPTION 'Email d''usuari no trobat.';
  END IF;

  INSERT INTO jugadores (
    auth_id,
    email,
    nombre,
    nombre_completo,
    activo
  )
  VALUES (
    v_auth_id,
    NULLIF(TRIM(v_email), ''),
    '',
    '',
    false
  )
  RETURNING * INTO v_row;

  INSERT INTO ranking (jugador_id)
  VALUES (v_row.id)
  ON CONFLICT (jugador_id) DO NOTHING;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION get_mi_perfil_pendiente()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', j.id,
    'auth_id', j.auth_id,
    'nombre', j.nombre,
    'primer_apellido', j.primer_apellido,
    'segundo_apellido', j.segundo_apellido,
    'nickname', j.nickname,
    'nombre_completo', j.nombre_completo,
    'email', j.email,
    'telefono', j.telefono,
    'instagram', j.instagram,
    'foto_url', j.foto_url,
    'ocultar_telefon', COALESCE(j.ocultar_telefon, false),
    'mostrar_telefono', j.mostrar_telefono,
    'autoriza_instagram', j.autoriza_instagram,
    'es_coordinador', j.es_coordinador,
    'activo', j.activo,
    'sancionat', COALESCE(j.sancionat, false),
    'sancio_fins', j.sancio_fins,
    'fondo_hero', COALESCE(j.fondo_hero, 'bandera'),
    'partidos_jugados', COALESCE(r.partidos_jugados, 0),
    'partidos_ganados', COALESCE(r.partidos_ganados, 0),
    'juegos_jugados', COALESCE(r.juegos_jugados, 0),
    'juegos_ganados', COALESCE(r.juegos_ganados, 0),
    'eficacia', COALESCE(r.eficacia, 0),
    'penalizacion', COALESCE(r.penalizacion, 0),
    'score', COALESCE(r.score, 0)
  )
  FROM jugadores j
  LEFT JOIN ranking r ON r.jugador_id = j.id
  WHERE j.auth_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION completar_onboarding(
  p_nombre text,
  p_primer_apellido text,
  p_segundo_apellido text,
  p_nickname text,
  p_telefono text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id uuid;
  v_nombre text;
  v_primer text;
  v_segundo text;
  v_nombre_completo text;
  v_row jugadores%ROWTYPE;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'No autenticat.';
  END IF;

  v_nombre := NULLIF(TRIM(p_nombre), '');
  v_primer := NULLIF(TRIM(p_primer_apellido), '');
  v_segundo := NULLIF(TRIM(p_segundo_apellido), '');

  IF v_nombre IS NULL THEN
    RAISE EXCEPTION 'El nom és obligatori.';
  END IF;

  v_nombre_completo := TRIM(CONCAT_WS(' ', v_nombre, v_primer, v_segundo));

  UPDATE jugadores
  SET
    nombre = v_nombre,
    primer_apellido = v_primer,
    segundo_apellido = v_segundo,
    nombre_completo = v_nombre_completo,
    nickname = NULLIF(TRIM(p_nickname), ''),
    telefono = NULLIF(TRIM(p_telefono), ''),
    updated_at = now()
  WHERE auth_id = v_auth_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

GRANT EXECUTE ON FUNCTION crear_jugador_pendiente() TO authenticated;
GRANT EXECUTE ON FUNCTION get_mi_perfil_pendiente() TO authenticated;
GRANT EXECUTE ON FUNCTION completar_onboarding(text, text, text, text, text) TO authenticated;
