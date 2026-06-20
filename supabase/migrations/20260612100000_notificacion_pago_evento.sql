-- Notificació al jugador quan el coordinador confirma el pagament d'un esdeveniment

DROP FUNCTION IF EXISTS marcar_pago_inscripcion_evento(uuid, boolean);

CREATE OR REPLACE FUNCTION marcar_pago_inscripcion_evento(
  p_inscripcion_id uuid,
  p_pagado boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coord uuid;
  v_row inscripciones_eventos%ROWTYPE;
BEGIN
  IF NOT es_coordinador() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo coordinación.');
  END IF;

  SELECT id INTO v_coord FROM jugadores WHERE auth_id = auth.uid() LIMIT 1;
  IF v_coord IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Perfil de coordinador no encontrado.');
  END IF;

  UPDATE inscripciones_eventos
  SET
    pago_confirmado = p_pagado,
    pago_confirmado_por = CASE WHEN p_pagado THEN v_coord ELSE NULL END,
    pago_confirmado_at = CASE WHEN p_pagado THEN now() ELSE NULL END
  WHERE id = p_inscripcion_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inscripción no encontrada.');
  END IF;

  IF p_pagado THEN
    INSERT INTO notificaciones (jugador_id, tipo, titulo, texto, data)
    VALUES (
      v_row.jugador_id,
      'pago_confirmat',
      'Pagament confirmat',
      'El coordinador ha confirmat el teu pagament de l''activitat.',
      '{}'::jsonb
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_row.id, 'pago_confirmado', p_pagado);
END;
$$;

GRANT EXECUTE ON FUNCTION marcar_pago_inscripcion_evento(uuid, boolean) TO authenticated;
