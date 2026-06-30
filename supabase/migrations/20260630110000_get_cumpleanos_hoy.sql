-- Jugadors actius que fan anys avui (dia i mes, Europe/Madrid).

CREATE OR REPLACE FUNCTION get_cumpleanos_hoy()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH madrid AS (
    SELECT (now() AT TIME ZONE 'Europe/Madrid')::date AS hoy
  )
  SELECT COALESCE(jsonb_agg(row_data ORDER BY sort_name), '[]'::jsonb)
  FROM (
    SELECT
      jsonb_build_object(
        'id', j.id,
        'nickname', j.nickname,
        'nombre', j.nombre,
        'nombre_completo', j.nombre_completo
      ) AS row_data,
      COALESCE(NULLIF(TRIM(j.nickname), ''), j.nombre, j.nombre_completo, '') AS sort_name
    FROM jugadores j
    CROSS JOIN madrid m
    WHERE j.activo = true
      AND j.fecha_nacimiento IS NOT NULL
      AND EXTRACT(MONTH FROM j.fecha_nacimiento) = EXTRACT(MONTH FROM m.hoy)
      AND EXTRACT(DAY FROM j.fecha_nacimiento) = EXTRACT(DAY FROM m.hoy)
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_cumpleanos_hoy() TO anon, authenticated, service_role;
