-- Històric de resultats per jugador (coordinador o super admin).
-- Cada partit de pista genera 4 files (posicions 1-4) amb marcador individual per set (americano).

DROP FUNCTION IF EXISTS get_resultados_historico();

CREATE OR REPLACE FUNCTION get_resultados_historico(p_fecha date DEFAULT NULL)
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
    SELECT COALESCE(jsonb_agg(row_data ORDER BY fecha_ord DESC, pista_ord ASC, posicion_ord ASC), '[]'::jsonb)
    FROM (
      SELECT
        r.fecha AS fecha_ord,
        pp.numero_pista AS pista_ord,
        jp.posicion AS posicion_ord,
        jsonb_build_object(
          'fecha', r.fecha::text,
          'pista', pp.numero_pista::text,
          'jugador', COALESCE(NULLIF(TRIM(j.nickname), ''), j.nombre, j.nombre_completo, ''),
          'set1', CASE
            WHEN jp.posicion IN (1, 4) THEN r.set1_p1::text || '-' || r.set1_p2::text
            WHEN jp.posicion IN (2, 3) THEN r.set1_p2::text || '-' || r.set1_p1::text
            ELSE ''
          END,
          'set2', CASE
            WHEN jp.posicion IN (1, 3) THEN r.set2_p1::text || '-' || r.set2_p2::text
            WHEN jp.posicion IN (2, 4) THEN r.set2_p2::text || '-' || r.set2_p1::text
            ELSE ''
          END,
          'set3', CASE
            WHEN jp.posicion IN (1, 2) THEN r.set3_p1::text || '-' || r.set3_p2::text
            WHEN jp.posicion IN (3, 4) THEN r.set3_p2::text || '-' || r.set3_p1::text
            ELSE ''
          END,
          'introducido_por', COALESCE(NULLIF(TRIM(ji.nickname), ''), ji.nombre, ji.nombre_completo, ''),
          'validado_por', COALESCE(NULLIF(TRIM(jv.nickname), ''), jv.nombre, jv.nombre_completo, ''),
          'validado_el', CASE
            WHEN r.validado_at IS NULL THEN ''
            ELSE to_char(r.validado_at AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD HH24:MI')
          END
        ) AS row_data
      FROM resultados r
      JOIN pistas_partido pp ON pp.id = r.pista_id
      JOIN jugadores_pista jp ON jp.pista_id = r.pista_id
      JOIN jugadores j ON j.id = jp.jugador_id
      LEFT JOIN jugadores ji ON ji.id = r.introducido_por
      LEFT JOIN jugadores jv ON jv.id = r.validado_por
      WHERE p_fecha IS NULL OR r.fecha = p_fecha
    ) sub
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_resultados_historico(date) TO authenticated;
