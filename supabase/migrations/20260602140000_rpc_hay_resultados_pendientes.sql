-- Bloqueig generació de partits si hi ha resultats sense validar de dies anteriors

CREATE OR REPLACE FUNCTION hay_resultados_pendientes()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM resultados r
    WHERE r.validado_por IS NULL
      AND r.validado_at IS NULL
      AND r.fecha < CURRENT_DATE
  );
$$;

GRANT EXECUTE ON FUNCTION hay_resultados_pendientes() TO authenticated;
