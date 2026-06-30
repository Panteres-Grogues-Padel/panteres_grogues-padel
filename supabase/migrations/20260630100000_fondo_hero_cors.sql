-- Tercer fons del hero: cors (mosaic cor MUSE)

ALTER TABLE jugadores
  DROP CONSTRAINT IF EXISTS jugadores_fondo_hero_check;

ALTER TABLE jugadores
  ADD CONSTRAINT jugadores_fondo_hero_check CHECK (fondo_hero IN ('bandera', 'blau', 'cors'));

CREATE OR REPLACE FUNCTION actualizar_perfil_jugador(
  p_jugador_id uuid,
  p_telefon text,
  p_instagram text,
  p_ocultar_telefon boolean,
  p_nickname text,
  p_fondo_hero text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fondo_hero text;
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

  v_fondo_hero := NULLIF(TRIM(COALESCE(p_fondo_hero, '')), '');
  IF v_fondo_hero IS NOT NULL AND v_fondo_hero NOT IN ('bandera', 'blau', 'cors') THEN
    RAISE EXCEPTION 'Valor de fondo_hero no vàlid.';
  END IF;

  UPDATE jugadores
  SET
    nickname = NULLIF(TRIM(p_nickname), ''),
    telefono = NULLIF(TRIM(p_telefon), ''),
    instagram = NULLIF(regexp_replace(TRIM(COALESCE(p_instagram, '')), '^@+', ''), ''),
    ocultar_telefon = COALESCE(p_ocultar_telefon, false),
    mostrar_telefono = NOT COALESCE(p_ocultar_telefon, false),
    fondo_hero = COALESCE(v_fondo_hero, fondo_hero)
  WHERE id = p_jugador_id;

  RETURN get_perfil_jugador(p_jugador_id);
END;
$$;

GRANT EXECUTE ON FUNCTION actualizar_perfil_jugador(uuid, text, text, boolean, text, text) TO authenticated;
