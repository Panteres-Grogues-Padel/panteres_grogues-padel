-- RPC get_notificaciones + política INSERT para coordinadores (notificar a jugadores).
CREATE OR REPLACE FUNCTION get_notificaciones(p_jugador_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY created_at DESC),
    '[]'::jsonb
  )
  FROM (
    SELECT
      n.created_at,
      jsonb_build_object(
        'id', n.id,
        'jugador_id', n.jugador_id,
        'tipo', n.tipo,
        'titulo', n.titulo,
        'texto', n.texto,
        'leida', n.leida,
        'created_at', n.created_at
      ) AS row_data
    FROM notificaciones n
    WHERE n.jugador_id = p_jugador_id
      AND n.jugador_id = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_notificaciones(uuid) TO anon, authenticated;

CREATE POLICY "Coordinador inserta notificaciones" ON notificaciones
  FOR INSERT
  WITH CHECK (es_coordinador());
