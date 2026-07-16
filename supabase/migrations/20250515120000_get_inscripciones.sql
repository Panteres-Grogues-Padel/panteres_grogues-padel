-- Lectura de inscripciones por rango de semanas vía RPC (evita caché PostgREST).
CREATE OR REPLACE FUNCTION public.get_inscripciones(p_desde date, p_hasta date)
RETURNS SETOF inscripciones
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM inscripciones
  WHERE semana >= p_desde AND semana <= p_hasta
  ORDER BY inscrito_at ASC NULLS FIRST, id ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_inscripciones(date, date) TO anon, authenticated;
