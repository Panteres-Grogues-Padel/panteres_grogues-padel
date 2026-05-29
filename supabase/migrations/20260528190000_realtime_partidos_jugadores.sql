-- Habilitar Realtime en partidos y jugadores (generación visible sin recargar la app).
ALTER TABLE partidos_generados REPLICA IDENTITY FULL;
ALTER TABLE pistas_partido REPLICA IDENTITY FULL;
ALTER TABLE jugadores_pista REPLICA IDENTITY FULL;
ALTER TABLE jugadores REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'partidos_generados'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE partidos_generados;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'pistas_partido'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE pistas_partido;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'jugadores_pista'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE jugadores_pista;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'jugadores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE jugadores;
  END IF;
END
$$;
