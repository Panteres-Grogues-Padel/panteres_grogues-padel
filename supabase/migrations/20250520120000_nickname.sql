-- Nickname opcional en jugadores.
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS nickname text;

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
      'padrino_id', j.padrino_id,
      'padrino_nombre', p.nombre
    ) AS row_data
    FROM jugadores j
    LEFT JOIN jugadores p ON p.id = j.padrino_id
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_jugadores() TO anon, authenticated;

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

-- Partidos: incluir nickname en embed jugadores.
CREATE OR REPLACE FUNCTION get_partidos_slot(p_slot_id text, p_semana text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(row_data),
    '[]'::jsonb
  )
  FROM (
    SELECT jsonb_build_object(
      'id', pg.id,
      'slot_id', pg.slot_id,
      'semana', pg.semana,
      'num_pistas', pg.num_pistas,
      'num_indoor', pg.num_indoor,
      'pistas_partido', (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', pp.id,
              'numero_pista', pp.numero_pista,
              'hora', pp.hora,
              'es_indoor', pp.es_indoor,
              'jugadores_pista', (
                SELECT COALESCE(
                  jsonb_agg(
                    jsonb_build_object(
                      'id', jp.id,
                      'jugador_id', jp.jugador_id,
                      'posicion', jp.posicion,
                      'confirmado', jp.confirmado,
                      'jugadores', jsonb_build_object(
                        'nombre', j.nombre,
                        'nickname', j.nickname,
                        'nombre_completo', j.nombre_completo
                      )
                    )
                    ORDER BY jp.posicion
                  ),
                  '[]'::jsonb
                )
                FROM jugadores_pista jp
                JOIN jugadores j ON j.id = jp.jugador_id
                WHERE jp.pista_id = pp.id
              )
            )
            ORDER BY pp.numero_pista
          ),
          '[]'::jsonb
        )
        FROM pistas_partido pp
        WHERE pp.partido_generado_id = pg.id
      ),
      'slots', jsonb_build_object(
        'label', s.label,
        'club', s.club,
        'dia_semana', s.dia_semana
      )
    ) AS row_data
    FROM partidos_generados pg
    JOIN slots s ON s.id = pg.slot_id
    WHERE pg.slot_id = p_slot_id
      AND pg.semana = p_semana::date
  ) sub;
$$;

CREATE OR REPLACE FUNCTION get_partidos_generados(p_slot_id text DEFAULT NULL, p_semana text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY semana_ord DESC),
    '[]'::jsonb
  )
  FROM (
    SELECT
      pg.semana AS semana_ord,
      jsonb_build_object(
        'id', pg.id,
        'slot_id', pg.slot_id,
        'semana', pg.semana,
        'num_pistas', pg.num_pistas,
        'num_indoor', pg.num_indoor,
        'pistas_partido', (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'id', pp.id,
                'numero_pista', pp.numero_pista,
                'hora', pp.hora,
                'es_indoor', pp.es_indoor,
                'jugadores_pista', (
                  SELECT COALESCE(
                    jsonb_agg(
                      jsonb_build_object(
                        'id', jp.id,
                        'jugador_id', jp.jugador_id,
                        'posicion', jp.posicion,
                        'confirmado', jp.confirmado,
                        'jugadores', jsonb_build_object(
                          'nombre', j.nombre,
                          'nickname', j.nickname,
                          'nombre_completo', j.nombre_completo
                        )
                      )
                      ORDER BY jp.posicion
                    ),
                    '[]'::jsonb
                  )
                  FROM jugadores_pista jp
                  JOIN jugadores j ON j.id = jp.jugador_id
                  WHERE jp.pista_id = pp.id
                )
              )
              ORDER BY pp.numero_pista
            ),
            '[]'::jsonb
          )
          FROM pistas_partido pp
          WHERE pp.partido_generado_id = pg.id
        ),
        'slots', jsonb_build_object(
          'label', s.label,
          'club', s.club,
          'dia_semana', s.dia_semana
        )
      ) AS row_data
    FROM partidos_generados pg
    JOIN slots s ON s.id = pg.slot_id
    WHERE (p_slot_id IS NULL OR pg.slot_id = p_slot_id)
      AND (p_semana IS NULL OR pg.semana = p_semana::date)
  ) sub;
$$;

CREATE OR REPLACE FUNCTION get_inscripciones_eventos(p_evento_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY inscrito_at ASC),
    '[]'::jsonb
  )
  FROM (
    SELECT
      ie.inscrito_at,
      jsonb_build_object(
        'id', ie.id,
        'evento_id', ie.evento_id,
        'jugador_id', ie.jugador_id,
        'pareja', ie.pareja,
        'pago_confirmado', ie.pago_confirmado,
        'inscrito_at', ie.inscrito_at,
        'nombre', j.nombre,
        'nickname', j.nickname,
        'nombre_completo', j.nombre_completo
      ) AS row_data
    FROM inscripciones_eventos ie
    INNER JOIN jugadores j ON j.id = ie.jugador_id
    WHERE EXISTS (
      SELECT 1 FROM jugadores me
      WHERE me.auth_id = auth.uid() AND me.activo = true
    )
      AND (p_evento_id IS NULL OR ie.evento_id = p_evento_id)
  ) sub;
$$;
