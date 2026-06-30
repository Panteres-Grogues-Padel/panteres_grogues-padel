-- Programar la Edge Function cron-cumpleanos (7:00 Madrid ≈ 5:00 UTC en verano).
-- Ejecutar en SQL Editor DESPUÉS de:
--   1. supabase db push (RPC get_cumpleanos_hoy)
--   2. supabase functions deploy cron-cumpleanos
--   3. Vault: service_role_key (mismo secret que cron-slot-abierto)

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cron-cumpleanos-7h') THEN
    PERFORM cron.unschedule('cron-cumpleanos-7h');
  END IF;
END $$;

SELECT cron.schedule(
  'cron-cumpleanos-7h',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fulqczmbmmakdxylejgw.supabase.co/functions/v1/cron-cumpleanos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
        LIMIT 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) AS request_id;
  $$
);
