-- Històric complet de resultats (coordinador o super admin).

CREATE OR REPLACE FUNCTION get_resultados_historico()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (es_coordinador() OR es_super_admin()) THEN
    RAISE EXCEPTION 'No autoritzat.';
  END IF;

  RETURN (
    SELECT COALESCE(jsonb_agg(row_data ORDER BY fecha_ord DESC, pista_ord ASC), '[]'::jsonb)
    FROM (
      SELECT
        r.fecha AS fecha_ord,
        pp.numero_pista AS pista_ord,
        jsonb_build_object(
          'fecha', r.fecha::text,
          'pista', pp.numero_pista,
          'jugador_1', COALESCE(NULLIF(TRIM(j1.nickname), ''), j1.nombre, j1.nombre_completo, ''),
          'jugador_2', COALESCE(NULLIF(TRIM(j2.nickname), ''), j2.nombre, j2.nombre_completo, ''),
          'jugador_3', COALESCE(NULLIF(TRIM(j3.nickname), ''), j3.nombre, j3.nombre_completo, ''),
          'jugador_4', COALESCE(NULLIF(TRIM(j4.nickname), ''), j4.nombre, j4.nombre_completo, ''),
          'set1', r.set1_p1::text || '-' || r.set1_p2::text,
          'set2', r.set2_p1::text || '-' || r.set2_p2::text,
          'set3', r.set3_p1::text || '-' || r.set3_p2::text,
          'introducido_por', COALESCE(NULLIF(TRIM(ji.nickname), ''), ji.nombre, ji.nombre_completo, ''),
          'validado_por', COALESCE(NULLIF(TRIM(jv.nickname), ''), jv.nombre, jv.nombre_completo, ''),
          'validado_el', CASE
            WHEN r.validado_at IS NULL THEN ''
            ELSE to_char(r.validado_at AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD HH24:MI')
          END
        ) AS row_data
      FROM resultados r
      JOIN pistas_partido pp ON pp.id = r.pista_id
      LEFT JOIN jugadores_pista jp1 ON jp1.pista_id = r.pista_id AND jp1.posicion = 1
      LEFT JOIN jugadores j1 ON j1.id = jp1.jugador_id
      LEFT JOIN jugadores_pista jp2 ON jp2.pista_id = r.pista_id AND jp2.posicion = 2
      LEFT JOIN jugadores j2 ON j2.id = jp2.jugador_id
      LEFT JOIN jugadores_pista jp3 ON jp3.pista_id = r.pista_id AND jp3.posicion = 3
      LEFT JOIN jugadores j3 ON j3.id = jp3.jugador_id
      LEFT JOIN jugadores_pista jp4 ON jp4.pista_id = r.pista_id AND jp4.posicion = 4
      LEFT JOIN jugadores j4 ON j4.id = jp4.jugador_id
      LEFT JOIN jugadores ji ON ji.id = r.introducido_por
      LEFT JOIN jugadores jv ON jv.id = r.validado_por
    ) sub
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_resultados_historico() TO authenticated;
