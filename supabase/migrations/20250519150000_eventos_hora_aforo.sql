-- Campos opcionales para eventos creados desde Agenda.
ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS hora time,
  ADD COLUMN IF NOT EXISTS aforo_maximo integer CHECK (aforo_maximo IS NULL OR aforo_maximo > 0);
