-- Deep links: afegir `data jsonb` a notificaciones (fecha/slot_id, etc.)
ALTER TABLE notificaciones
ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;

