-- Fons del hero/banner personalitzable per jugador

ALTER TABLE jugadores
  ADD COLUMN IF NOT EXISTS fondo_hero text NOT NULL DEFAULT 'bandera';

ALTER TABLE jugadores
  DROP CONSTRAINT IF EXISTS jugadores_fondo_hero_check;

ALTER TABLE jugadores
  ADD CONSTRAINT jugadores_fondo_hero_check CHECK (fondo_hero IN ('bandera', 'blau'));

CREATE OR REPLACE FUNCTION get_perfil_jugador(p_jugador_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', j.id,
    'auth_id', j.auth_id,
    'nombre', j.nombre,
    'nickname', j.nickname,
    'nombre_completo', j.nombre_completo,
    'email', j.email,
    'telefono', j.telefono,
    'instagram', j.instagram,
    'foto_url', j.foto_url,
    'ocultar_telefon', COALESCE(j.ocultar_telefon, false),
    'mostrar_telefono', j.mostrar_telefono,
    'autoriza_instagram', j.autoriza_instagram,
    'es_coordinador', j.es_coordinador,
    'activo', j.activo,
    'sancionat', COALESCE(j.sancionat, false),
    'sancio_fins', j.sancio_fins,
    'fondo_hero', COALESCE(j.fondo_hero, 'bandera'),
    'partidos_jugados', COALESCE(r.partidos_jugados, 0),
    'partidos_ganados', COALESCE(r.partidos_ganados, 0),
    'juegos_jugados', COALESCE(r.juegos_jugados, 0),
    'juegos_ganados', COALESCE(r.juegos_ganados, 0),
    'eficacia', COALESCE(r.eficacia, 0),
    'penalizacion', COALESCE(r.penalizacion, 0),
    'score', COALESCE(r.score, 0)
  )
  FROM jugadores j
  LEFT JOIN ranking r ON r.jugador_id = j.id
  WHERE j.id = p_jugador_id
    AND j.activo = true;
$$;

GRANT EXECUTE ON FUNCTION get_perfil_jugador(uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS actualizar_perfil_jugador(uuid, text, text, boolean, text);

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
  IF v_fondo_hero IS NOT NULL AND v_fondo_hero NOT IN ('bandera', 'blau') THEN
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
