-- Slots del prototipo (index.html) que faltan si solo tienes mar-del, mie-del, jue-up, vie-del.
-- Ejecutar en SQL Editor. ON CONFLICT no actualiza filas existentes.

INSERT INTO slots (id, label, club, dia_semana, pistas_default, pistas_activo, activo) VALUES
  ('lun-up',  'Lunes',     'Club Up',      0, 3, 3, true),
  ('lun-del', 'Lunes',     'Club Delfos',  0, 2, 2, true),
  ('mar-up',  'Martes',    'Club Up',      1, 2, 2, true),
  ('mie-man', 'Miércoles', 'Mañana',       2, 1, 1, true),
  ('mie-up',  'Miércoles', 'Club Up',      2, 5, 5, true),
  ('jue-del', 'Jueves',    'Club Delfos',  3, 2, 2, true),
  ('vie-up',  'Viernes',   'Club Up',      4, 7, 7, true),
  ('dom',     'Domingo',   'Americana',    6, 0, 0, true)
ON CONFLICT (id) DO NOTHING;
