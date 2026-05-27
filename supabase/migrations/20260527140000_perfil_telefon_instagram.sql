-- Telèfon i Instagram al perfil + RPC actualizar_perfil_jugador

ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS telefono text;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS instagram text;
ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS ocultar_telefon boolean DEFAULT false;

-- Migrar privacitat legacy (mostrar_telefono → ocultar_telefon)
UPDATE jugadores
SET ocultar_telefon = NOT COALESCE(mostrar_telefono, false)
WHERE ocultar_telefon IS DISTINCT FROM NOT COALESCE(mostrar_telefono, false);

CREATE OR REPLACE FUNCTION get_jugadores()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', j.id,
      'nombre', j.nombre,
      'nombre_completo', j.nombre_completo,
      'nickname', j.nickname,
      'foto_url', j.foto_url,
      'telefono', j.telefono,
      'instagram', j.instagram,
      'ocultar_telefon', COALESCE(j.ocultar_telefon, false),
      'sancionat', COALESCE(j.sancionat, false),
      'sancio_fins', j.sancio_fins,
      'padrino_id', j.padrino_id,
      'padrino_nombre', p.nombre
    ) AS row_data
    FROM jugadores j
    LEFT JOIN jugadores p ON p.id = j.padrino_id
    WHERE j.activo = true
  ) sub;
$$;

GRANT EXECUTE ON FUNCTION get_jugadores() TO anon, authenticated;

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

CREATE OR REPLACE FUNCTION get_mi_perfil_jugador()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_perfil_jugador(j.id)
  FROM jugadores j
  WHERE j.auth_id = auth.uid()
    AND j.activo = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_mi_perfil_jugador() TO authenticated;

CREATE OR REPLACE FUNCTION actualizar_perfil_jugador(
  p_jugador_id uuid,
  p_telefon text,
  p_instagram text,
  p_ocultar_telefon boolean
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
    telefono = NULLIF(TRIM(p_telefon), ''),
    instagram = NULLIF(regexp_replace(TRIM(COALESCE(p_instagram, '')), '^@+', ''), ''),
    ocultar_telefon = COALESCE(p_ocultar_telefon, false),
    mostrar_telefono = NOT COALESCE(p_ocultar_telefon, false)
  WHERE id = p_jugador_id;

  RETURN get_perfil_jugador(p_jugador_id);
END;
$$;

GRANT EXECUTE ON FUNCTION actualizar_perfil_jugador(uuid, text, text, boolean) TO authenticated;
