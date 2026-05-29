-- Habilitar Realtime en resultados (INSERT/UPDATE para refresco en useResultados).
ALTER TABLE resultados REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'resultados'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE resultados;
  END IF;
END
$$;
