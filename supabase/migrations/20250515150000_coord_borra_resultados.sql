-- Permite al coordinador borrar resultados al regenerar partidos.
DROP POLICY IF EXISTS "Coord borra resultados" ON resultados;
CREATE POLICY "Coord borra resultados" ON resultados
  FOR DELETE USING (es_coordinador());
