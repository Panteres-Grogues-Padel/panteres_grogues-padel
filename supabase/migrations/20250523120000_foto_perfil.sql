-- Fotos de perfil: columna, RPCs y bucket de avatares.

ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS foto_url text;

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
    'nombre', j.nombre,
    'nickname', j.nickname,
    'nombre_completo', j.nombre_completo,
    'telefono', j.telefono,
    'instagram', j.instagram,
    'foto_url', j.foto_url,
    'mostrar_telefono', j.mostrar_telefono,
    'autoriza_instagram', j.autoriza_instagram,
    'es_coordinador', j.es_coordinador,
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

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
CREATE POLICY "Avatar public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM jugadores WHERE auth_id = auth.uid() LIMIT 1
  )
);

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM jugadores WHERE auth_id = auth.uid() LIMIT 1
  )
);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (
    SELECT id::text FROM jugadores WHERE auth_id = auth.uid() LIMIT 1
  )
);
