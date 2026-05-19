-- Rango de fechas en eventos y RPC para marcar pago (coordinador).
ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS fecha_fin date;

UPDATE eventos SET fecha_fin = fecha WHERE fecha_fin IS NULL;

CREATE OR REPLACE FUNCTION get_eventos()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(row_data ORDER BY fecha ASC),
    '[]'::jsonb
  )
  FROM (
    SELECT
      e.fecha,
      jsonb_build_object(
        'id', e.id,
        'titulo', e.titulo,
        'descripcion', e.descripcion,
        'tipo', e.tipo,
        'fecha', e.fecha,
        'fecha_fin', COALESCE(e.fecha_fin, e.fecha),
        'precio', e.precio,
        'hora', e.hora,
        'aforo_maximo', e.aforo_maximo,
        'creado_por', e.creado_por,
        'created_at', e.created_at
      ) AS row_data
    FROM eventos e
    WHERE EXISTS (
      SELECT 1 FROM jugadores me
      WHERE me.auth_id = auth.uid() AND me.activo = true
    )
  ) sub;
$$;

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
