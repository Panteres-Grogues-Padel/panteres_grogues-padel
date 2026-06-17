-- Desmarcar quota pagada (tornar a pendent)

CREATE OR REPLACE FUNCTION desmarcar_cuota_pagada(
  p_jugador_id uuid,
  p_tipo text,
  p_periodo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo text;
  v_periodo text;
  v_cuota cuotas%ROWTYPE;
BEGIN
  IF NOT es_admin_o_tesorero() THEN
    RAISE EXCEPTION 'No autoritzat.';
  END IF;

  v_tipo := NULLIF(TRIM(p_tipo), '');
  v_periodo := NULLIF(TRIM(p_periodo), '');

  IF v_tipo IS NULL OR v_tipo NOT IN ('anual', 'trimestral') THEN
    RAISE EXCEPTION 'Tipus de quota no vàlid.';
  END IF;

  IF v_periodo IS NULL THEN
    RAISE EXCEPTION 'El període és obligatori.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM jugadores WHERE id = p_jugador_id) THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  UPDATE cuotas
  SET
    pagada = false,
    fecha_pago = NULL
  WHERE jugador_id = p_jugador_id
    AND tipo = v_tipo
    AND periodo = v_periodo
  RETURNING * INTO v_cuota;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quota no trobada.';
  END IF;

  RETURN to_jsonb(v_cuota);
END;
$$;

GRANT EXECUTE ON FUNCTION desmarcar_cuota_pagada(uuid, text, text) TO authenticated;
