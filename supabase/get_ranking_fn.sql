-- Lectura del ranking vía RPC (evita caché PostgREST del SELECT directo).
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
          'autoriza_instagram', j.autoriza_instagram
        )
      ) AS row_data
    FROM ranking r
    INNER JOIN jugadores j ON j.id = r.jugador_id
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_ranking() TO anon, authenticated;
