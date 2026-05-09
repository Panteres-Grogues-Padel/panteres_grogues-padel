-- ============================================================
-- PANTERES GROGUES PÀDEL — Schema + datos de prueba (seed)
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase como usuario con permisos
-- (postgres / service role). Las políticas RLS no aplican al rol
-- que ejecuta este script, por lo que los INSERT funcionan.
--
-- PROTOTIPO (index.html): entidades equivalentes
--   jugadores, slots, inscripciones, partidos (pistas + jugadores),
--   resultados, ranking, eventos (+ inscripciones), notificaciones,
--   activity_log (app React + Supabase).
--
-- TRAS EL SEED: crear usuarios en Authentication y enlazar:
--   UPDATE jugadores SET auth_id = '<uuid-de-auth.users>' WHERE email = '...';
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------- Limpieza (re-ejecutar seed en dev) --------------------
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS inscripciones_eventos CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS resultados CASCADE;
DROP TABLE IF EXISTS jugadores_pista CASCADE;
DROP TABLE IF EXISTS pistas_partido CASCADE;
DROP TABLE IF EXISTS partidos_generados CASCADE;
DROP TABLE IF EXISTS ranking CASCADE;
DROP TABLE IF EXISTS inscripciones CASCADE;
DROP TABLE IF EXISTS jugadores CASCADE;
DROP TABLE IF EXISTS slots CASCADE;

DROP FUNCTION IF EXISTS actualizar_ranking(uuid) CASCADE;
DROP FUNCTION IF EXISTS es_coordinador() CASCADE;

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE jugadores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nombre varchar(50) NOT NULL,
  apellido1_inicial char(1),
  apellido2_inicial char(1),
  nombre_completo varchar(100) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  telefono varchar(20),
  instagram varchar(100),
  foto_url text,
  mostrar_telefono boolean DEFAULT false,
  autoriza_instagram boolean DEFAULT false,
  es_coordinador boolean DEFAULT false,
  activo boolean DEFAULT true,
  acepto_privacidad boolean DEFAULT false,
  acepto_privacidad_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE slots (
  id varchar(20) PRIMARY KEY,
  label varchar(20) NOT NULL,
  club varchar(50) NOT NULL,
  dia_semana smallint NOT NULL,
  pistas_default smallint DEFAULT 0,
  pistas_activo smallint DEFAULT 0,
  activo boolean DEFAULT true
);

CREATE TABLE inscripciones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  jugador_id uuid REFERENCES jugadores(id) ON DELETE CASCADE,
  slot_id varchar(20) REFERENCES slots(id),
  es_socio boolean DEFAULT false,
  semana date NOT NULL,
  inscrito_at timestamptz DEFAULT now(),
  UNIQUE(jugador_id, slot_id, semana)
);

CREATE TABLE partidos_generados (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id varchar(20) REFERENCES slots(id),
  semana date NOT NULL,
  num_pistas smallint NOT NULL,
  num_indoor smallint DEFAULT 0,
  generado_por uuid REFERENCES jugadores(id),
  generado_at timestamptz DEFAULT now(),
  UNIQUE(slot_id, semana)
);

CREATE TABLE pistas_partido (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partido_generado_id uuid REFERENCES partidos_generados(id) ON DELETE CASCADE,
  numero_pista smallint NOT NULL,
  hora time,
  es_indoor boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE jugadores_pista (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pista_id uuid REFERENCES pistas_partido(id) ON DELETE CASCADE,
  jugador_id uuid REFERENCES jugadores(id),
  posicion smallint NOT NULL,
  confirmado boolean DEFAULT false,
  confirmado_at timestamptz,
  UNIQUE(pista_id, jugador_id)
);

CREATE TABLE resultados (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  pista_id uuid REFERENCES pistas_partido(id),
  fecha date NOT NULL,
  set1_p1 smallint NOT NULL DEFAULT 0,
  set1_p2 smallint NOT NULL DEFAULT 0,
  set2_p1 smallint NOT NULL DEFAULT 0,
  set2_p2 smallint NOT NULL DEFAULT 0,
  set3_p1 smallint NOT NULL DEFAULT 0,
  set3_p2 smallint NOT NULL DEFAULT 0,
  introducido_por uuid REFERENCES jugadores(id),
  introducido_at timestamptz DEFAULT now(),
  validado_por uuid REFERENCES jugadores(id),
  validado_at timestamptz
);

CREATE TABLE ranking (
  jugador_id uuid PRIMARY KEY REFERENCES jugadores(id) ON DELETE CASCADE,
  partidos_jugados smallint DEFAULT 0,
  partidos_ganados smallint DEFAULT 0,
  juegos_jugados smallint DEFAULT 0,
  juegos_ganados smallint DEFAULT 0,
  eficacia decimal(5,4) DEFAULT 0,
  penalizacion decimal(5,4) DEFAULT 0,
  score decimal(5,4) DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE eventos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo varchar(100) NOT NULL,
  descripcion text,
  tipo varchar(20) NOT NULL CHECK (tipo IN ('torneo','social','otro')),
  fecha date NOT NULL,
  precio decimal(6,2) DEFAULT 0,
  creado_por uuid REFERENCES jugadores(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE inscripciones_eventos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id uuid REFERENCES eventos(id) ON DELETE CASCADE,
  jugador_id uuid REFERENCES jugadores(id) ON DELETE CASCADE,
  pareja varchar(100),
  pago_confirmado boolean DEFAULT false,
  pago_confirmado_por uuid REFERENCES jugadores(id),
  pago_confirmado_at timestamptz,
  inscrito_at timestamptz DEFAULT now(),
  UNIQUE(evento_id, jugador_id)
);

CREATE TABLE notificaciones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  jugador_id uuid REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo varchar(30) NOT NULL,
  titulo varchar(100) NOT NULL,
  texto text,
  leida boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  jugador_id uuid REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo varchar(30) NOT NULL,
  texto text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- FUNCIONES (RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION es_coordinador()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT es_coordinador FROM jugadores WHERE auth_id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION actualizar_ranking(p_resultado_id uuid)
RETURNS void AS $$
DECLARE
  r record;
  j1 uuid; j2 uuid; j3 uuid; j4 uuid;
  juegos_totales smallint;
  juegos1 smallint; juegos2 smallint; juegos3 smallint; juegos4 smallint;
BEGIN
  SELECT * INTO r FROM resultados WHERE id = p_resultado_id;

  SELECT jugador_id INTO j1 FROM jugadores_pista WHERE pista_id = r.pista_id AND posicion = 1;
  SELECT jugador_id INTO j2 FROM jugadores_pista WHERE pista_id = r.pista_id AND posicion = 2;
  SELECT jugador_id INTO j3 FROM jugadores_pista WHERE pista_id = r.pista_id AND posicion = 3;
  SELECT jugador_id INTO j4 FROM jugadores_pista WHERE pista_id = r.pista_id AND posicion = 4;

  juegos_totales := r.set1_p1 + r.set1_p2 + r.set2_p1 + r.set2_p2 + r.set3_p1 + r.set3_p2;

  juegos1 := r.set1_p1 + r.set2_p1 + r.set3_p1;
  juegos2 := r.set1_p2 + r.set2_p2 + r.set3_p2;
  juegos3 := r.set1_p2 + r.set2_p1 + r.set3_p2;
  juegos4 := r.set1_p1 + r.set2_p2 + r.set3_p1;

  INSERT INTO ranking (jugador_id, partidos_jugados, juegos_jugados, juegos_ganados)
  VALUES
    (j1, 1, juegos_totales, juegos1),
    (j2, 1, juegos_totales, juegos2),
    (j3, 1, juegos_totales, juegos3),
    (j4, 1, juegos_totales, juegos4)
  ON CONFLICT (jugador_id) DO UPDATE SET
    partidos_jugados = ranking.partidos_jugados + 1,
    juegos_jugados = ranking.juegos_jugados + excluded.juegos_jugados,
    juegos_ganados = ranking.juegos_ganados + excluded.juegos_ganados,
    updated_at = now();

  UPDATE ranking SET
    eficacia = CASE WHEN partidos_jugados > 0 AND juegos_jugados > 0
      THEN ((partidos_ganados::decimal / partidos_jugados) + (juegos_ganados::decimal / juegos_jugados)) / 2
      ELSE 0 END,
    updated_at = now()
  WHERE jugador_id IN (j1, j2, j3, j4);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos_generados ENABLE ROW LEVEL SECURITY;
ALTER TABLE pistas_partido ENABLE ROW LEVEL SECURITY;
ALTER TABLE jugadores_pista ENABLE ROW LEVEL SECURITY;
ALTER TABLE resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jugadores pueden ver perfiles públicos" ON jugadores
  FOR SELECT USING (activo = true);

CREATE POLICY "Jugadores pueden actualizar su propio perfil" ON jugadores
  FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "Coordinadores pueden insertar jugadores" ON jugadores
  FOR INSERT WITH CHECK (es_coordinador());

CREATE POLICY "Todos ven slots" ON slots
  FOR SELECT USING (true);

CREATE POLICY "Coord gestiona slots" ON slots
  FOR ALL USING (es_coordinador());

CREATE POLICY "Todos ven inscripciones" ON inscripciones
  FOR SELECT USING (true);

CREATE POLICY "Jugador gestiona su inscripción" ON inscripciones
  FOR ALL USING (
    jugador_id = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
    OR es_coordinador()
  );

CREATE POLICY "Todos ven partidos generados" ON partidos_generados
  FOR SELECT USING (true);

CREATE POLICY "Coord genera partidos" ON partidos_generados
  FOR ALL USING (es_coordinador());

CREATE POLICY "Todos ven pistas" ON pistas_partido
  FOR SELECT USING (true);

CREATE POLICY "Coord gestiona pistas" ON pistas_partido
  FOR ALL USING (es_coordinador());

CREATE POLICY "Todos ven jugadores pista" ON jugadores_pista
  FOR SELECT USING (true);

CREATE POLICY "Jugador confirma asistencia propia" ON jugadores_pista
  FOR UPDATE USING (
    jugador_id = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
    OR es_coordinador()
  );

CREATE POLICY "Coord inserta jugadores pista" ON jugadores_pista
  FOR INSERT WITH CHECK (es_coordinador());

CREATE POLICY "Coord borra jugadores pista" ON jugadores_pista
  FOR DELETE USING (es_coordinador());

CREATE POLICY "Todos ven resultados" ON resultados
  FOR SELECT USING (true);

CREATE POLICY "Jugadores introducen resultados" ON resultados
  FOR INSERT WITH CHECK (
    introducido_por = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
    OR es_coordinador()
  );

CREATE POLICY "Jugadores validan resultados" ON resultados
  FOR UPDATE USING (
    validado_por = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
    OR es_coordinador()
  );

CREATE POLICY "Todos ven ranking" ON ranking
  FOR SELECT USING (true);

CREATE POLICY "Sistema actualiza ranking" ON ranking
  FOR ALL USING (es_coordinador());

CREATE POLICY "Todos ven eventos" ON eventos
  FOR SELECT USING (true);

CREATE POLICY "Coord gestiona eventos" ON eventos
  FOR ALL USING (es_coordinador());

CREATE POLICY "Jugador ve su inscripción evento" ON inscripciones_eventos
  FOR SELECT USING (
    jugador_id = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
    OR es_coordinador()
  );

CREATE POLICY "Jugador gestiona su inscripción evento" ON inscripciones_eventos
  FOR ALL USING (
    jugador_id = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
    OR es_coordinador()
  );

CREATE POLICY "Jugador ve sus notificaciones" ON notificaciones
  FOR ALL USING (
    jugador_id = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
  );

CREATE POLICY "Jugador ve su log" ON activity_log
  FOR SELECT USING (
    jugador_id = (SELECT id FROM jugadores WHERE auth_id = auth.uid())
    OR es_coordinador()
  );

CREATE POLICY "Sistema inserta log" ON activity_log
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- DATOS: slots (4 del prototipo, 2 pistas cada uno)
-- ============================================================

INSERT INTO slots (id, label, club, dia_semana, pistas_default, pistas_activo, activo) VALUES
  ('mar-del', 'Martes',    'Club Delfos', 1, 2, 2, true),
  ('mie-del', 'Miércoles', 'Club Delfos', 2, 2, 2, true),
  ('jue-up',  'Jueves',    'Club Up',     3, 2, 2, true),
  ('vie-del', 'Viernes',   'Club Delfos', 4, 2, 2, true);

-- ============================================================
-- DATOS: jugadores (1 coordinador + 32 jugadores)
-- UUIDs fijos para poder enlazar auth_id después
-- ============================================================

INSERT INTO jugadores (id, auth_id, nombre, apellido1_inicial, apellido2_inicial, nombre_completo, email, es_coordinador, activo, acepto_privacidad, acepto_privacidad_at) VALUES
  ('10000000-0000-4000-b000-000000000001', NULL, 'Coordinador', 'U', 'C', 'Coordinador Uno', 'coordinador@panteresgrogues.cat', true, true, true, now()),
  ('10000000-0000-4000-b000-000000000002', NULL, 'Anna', 'V', 'F', 'Anna Vila Fuster', 'anna.vila@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000003', NULL, 'Marc', 'S', 'R', 'Marc Soler Rovira', 'marc.soler@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000004', NULL, 'Laia', 'G', 'M', 'Laia Grau Martí', 'laia.grau@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000005', NULL, 'Oriol', 'P', 'C', 'Oriol Puig Corominas', 'oriol.puig@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000006', NULL, 'Núria', 'F', 'B', 'Núria Ferrer Bosch', 'nuria.ferrer@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000007', NULL, 'Arnau', 'C', 'V', 'Arnau Casals Vidal', 'arnau.casals@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000008', NULL, 'Marta', 'L', 'S', 'Marta López Sánchez', 'marta.lopez@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000009', NULL, 'Pol', 'R', 'G', 'Pol Roca Guerrero', 'pol.roca@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000000a', NULL, 'Clara', 'M', 'T', 'Clara Martí Torrens', 'clara.marti@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000000b', NULL, 'Gerard', 'F', 'P', 'Gerard Font Puig', 'gerard.font@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000000c', NULL, 'Júlia', 'H', 'N', 'Júlia Hernández Navarro', 'julia.hernandez@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000000d', NULL, 'Iván', 'M', 'L', 'Iván Morales López', 'ivan.morales@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000000e', NULL, 'Elena', 'C', 'D', 'Elena Costa Domènech', 'elena.costa@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000000f', NULL, 'Xavier', 'B', 'S', 'Xavier Bosch Serra', 'xavier.bosch@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000010', NULL, 'Montse', 'R', 'F', 'Montserrat Rius Ferrer', 'montse.rius@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000011', NULL, 'Quim', 'T', 'M', 'Joaquim Torrent Miró', 'quim.torrent@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000012', NULL, 'Sílvia', 'A', 'C', 'Sílvia Aragonès Casals', 'silvia.aragones@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000013', NULL, 'Daniel', 'V', 'H', 'Daniel Vega Herrera', 'daniel.vega@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000014', NULL, 'Cristina', 'P', 'J', 'Cristina Pérez Jiménez', 'cristina.perez@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000015', NULL, 'Albert', 'G', 'R', 'Albert Gómez Ribas', 'albert.gomez@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000016', NULL, 'Rosa', 'M', 'V', 'Rosa Muñoz Vázquez', 'rosa.munoz@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000017', NULL, 'Enric', 'D', 'F', 'Enric Duran Folch', 'enric.duran@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000018', NULL, 'Paula', 'S', 'G', 'Paula Sánchez Gil', 'paula.sanchez@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000019', NULL, 'Roger', 'N', 'P', 'Roger Nogués Pujol', 'roger.nogues@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000001a', NULL, 'Imma', 'J', 'L', 'Imma Julià Llovera', 'imma.julia@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000001b', NULL, 'Sergi', 'O', 'B', 'Sergi Ortega Blanco', 'sergi.ortega@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000001c', NULL, 'Mireia', 'C', 'S', 'Mireia Calvet Soler', 'mireia.calvet@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000001d', NULL, 'Joan', 'B', 'M', 'Joan Balcells Martínez', 'joan.balcells@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000001e', NULL, 'Toni', 'F', 'C', 'Antoni Ferrer Costa', 'toni.ferrer@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-00000000001f', NULL, 'Berta', 'R', 'T', 'Berta Rovira Tarrés', 'berta.rovira@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000020', NULL, 'Víctor', 'L', 'N', 'Víctor Llamas Nieto', 'victor.llamas@seed.panteres.local', false, true, true, now()),
  ('10000000-0000-4000-b000-000000000021', NULL, 'Gemma', 'P', 'R', 'Gemma Parés Ribera', 'gemma.pares@seed.panteres.local', false, true, true, now());

-- ============================================================
-- RANKING: estadísticas variadas (eficacia / penalización / score)
-- Regla CURSOR_PROMPT: penalización por pocos partidos jugados
-- ============================================================

INSERT INTO ranking (jugador_id, partidos_jugados, partidos_ganados, juegos_jugados, juegos_ganados)
VALUES
  ('10000000-0000-4000-b000-000000000001', 85, 62, 510, 398),
  ('10000000-0000-4000-b000-000000000002', 72, 58, 432, 340),
  ('10000000-0000-4000-b000-000000000003', 68, 45, 408, 310),
  ('10000000-0000-4000-b000-000000000004', 65, 52, 390, 305),
  ('10000000-0000-4000-b000-000000000005', 60, 38, 360, 265),
  ('10000000-0000-4000-b000-000000000006', 58, 44, 348, 278),
  ('10000000-0000-4000-b000-000000000007', 55, 33, 330, 240),
  ('10000000-0000-4000-b000-000000000008', 52, 41, 312, 250),
  ('10000000-0000-4000-b000-000000000009', 48, 36, 288, 220),
  ('10000000-0000-4000-b000-00000000000a', 45, 28, 270, 195),
  ('10000000-0000-4000-b000-00000000000b', 44, 35, 264, 210),
  ('10000000-0000-4000-b000-00000000000c', 42, 30, 252, 188),
  ('10000000-0000-4000-b000-00000000000d', 40, 32, 240, 195),
  ('10000000-0000-4000-b000-00000000000e', 38, 24, 228, 165),
  ('10000000-0000-4000-b000-00000000000f', 36, 29, 216, 175),
  ('10000000-0000-4000-b000-000000000010', 34, 22, 204, 150),
  ('10000000-0000-4000-b000-000000000011', 32, 26, 192, 158),
  ('10000000-0000-4000-b000-000000000012', 30, 18, 180, 125),
  ('10000000-0000-4000-b000-000000000013', 28, 21, 168, 132),
  ('10000000-0000-4000-b000-000000000014', 26, 15, 156, 108),
  ('10000000-0000-4000-b000-000000000015', 24, 19, 144, 118),
  ('10000000-0000-4000-b000-000000000016', 22, 14, 132, 95),
  ('10000000-0000-4000-b000-000000000017', 20, 16, 120, 102),
  ('10000000-0000-4000-b000-000000000018', 18, 11, 108, 78),
  ('10000000-0000-4000-b000-000000000019', 16, 12, 96, 72),
  ('10000000-0000-4000-b000-00000000001a', 14, 9, 84, 58),
  ('10000000-0000-4000-b000-00000000001b', 12, 10, 72, 55),
  ('10000000-0000-4000-b000-00000000001c', 10, 6, 60, 38),
  ('10000000-0000-4000-b000-00000000001d', 8, 7, 48, 35),
  ('10000000-0000-4000-b000-00000000001e', 6, 4, 36, 22),
  ('10000000-0000-4000-b000-00000000001f', 5, 3, 30, 18),
  ('10000000-0000-4000-b000-000000000020', 4, 2, 24, 14),
  ('10000000-0000-4000-b000-000000000021', 3, 2, 18, 11);

UPDATE ranking r SET
  eficacia = CASE
    WHEN r.partidos_jugados > 0 AND r.juegos_jugados > 0 THEN
      ROUND(
        ((r.partidos_ganados::numeric / r.partidos_jugados) + (r.juegos_ganados::numeric / r.juegos_jugados)) / 2,
        4
      )
    ELSE 0
  END::decimal(5,4),
  penalizacion = CASE
    WHEN r.partidos_jugados >= 9 THEN 0::decimal(5,4)
    WHEN r.partidos_jugados = 8 THEN 0.05::decimal(5,4)
    WHEN r.partidos_jugados = 7 THEN 0.13::decimal(5,4)
    WHEN r.partidos_jugados = 6 THEN 0.20::decimal(5,4)
    WHEN r.partidos_jugados = 5 THEN 0.27::decimal(5,4)
    WHEN r.partidos_jugados = 4 THEN 0.33::decimal(5,4)
    WHEN r.partidos_jugados = 3 THEN 0.38::decimal(5,4)
    WHEN r.partidos_jugados = 2 THEN 0.43::decimal(5,4)
    WHEN r.partidos_jugados = 1 THEN 0.48::decimal(5,4)
    ELSE 0::decimal(5,4)
  END,
  score = ROUND(
    (CASE
      WHEN r.partidos_jugados > 0 AND r.juegos_jugados > 0 THEN
        ((r.partidos_ganados::numeric / r.partidos_jugados) + (r.juegos_ganados::numeric / r.juegos_jugados)) / 2
      ELSE 0
    END) * (1 - (CASE
      WHEN r.partidos_jugados >= 9 THEN 0
      WHEN r.partidos_jugados = 8 THEN 0.05
      WHEN r.partidos_jugados = 7 THEN 0.13
      WHEN r.partidos_jugados = 6 THEN 0.20
      WHEN r.partidos_jugados = 5 THEN 0.27
      WHEN r.partidos_jugados = 4 THEN 0.33
      WHEN r.partidos_jugados = 3 THEN 0.38
      WHEN r.partidos_jugados = 2 THEN 0.43
      WHEN r.partidos_jugados = 1 THEN 0.48
      ELSE 0
    END)),
    4
  )::decimal(5,4),
  updated_at = now();

-- ============================================================
-- INSCRIPCIONES: 32 filas (todos los jugadores de prueba en varios slots)
-- Semana = lunes ISO de la fecha actual
-- ============================================================

INSERT INTO inscripciones (jugador_id, slot_id, semana, es_socio)
SELECT j, 'mar-del', (CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::integer - 1)), false
FROM unnest(ARRAY[
  '10000000-0000-4000-b000-000000000002'::uuid,
  '10000000-0000-4000-b000-000000000003'::uuid,
  '10000000-0000-4000-b000-000000000004'::uuid,
  '10000000-0000-4000-b000-000000000005'::uuid,
  '10000000-0000-4000-b000-000000000006'::uuid,
  '10000000-0000-4000-b000-000000000007'::uuid,
  '10000000-0000-4000-b000-000000000008'::uuid,
  '10000000-0000-4000-b000-000000000009'::uuid
]) AS j;

INSERT INTO inscripciones (jugador_id, slot_id, semana, es_socio)
SELECT j, 'mie-del', (CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::integer - 1)), es
FROM (VALUES
  ('10000000-0000-4000-b000-00000000000a'::uuid, true),
  ('10000000-0000-4000-b000-00000000000b'::uuid, false),
  ('10000000-0000-4000-b000-00000000000c'::uuid, true),
  ('10000000-0000-4000-b000-00000000000d'::uuid, false),
  ('10000000-0000-4000-b000-00000000000e'::uuid, true),
  ('10000000-0000-4000-b000-00000000000f'::uuid, false),
  ('10000000-0000-4000-b000-000000000010'::uuid, false),
  ('10000000-0000-4000-b000-000000000011'::uuid, true)
) AS t(j, es);

INSERT INTO inscripciones (jugador_id, slot_id, semana, es_socio)
SELECT j, 'jue-up', (CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::integer - 1)), false
FROM unnest(ARRAY[
  '10000000-0000-4000-b000-000000000012'::uuid,
  '10000000-0000-4000-b000-000000000013'::uuid,
  '10000000-0000-4000-b000-000000000014'::uuid,
  '10000000-0000-4000-b000-000000000015'::uuid,
  '10000000-0000-4000-b000-000000000016'::uuid,
  '10000000-0000-4000-b000-000000000017'::uuid,
  '10000000-0000-4000-b000-000000000018'::uuid,
  '10000000-0000-4000-b000-000000000019'::uuid
]) AS j;

INSERT INTO inscripciones (jugador_id, slot_id, semana, es_socio)
SELECT j, 'vie-del', (CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::integer - 1)), false
FROM unnest(ARRAY[
  '10000000-0000-4000-b000-00000000001a'::uuid,
  '10000000-0000-4000-b000-00000000001b'::uuid,
  '10000000-0000-4000-b000-00000000001c'::uuid,
  '10000000-0000-4000-b000-00000000001d'::uuid,
  '10000000-0000-4000-b000-00000000001e'::uuid,
  '10000000-0000-4000-b000-00000000001f'::uuid,
  '10000000-0000-4000-b000-000000000020'::uuid,
  '10000000-0000-4000-b000-000000000021'::uuid
]) AS j;

-- Inscripciones extra (mismo día distintos slots): 32 + 8 = 40 inscripciones
INSERT INTO inscripciones (jugador_id, slot_id, semana, es_socio)
SELECT j, 'jue-up', (CURRENT_DATE - (EXTRACT(ISODOW FROM CURRENT_DATE)::integer - 1)), true
FROM unnest(ARRAY[
  '10000000-0000-4000-b000-000000000002'::uuid,
  '10000000-0000-4000-b000-00000000000a'::uuid,
  '10000000-0000-4000-b000-000000000010'::uuid,
  '10000000-0000-4000-b000-00000000001a'::uuid,
  '10000000-0000-4000-b000-000000000006'::uuid,
  '10000000-0000-4000-b000-000000000007'::uuid,
  '10000000-0000-4000-b000-000000000005'::uuid,
  '10000000-0000-4000-b000-000000000011'::uuid
]) AS j;

-- Eventos de muestra
INSERT INTO eventos (id, titulo, descripcion, tipo, fecha, precio, creado_por) VALUES
  ('e1000000-0000-4000-b000-000000000001', 'Calçotada de primavera', 'Trobada social de la secció', 'social', CURRENT_DATE + 20, 18.00, '10000000-0000-4000-b000-000000000001'),
  ('e1000000-0000-4000-b000-000000000002', 'Torneig estiu', 'Format americà', 'torneo', CURRENT_DATE + 45, 0, '10000000-0000-4000-b000-000000000001');

INSERT INTO inscripciones_eventos (evento_id, jugador_id, pareja, pago_confirmado) VALUES
  ('e1000000-0000-4000-b000-000000000002', '10000000-0000-4000-b000-000000000002', 'Marc Soler Rovira', false),
  ('e1000000-0000-4000-b000-000000000002', '10000000-0000-4000-b000-000000000003', 'Anna Vila Fuster', false);

INSERT INTO inscripciones_eventos (evento_id, jugador_id, pareja, pago_confirmado) VALUES
  ('e1000000-0000-4000-b000-000000000001', '10000000-0000-4000-b000-000000000004', NULL, true);

-- Notificaciones de muestra
INSERT INTO notificaciones (jugador_id, tipo, titulo, texto, leida) VALUES
  ('10000000-0000-4000-b000-000000000002', 'jugar', 'Llista oberta', 'Ja et pots apuntar al teu slot.', false),
  ('10000000-0000-4000-b000-000000000003', 'partidos', 'Partits', 'Recorda confirmar assistència.', false);

COMMIT;

-- ============================================================
-- Nota: el seed no crea partidos_generados; el coordinador los genera en la app.
-- Políticas INSERT/DELETE en jugadores_pista incluidas arriba para coordinador.
-- ============================================================
