-- Inclou resultats d'avui introduïts però sense validar (fecha pot ser avui encara que el partit fos ahir)

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
      AND r.introducido_por IS NOT NULL
      AND r.fecha <= CURRENT_DATE
  );
$$;
