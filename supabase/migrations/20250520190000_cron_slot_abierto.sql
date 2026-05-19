-- Cron notificación "slot abierto" a las 19h (Madrid).
-- Edge Function: cron-slot-abierto

ALTER TABLE slots ADD COLUMN IF NOT EXISTS hora_cierre time;

UPDATE slots SET hora_cierre = '23:00:00'::time WHERE hora_cierre IS NULL AND activo = true;

-- Duplicados: con service_role (auth.uid() IS NULL) solo compara jugador/tipo/título/texto.
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
      AND (
        auth.uid() IS NULL
        OR n.jugador_id = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
      )
  );
$$;

GRANT EXECUTE ON FUNCTION notificacion_duplicada(uuid, varchar, varchar, text) TO anon, authenticated, service_role;

-- Slots cuya lista de semana próxima abre hoy (mismo día de la semana, 19:00 Madrid).
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

CREATE OR REPLACE FUNCTION get_jugadores_activos()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_data ORDER BY nombre), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', j.id,
      'nombre', j.nombre
    ) AS row_data,
    j.nombre
    FROM jugadores j
    WHERE j.activo = true
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_jugadores_activos() TO anon, authenticated, service_role;

-- pg_cron: ver supabase/cron_slot_abierto_schedule.sql (17:00 UTC ≈ 19:00 Madrid CEST).
