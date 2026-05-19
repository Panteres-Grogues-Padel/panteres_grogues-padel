-- Sistema padrinos/madrinas.
ALTER TABLE jugadores
  ADD COLUMN IF NOT EXISTS padrino_id uuid REFERENCES jugadores(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION get_jugadores()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  FROM (
    SELECT       jsonb_build_object(
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

CREATE OR REPLACE FUNCTION asignar_padrino(p_ahijado_id uuid, p_padrino_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE jugadores SET padrino_id = p_padrino_id WHERE id = p_ahijado_id;
$$;

GRANT EXECUTE ON FUNCTION asignar_padrino(uuid, uuid) TO authenticated;
