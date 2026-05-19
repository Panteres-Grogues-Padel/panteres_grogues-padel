-- Programar la Edge Function cron-slot-abierto (19:00 Madrid ≈ 17:00 UTC en verano).
-- Ejecutar en SQL Editor DESPUÉS de:
--   1. supabase db push (RPCs)
--   2. supabase functions deploy cron-slot-abierto
--   3. Guardar service_role en Vault: vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cron-slot-abierto-19h') THEN
    PERFORM cron.unschedule('cron-slot-abierto-19h');
  END IF;
END $$;

SELECT cron.schedule(
  'cron-slot-abierto-19h',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://fulqczmbmmakdxylejgw.supabase.co/functions/v1/cron-slot-abierto',
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
