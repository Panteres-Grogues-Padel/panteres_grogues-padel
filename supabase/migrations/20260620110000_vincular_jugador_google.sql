-- Vincular compte Google amb jugador existent (email sense auth_id)

CREATE OR REPLACE FUNCTION vincular_jugador_existente()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_id uuid;
  v_email text;
  v_jugador_id uuid;
BEGIN
  v_auth_id := auth.uid();
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'No autenticat.';
  END IF;

  SELECT u.email
  INTO v_email
  FROM auth.users u
  WHERE u.id = v_auth_id;

  IF NULLIF(TRIM(v_email), '') IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT j.id
  INTO v_jugador_id
  FROM jugadores j
  WHERE LOWER(TRIM(j.email)) = LOWER(TRIM(v_email))
    AND j.auth_id IS NULL
  LIMIT 1;

  IF v_jugador_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE jugadores
  SET
    auth_id = v_auth_id,
    updated_at = now()
  WHERE id = v_jugador_id;

  RETURN (
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
    WHERE j.id = v_jugador_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION vincular_jugador_existente() TO authenticated;
