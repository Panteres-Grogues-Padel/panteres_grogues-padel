-- Coordinador: editar nickname de cualquier jugador.

CREATE OR REPLACE FUNCTION actualizar_nickname_jugador(
  p_jugador_id uuid,
  p_nickname text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nickname text := NULLIF(TRIM(COALESCE(p_nickname, '')), '');
BEGIN
  IF NOT es_coordinador() THEN
    RAISE EXCEPTION 'No autoritzat per actualitzar nickname.';
  END IF;

  UPDATE jugadores
  SET nickname = v_nickname
  WHERE id = p_jugador_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'jugador_id', p_jugador_id,
    'nickname', v_nickname
  );
END;
$$;

GRANT EXECUTE ON FUNCTION actualizar_nickname_jugador(uuid, text) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'jugadores'
      AND policyname = 'Coordinadores pueden actualizar jugadores'
  ) THEN
    CREATE POLICY "Coordinadores pueden actualizar jugadores"
      ON jugadores
      FOR UPDATE
      USING (es_coordinador())
      WITH CHECK (true);
  END IF;
END
$$;
