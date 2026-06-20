-- Exposar numero_socio als perfils RPC (actiu i pendent)

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
    'numero_socio', j.numero_socio,
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

CREATE OR REPLACE FUNCTION get_mi_perfil_pendiente()
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
    'primer_apellido', j.primer_apellido,
    'segundo_apellido', j.segundo_apellido,
    'nickname', j.nickname,
    'nombre_completo', j.nombre_completo,
    'email', j.email,
    'numero_socio', j.numero_socio,
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
  WHERE j.auth_id = auth.uid()
  LIMIT 1;
$$;
