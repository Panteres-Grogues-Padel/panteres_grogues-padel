-- RPC: assignar número de pista (només coordinació)
-- Columna pistas_partido.numero_pista ja existeix (smallint NOT NULL).

CREATE OR REPLACE FUNCTION asignar_numero_pista(p_pista_id uuid, p_numero_pista smallint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_coordinador() THEN
    RAISE EXCEPTION 'Només coordinació pot assignar el número de pista.';
  END IF;

  IF p_numero_pista IS NULL OR p_numero_pista < 1 THEN
    RAISE EXCEPTION 'El número de pista ha de ser com a mínim 1.';
  END IF;

  UPDATE pistas_partido
  SET numero_pista = p_numero_pista
  WHERE id = p_pista_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pista de partit no trobada.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION asignar_numero_pista(uuid, smallint) TO authenticated;
