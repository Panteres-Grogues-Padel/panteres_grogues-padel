-- Ensure profile updates on jugadores can trigger realtime refresh in frontend.
ALTER TABLE jugadores REPLICA IDENTITY FULL;

DO $$
BEGIN
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
