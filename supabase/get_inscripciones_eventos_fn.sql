-- Ejecutar en Supabase SQL Editor si la migración aún no está aplicada.
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

GRANT EXECUTE ON FUNCTION get_inscripciones_eventos(uuid) TO anon, authenticated;
