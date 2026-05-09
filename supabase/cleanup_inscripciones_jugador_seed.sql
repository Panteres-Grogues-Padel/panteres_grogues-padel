-- Limpia inscripciones del jugador seed Anna (pruebas locales).
-- Ejecutar en SQL Editor de Supabase si quieres empezar sin filas de prueba.

DELETE FROM inscripciones
WHERE jugador_id = '10000000-0000-4000-b000-000000000002';
