-- sancionar_jugador: baixa automàtica d'inscripcions + notificació a coordinadors

CREATE OR REPLACE FUNCTION sancionar_jugador(p_jugador_id uuid, p_fins date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nickname text;
  v_texto text;
BEGIN
  IF NOT es_coordinador() THEN
    RAISE EXCEPTION 'Només coordinació pot sancionar jugadors.';
  END IF;

  UPDATE jugadores
  SET sancionat = true,
      sancio_fins = p_fins
  WHERE id = p_jugador_id
    AND activo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  -- Baixa automàtica: inscripcions amb data de partit dins el període de sanció (semana + dia_semana del slot)
  DELETE FROM inscripciones i
  USING slots s
  WHERE i.jugador_id = p_jugador_id
    AND i.slot_id = s.id
    AND (i.semana + s.dia_semana) >= CURRENT_DATE
    AND (i.semana + s.dia_semana) <= p_fins;

  SELECT COALESCE(NULLIF(TRIM(nickname), ''), nombre)
  INTO v_nickname
  FROM jugadores
  WHERE id = p_jugador_id;

  v_texto := 'El jugador ' || COALESCE(v_nickname, 'desconegut')
    || ' ha estat sancionat i donat de baixa dels slots. Regenera els partits si cal.';

  INSERT INTO notificaciones (jugador_id, tipo, titulo, texto, data)
  SELECT
    j.id,
    'jugador_sancionat',
    'Jugador sancionat',
    v_texto,
    '{"tab":"partidos"}'::jsonb
  FROM jugadores j
  WHERE j.es_coordinador = true
    AND j.activo = true;

  RETURN get_perfil_jugador(p_jugador_id);
END;
$$;

GRANT EXECUTE ON FUNCTION sancionar_jugador(uuid, date) TO authenticated;
