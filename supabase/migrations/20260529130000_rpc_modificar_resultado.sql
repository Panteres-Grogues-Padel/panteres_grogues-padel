-- RPC: desbloqueja un resultat validat (només coordinació)

CREATE OR REPLACE FUNCTION modificar_resultado(p_resultado_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_coordinador() THEN
    RAISE EXCEPTION 'Només coordinació pot modificar resultats validats.';
  END IF;

  UPDATE resultados
  SET
    validado_por = NULL,
    validado_at = NULL
  WHERE id = p_resultado_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resultat no trobat.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION modificar_resultado(uuid) TO authenticated;
