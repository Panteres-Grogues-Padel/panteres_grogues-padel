-- Habilitar Realtime en inscripciones, slots y agenda (mismo patrón que jugadores).
ALTER TABLE inscripciones REPLICA IDENTITY FULL;
ALTER TABLE slots REPLICA IDENTITY FULL;
ALTER TABLE eventos REPLICA IDENTITY FULL;
ALTER TABLE inscripciones_eventos REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inscripciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE inscripciones;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'slots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE slots;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'eventos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE eventos;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'inscripciones_eventos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE inscripciones_eventos;
  END IF;
END
$$;
