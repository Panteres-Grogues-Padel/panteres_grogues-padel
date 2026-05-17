-- Comprueba si ya existe una notificación idéntica (evita duplicados sin SELECT directo en cliente).
CREATE OR REPLACE FUNCTION notificacion_duplicada(
  p_jugador_id uuid,
  p_tipo varchar,
  p_titulo varchar,
  p_texto text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM notificaciones n
    WHERE n.jugador_id = p_jugador_id
      AND n.tipo = p_tipo
      AND n.titulo = p_titulo
      AND n.texto = p_texto
      AND n.jugador_id = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION notificacion_duplicada(uuid, varchar, varchar, text) TO anon, authenticated;
