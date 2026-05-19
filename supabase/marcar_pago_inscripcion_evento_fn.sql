-- Ejecutar en Supabase SQL Editor si la migración aún no está aplicada.
CREATE OR REPLACE FUNCTION marcar_pago_inscripcion_evento(p_inscripcion_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coord uuid;
  v_updated uuid;
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
    pago_confirmado = true,
    pago_confirmado_por = v_coord,
    pago_confirmado_at = now()
  WHERE id = p_inscripcion_id
  RETURNING id INTO v_updated;

  IF v_updated IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Inscripción no encontrada.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', v_updated);
END;
$$;

GRANT EXECUTE ON FUNCTION marcar_pago_inscripcion_evento(uuid) TO authenticated;
