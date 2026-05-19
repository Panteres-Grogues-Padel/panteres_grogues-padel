-- Ejecutar en SQL Editor si la migración aún no está aplicada.
CREATE OR REPLACE FUNCTION get_slots_apertura_hoy()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH madrid AS (
    SELECT (now() AT TIME ZONE 'Europe/Madrid') AS ts
  ),
  dow AS (
    SELECT CASE EXTRACT(DOW FROM ts)::int
      WHEN 0 THEN 6
      ELSE EXTRACT(DOW FROM ts)::int - 1
    END AS dia
    FROM madrid
  )
  SELECT COALESCE(jsonb_agg(row_data ORDER BY nombre), '[]'::jsonb)
  FROM (
    SELECT
      trim(both ' ·' FROM COALESCE(s.label, '') || CASE
        WHEN s.club IS NOT NULL AND s.club <> '' THEN ' · ' || s.club
        ELSE ''
      END) AS nombre,
      jsonb_build_object(
        'id', s.id,
        'label', s.label,
        'club', s.club,
        'nombre', trim(both ' ·' FROM COALESCE(s.label, '') || CASE
          WHEN s.club IS NOT NULL AND s.club <> '' THEN ' · ' || s.club
          ELSE ''
        END)
      ) AS row_data
    FROM slots s
    CROSS JOIN dow d
    WHERE s.activo = true
      AND s.dia_semana = d.dia
      AND s.hora_cierre IS NOT NULL
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_slots_apertura_hoy() TO anon, authenticated, service_role;
