-- Permite al coordinador borrar resultados al regenerar partidos.
CREATE POLICY "Coord borra resultados" ON resultados
  FOR DELETE USING (es_coordinador());
