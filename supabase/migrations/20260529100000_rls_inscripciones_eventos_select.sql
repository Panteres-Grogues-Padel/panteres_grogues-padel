-- Realtime respeta RLS en SELECT: cualquier jugador activo debe poder leer todas las inscripciones.
DROP POLICY IF EXISTS "Jugador ve su inscripción evento" ON inscripciones_eventos;

CREATE POLICY "Jugadores ven todas las inscripciones de eventos"
  ON inscripciones_eventos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jugadores me
      WHERE me.auth_id = auth.uid() AND me.activo = true
    )
  );
