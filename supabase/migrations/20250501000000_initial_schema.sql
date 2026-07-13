-- Esquema inicial (baseline) extraído de supabase/seed.sql — solo DDL, sin datos de prueba.
-- Tablas, funciones RLS y políticas necesarias antes de las migraciones incrementales.
-- gen_random_uuid() (PG 13+) evita depender de uuid-ossp en Supabase hosted.

-- ============================================================
-- TABLAS
-- ============================================================

CREATE TABLE jugadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nombre varchar(50) NOT NULL,
  apellido1_inicial char(1),
  apellido2_inicial char(1),
  nombre_completo varchar(100) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  telefono varchar(20),
  instagram varchar(100),
  foto_url text,
  sancionat boolean DEFAULT false,
  sancio_fins date,
  mostrar_telefono boolean DEFAULT false,
  autoriza_instagram boolean DEFAULT false,
  ocultar_telefon boolean DEFAULT false,
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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id uuid REFERENCES jugadores(id) ON DELETE CASCADE,
  slot_id varchar(20) REFERENCES slots(id),
  es_socio boolean DEFAULT false,
  semana date NOT NULL,
  inscrito_at timestamptz DEFAULT now(),
  UNIQUE(jugador_id, slot_id, semana)
);

CREATE TABLE partidos_generados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id varchar(20) REFERENCES slots(id),
  semana date NOT NULL,
  num_pistas smallint NOT NULL,
  num_indoor smallint DEFAULT 0,
  generado_por uuid REFERENCES jugadores(id),
  generado_at timestamptz DEFAULT now(),
  UNIQUE(slot_id, semana)
);

CREATE TABLE pistas_partido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_generado_id uuid REFERENCES partidos_generados(id) ON DELETE CASCADE,
  numero_pista smallint NOT NULL,
  hora time,
  es_indoor boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE jugadores_pista (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pista_id uuid REFERENCES pistas_partido(id) ON DELETE CASCADE,
  jugador_id uuid REFERENCES jugadores(id),
  posicion smallint NOT NULL,
  confirmado boolean DEFAULT false,
  confirmado_at timestamptz,
  UNIQUE(pista_id, jugador_id)
);

CREATE TABLE resultados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo varchar(100) NOT NULL,
  descripcion text,
  tipo varchar(20) NOT NULL CHECK (tipo IN ('torneo','social','otro')),
  fecha date NOT NULL,
  precio decimal(6,2) DEFAULT 0,
  creado_por uuid REFERENCES jugadores(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE inscripciones_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id uuid REFERENCES jugadores(id) ON DELETE CASCADE,
  tipo varchar(30) NOT NULL,
  titulo varchar(100) NOT NULL,
  texto text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  leida boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
