-- RPC: assignar hora a una pista de partit (només coordinació)

CREATE OR REPLACE FUNCTION asignar_hora_partido(p_pista_id uuid, p_hora text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_coordinador() THEN
    RAISE EXCEPTION 'Només coordinació pot assignar l''hora del partit.';
  END IF;

  UPDATE pistas_partido
  SET hora = NULLIF(TRIM(p_hora), '')::time
  WHERE id = p_pista_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pista de partit no trobada.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION asignar_hora_partido(uuid, text) TO authenticated;
