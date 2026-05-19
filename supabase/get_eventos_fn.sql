-- Ejecutar en Supabase SQL Editor si la migración aún no está aplicada.
CREATE OR REPLACE FUNCTION get_eventos()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY fecha ASC),
    '[]'::jsonb
  )
  FROM (
    SELECT
      e.fecha,
      jsonb_build_object(
        'id', e.id,
        'titulo', e.titulo,
        'descripcion', e.descripcion,
        'tipo', e.tipo,
        'fecha', e.fecha,
        'fecha_fin', COALESCE(e.fecha_fin, e.fecha),
        'precio', e.precio,
        'hora', e.hora,
        'aforo_maximo', e.aforo_maximo,
        'creado_por', e.creado_por,
        'created_at', e.created_at
      ) AS row_data
    FROM eventos e
    WHERE EXISTS (
      SELECT 1 FROM jugadores me
      WHERE me.auth_id = auth.uid() AND me.activo = true
    )
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_eventos() TO anon, authenticated;
