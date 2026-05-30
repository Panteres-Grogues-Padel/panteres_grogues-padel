-- actualizar_perfil_jugador: sincronitza ocultar_telefon i mostrar_telefono (legacy)

CREATE OR REPLACE FUNCTION actualizar_perfil_jugador(
  p_jugador_id uuid,
  p_telefon text,
  p_instagram text,
  p_ocultar_telefon boolean,
  p_nickname text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM jugadores
    WHERE id = p_jugador_id
      AND auth_id = auth.uid()
      AND activo = true
  ) THEN
    RAISE EXCEPTION 'No autoritzat per actualitzar aquest perfil.';
  END IF;

  UPDATE jugadores
  SET
    nickname = NULLIF(TRIM(p_nickname), ''),
    telefono = NULLIF(TRIM(p_telefon), ''),
    instagram = NULLIF(regexp_replace(TRIM(COALESCE(p_instagram, '')), '^@+', ''), ''),
    ocultar_telefon = COALESCE(p_ocultar_telefon, false),
    mostrar_telefono = NOT COALESCE(p_ocultar_telefon, false)
  WHERE id = p_jugador_id;

  RETURN get_perfil_jugador(p_jugador_id);
END;
$$;

GRANT EXECUTE ON FUNCTION actualizar_perfil_jugador(uuid, text, text, boolean, text) TO authenticated;
