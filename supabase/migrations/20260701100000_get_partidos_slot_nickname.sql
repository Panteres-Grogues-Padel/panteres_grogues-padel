-- Inclou nickname al embed jugadores de get_partidos_slot i get_partidos_generados.

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

GRANT EXECUTE ON FUNCTION get_partidos_slot(text, text) TO anon, authenticated;

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

GRANT EXECUTE ON FUNCTION get_partidos_generados(text, text) TO anon, authenticated;
