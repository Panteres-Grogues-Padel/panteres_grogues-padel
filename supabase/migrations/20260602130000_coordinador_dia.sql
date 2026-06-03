-- Coordinador assignat per dia de la setmana (1=dilluns ... 7=diumenge; slots.dia_semana és 0-6)

CREATE TABLE coordinador_dia (
  dia_semana smallint PRIMARY KEY CHECK (dia_semana >= 1 AND dia_semana <= 7),
  jugador_id uuid NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE
);

ALTER TABLE coordinador_dia ENABLE ROW LEVEL SECURITY;

INSERT INTO coordinador_dia (dia_semana, jugador_id)
SELECT 1, id FROM jugadores WHERE lower(email) = 'juli@pa.com' AND activo = true
UNION ALL
SELECT 2, id FROM jugadores WHERE lower(email) = 'chema@pa.com' AND activo = true
UNION ALL
SELECT 3, id FROM jugadores WHERE lower(email) = 'sergif@pa.com' AND activo = true
UNION ALL
SELECT 4, id FROM jugadores WHERE lower(email) = 'uri@pa.com' AND activo = true
UNION ALL
SELECT 5, id FROM jugadores WHERE lower(email) = 'sergii@pa.com' AND activo = true
UNION ALL
SELECT 7, id FROM jugadores WHERE lower(email) = 'lluis@pa.com' AND activo = true;

CREATE OR REPLACE FUNCTION es_coordinador_dia(p_slot_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM slots s
    JOIN coordinador_dia cd ON cd.dia_semana = s.dia_semana + 1
    JOIN jugadores j ON j.id = cd.jugador_id
    WHERE s.id = p_slot_id
      AND j.auth_id = auth.uid()
      AND j.activo = true
  );
$$;

GRANT EXECUTE ON FUNCTION es_coordinador_dia(text) TO authenticated;
