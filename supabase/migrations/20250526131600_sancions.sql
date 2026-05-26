-- Sistema de sancions de jugadors.

ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS sancionat boolean DEFAULT false;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS sancio_fins date;

CREATE OR REPLACE FUNCTION get_jugadores()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', j.id,
      'nombre', j.nombre,
      'nombre_completo', j.nombre_completo,
      'nickname', j.nickname,
      'foto_url', j.foto_url,
      'sancionat', COALESCE(j.sancionat, false),
      'sancio_fins', j.sancio_fins,
      'padrino_id', j.padrino_id,
      'padrino_nombre', p.nombre
    ) AS row_data
    FROM jugadores j
    LEFT JOIN jugadores p ON p.id = j.padrino_id
    WHERE j.activo = true
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_jugadores() TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_perfil_jugador(p_jugador_id uuid)
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
    'nickname', j.nickname,
    'nombre_completo', j.nombre_completo,
    'email', j.email,
    'telefono', j.telefono,
    'instagram', j.instagram,
    'foto_url', j.foto_url,
    'mostrar_telefono', j.mostrar_telefono,
    'autoriza_instagram', j.autoriza_instagram,
    'es_coordinador', j.es_coordinador,
    'activo', j.activo,
    'sancionat', COALESCE(j.sancionat, false),
    'sancio_fins', j.sancio_fins,
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
  WHERE j.id = p_jugador_id
    AND j.activo = true;
$$;

GRANT EXECUTE ON FUNCTION get_perfil_jugador(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION get_mi_perfil_jugador()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_perfil_jugador(j.id)
  FROM jugadores j
  WHERE j.auth_id = auth.uid()
    AND j.activo = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_mi_perfil_jugador() TO authenticated;

CREATE OR REPLACE FUNCTION sancionar_jugador(p_jugador_id uuid, p_fins date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_coordinador() THEN
    RAISE EXCEPTION 'Només coordinació pot sancionar jugadors.';
  END IF;

  UPDATE jugadores
  SET sancionat = true,
      sancio_fins = p_fins
  WHERE id = p_jugador_id
    AND activo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  RETURN get_perfil_jugador(p_jugador_id);
END;
$$;

GRANT EXECUTE ON FUNCTION sancionar_jugador(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION desancionar_jugador(p_jugador_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_coordinador()
    AND NOT EXISTS (
      SELECT 1
      FROM jugadores
      WHERE id = p_jugador_id
        AND auth_id = auth.uid()
        AND sancio_fins < CURRENT_DATE
    )
  THEN
    RAISE EXCEPTION 'Només coordinació pot treure sancions vigents.';
  END IF;

  UPDATE jugadores
  SET sancionat = false,
      sancio_fins = NULL
  WHERE id = p_jugador_id
    AND activo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  RETURN get_perfil_jugador(p_jugador_id);
END;
$$;

GRANT EXECUTE ON FUNCTION desancionar_jugador(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION get_ranking()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY score_ord DESC),
    '[]'::jsonb
  )
  FROM (
    SELECT
      r.score AS score_ord,
      jsonb_build_object(
        'jugador_id', r.jugador_id,
        'nombre', j.nombre,
        'nickname', j.nickname,
        'nombre_completo', j.nombre_completo,
        'partidos_jugados', r.partidos_jugados,
        'partidos_ganados', r.partidos_ganados,
        'juegos_jugados', r.juegos_jugados,
        'juegos_ganados', r.juegos_ganados,
        'eficacia', r.eficacia,
        'penalizacion', r.penalizacion,
        'score', r.score,
        'jugadores', jsonb_build_object(
          'id', j.id,
          'nombre', j.nombre,
          'nickname', j.nickname,
          'nombre_completo', j.nombre_completo,
          'telefono', j.telefono,
          'instagram', j.instagram,
          'foto_url', j.foto_url,
          'mostrar_telefono', j.mostrar_telefono,
          'autoriza_instagram', j.autoriza_instagram,
          'sancionat', COALESCE(j.sancionat, false),
          'sancio_fins', j.sancio_fins
        )
      ) AS row_data
    FROM ranking r
    INNER JOIN jugadores j ON j.id = r.jugador_id
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_ranking() TO anon, authenticated;
