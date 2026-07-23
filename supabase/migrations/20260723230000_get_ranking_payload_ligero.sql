-- get_ranking: només camps de la llista (id, nom visible, stats).
-- El perfil complet es carrega amb get_perfil_jugador en obrir PerfilJugador.

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
        'nickname', COALESCE(NULLIF(TRIM(j.nickname), ''), j.nombre),
        'partidos_jugados', r.partidos_jugados,
        'partidos_ganados', r.partidos_ganados,
        'juegos_jugados', r.juegos_jugados,
        'juegos_ganados', r.juegos_ganados,
        'eficacia', r.eficacia,
        'penalizacion', r.penalizacion,
        'score', r.score
      ) AS row_data
    FROM ranking r
    INNER JOIN jugadores j ON j.id = r.jugador_id
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_ranking() TO anon, authenticated;
