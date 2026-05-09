-- ============================================================
-- Lectura pública de slots e inscripciones (anon + authenticated)
-- Ejecutar en SQL Editor de Supabase si la app no ve filas por RLS.
--
-- Nota: el seed.sql ya crea "Todos ven slots" y "Todos ven inscripciones"
-- (FOR SELECT USING (true)). Esas políticas deberían bastar para anon.
-- Este script añade políticas explícitas TO public por si el proyecto
-- se creó sin ellas o hubo políticas restrictivas adicionales.
-- ============================================================

DROP POLICY IF EXISTS "lectura publica slots" ON public.slots;
CREATE POLICY "lectura publica slots"
  ON public.slots
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "lectura publica inscripciones" ON public.inscripciones;
CREATE POLICY "lectura publica inscripciones"
  ON public.inscripciones
  FOR SELECT
  TO public
  USING (true);
