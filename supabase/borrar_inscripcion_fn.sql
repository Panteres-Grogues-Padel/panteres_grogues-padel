-- Función SECURITY DEFINER para borrar inscripciones sin depender de RLS.
-- p_semana acepta text (YYYY-MM-DD) para evitar errores de tipo desde PostgREST.
CREATE OR REPLACE FUNCTION borrar_inscripcion(p_jugador_id uuid, p_slot_id text, p_semana text)
RETURNS void AS $$
  DELETE FROM inscripciones
  WHERE jugador_id = p_jugador_id
    AND slot_id    = p_slot_id
    AND semana     = p_semana::date;
$$ LANGUAGE sql SECURITY DEFINER;
