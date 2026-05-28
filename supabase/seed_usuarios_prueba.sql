-- ============================================================
-- 15 usuarios de prueba (auth + jugadores)
-- Contraseña para todos: 123456
-- Ejecutar en SQL Editor de Supabase (rol postgres / service role).
-- Idempotente: re-ejecutar no duplica ni falla si ya existen.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Función auxiliar: crea usuario Auth + identidad + fila jugadores
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION _seed_usuario_prueba(
  p_id uuid,
  p_email text,
  p_password text,
  p_nombre_completo text,
  p_nickname text,
  p_es_coordinador boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_email text := lower(trim(p_email));
  v_encrypted_pw text;
  v_parts text[];
  v_ap1 char(1);
  v_ap2 char(1);
  v_nombre_corto text;
  v_jugador_id uuid;
BEGIN
  -- Reutilizar auth existente por email (idempotente si el UUID difiere)
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NULL THEN
    v_user_id := p_id;
  END IF;

  v_encrypted_pw := crypt(p_password, gen_salt('bf'));
  v_nombre_corto := COALESCE(NULLIF(trim(p_nickname), ''), split_part(trim(p_nombre_completo), ' ', 1));

  v_parts := string_to_array(trim(p_nombre_completo), ' ');
  IF array_length(v_parts, 1) >= 2 THEN
    v_ap1 := left(v_parts[2], 1);
  END IF;
  IF array_length(v_parts, 1) >= 3 THEN
    v_ap2 := left(v_parts[3], 1);
  END IF;

  -- auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    is_anonymous
  )
  VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'nombre_completo', p_nombre_completo,
      'nickname', p_nickname,
      'es_coordinador', p_es_coordinador
    ),
    false,
    now(),
    now(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();

  -- auth.identities (necesario para login email/password)
  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
  )
  VALUES (
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now(),
    gen_random_uuid()
  )
  ON CONFLICT (provider_id, provider) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    identity_data = EXCLUDED.identity_data,
    updated_at = now();

  -- jugadores
  INSERT INTO public.jugadores (
    id,
    auth_id,
    nombre,
    apellido1_inicial,
    apellido2_inicial,
    nombre_completo,
    nickname,
    email,
    es_coordinador,
    activo,
    acepto_privacidad,
    acepto_privacidad_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    v_nombre_corto,
    v_ap1,
    v_ap2,
    p_nombre_completo,
    NULLIF(trim(p_nickname), ''),
    v_email,
    p_es_coordinador,
    true,
    true,
    now()
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_id = v_user_id,
    nombre = EXCLUDED.nombre,
    apellido1_inicial = EXCLUDED.apellido1_inicial,
    apellido2_inicial = EXCLUDED.apellido2_inicial,
    nombre_completo = EXCLUDED.nombre_completo,
    nickname = EXCLUDED.nickname,
    email = EXCLUDED.email,
    es_coordinador = EXCLUDED.es_coordinador,
    activo = true,
    acepto_privacidad = true,
    acepto_privacidad_at = COALESCE(jugadores.acepto_privacidad_at, EXCLUDED.acepto_privacidad_at),
    updated_at = now();

  SELECT id INTO v_jugador_id FROM public.jugadores WHERE email = v_email;

  INSERT INTO public.ranking (jugador_id, partidos_jugados, partidos_ganados, juegos_jugados, juegos_ganados)
  VALUES (v_jugador_id, 0, 0, 0, 0)
  ON CONFLICT (jugador_id) DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- Coordinadores (8)
-- ---------------------------------------------------------------------------
SELECT _seed_usuario_prueba('20000000-0000-4000-a001-000000000001', 'juli@pa.com',   '123456', 'Juli Llacer',       'Juli',    true);
SELECT _seed_usuario_prueba('20000000-0000-4000-a001-000000000002', 'chema@pa.com',  '123456', 'Chema Gonzalez',    'Chema',   true);
SELECT _seed_usuario_prueba('20000000-0000-4000-a001-000000000003', 'sergif@pa.com', '123456', 'Sergi Ferrer',      'Sergi F', true);
SELECT _seed_usuario_prueba('20000000-0000-4000-a001-000000000004', 'sergii@pa.com', '123456', 'Sergi Ibañez',      'Sergi I', true);
SELECT _seed_usuario_prueba('20000000-0000-4000-a001-000000000005', 'uri@pa.com',    '123456', 'Uri Morales',       'Uri',     true);
SELECT _seed_usuario_prueba('20000000-0000-4000-a001-000000000006', 'lluis@pa.com',  '123456', 'Lluis Villamajo',   'Lluis V', true);
SELECT _seed_usuario_prueba('20000000-0000-4000-a001-000000000007', 'vipe@pa.com',   '123456', 'Victor Viñuelas',   'Vipe',    true);
SELECT _seed_usuario_prueba('20000000-0000-4000-a001-000000000008', 'sito@pa.com',   '123456', 'Sito Aran',         'Sito',    true);

-- ---------------------------------------------------------------------------
-- Jugadores (7)
-- ---------------------------------------------------------------------------
SELECT _seed_usuario_prueba('20000000-0000-4000-b001-000000000001', 'davidr@pa.com',  '123456', 'David Roger',    'David R',  false);
SELECT _seed_usuario_prueba('20000000-0000-4000-b001-000000000002', 'jaimej@pa.com',  '123456', 'Jaime Jiménez',  'Jaime J',  false);
SELECT _seed_usuario_prueba('20000000-0000-4000-b001-000000000003', 'jordib@pa.com',  '123456', 'Jordi Bassó',    'Jordi B',  false);
SELECT _seed_usuario_prueba('20000000-0000-4000-b001-000000000004', 'manul@pa.com',   '123456', 'Manu Lara',      'Manu L',   false);
SELECT _seed_usuario_prueba('20000000-0000-4000-b001-000000000005', 'sergic@pa.com',  '123456', 'Sergi Roca',     'Sergi C',  false);
SELECT _seed_usuario_prueba('20000000-0000-4000-b001-000000000006', 'karimj@pa.com',  '123456', 'Karim Joutet',   'Karim J',  false);
SELECT _seed_usuario_prueba('20000000-0000-4000-b001-000000000007', 'guillem@pa.com', '123456', 'Guillermo M',    'Guille M', false);

-- Limpieza opcional de la función auxiliar (comentar si quieres reutilizarla)
-- DROP FUNCTION IF EXISTS _seed_usuario_prueba(uuid, text, text, text, text, boolean);
