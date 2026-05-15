-- Lectura de resultados por pista_ids vía RPC (evita caché PostgREST del SELECT directo).
CREATE OR REPLACE FUNCTION get_resultados(p_pista_ids uuid[])
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY fecha_ord DESC),
    '[]'::jsonb
  )
  FROM (
    SELECT
      r.fecha AS fecha_ord,
      jsonb_build_object(
        'id', r.id,
        'pista_id', r.pista_id,
        'fecha', r.fecha,
        'set1_p1', r.set1_p1,
        'set1_p2', r.set1_p2,
        'set2_p1', r.set2_p1,
        'set2_p2', r.set2_p2,
        'set3_p1', r.set3_p1,
        'set3_p2', r.set3_p2,
        'introducido_por', r.introducido_por,
        'validado_por', r.validado_por
      ) AS row_data
    FROM resultados r
    WHERE p_pista_ids IS NOT NULL
      AND cardinality(p_pista_ids) > 0
      AND r.pista_id = ANY (p_pista_ids)
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_resultados(uuid[]) TO anon, authenticated;
