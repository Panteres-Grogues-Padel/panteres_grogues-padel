-- Dates d'inici i fi del període de quota

CREATE OR REPLACE FUNCTION cuotas_fechas_desde_periodo(p_tipo text, p_periodo text)
RETURNS TABLE(fecha_inicio date, fecha_fin date)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_periodo text;
  v_year int;
  v_trim int;
  m text[];
BEGIN
  v_periodo := NULLIF(TRIM(p_tipo), '');

  IF v_periodo = 'anual' THEN
    v_year := NULLIF(TRIM(p_periodo), '')::int;
    IF v_year IS NULL THEN
      RAISE EXCEPTION 'Període anual no vàlid: %', p_periodo;
    END IF;
    fecha_inicio := make_date(v_year, 1, 1);
    fecha_fin := make_date(v_year, 12, 31);
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_periodo = 'trimestral' THEN
    m := regexp_match(TRIM(p_periodo), '^(\d{4})-T([1-4])$');
    IF m IS NULL THEN
      RAISE EXCEPTION 'Període trimestral no vàlid: %', p_periodo;
    END IF;
    v_year := m[1]::int;
    v_trim := m[2]::int;

    CASE v_trim
      WHEN 1 THEN
        fecha_inicio := make_date(v_year, 1, 1);
        fecha_fin := make_date(v_year, 3, 31);
      WHEN 2 THEN
        fecha_inicio := make_date(v_year, 4, 1);
        fecha_fin := make_date(v_year, 6, 30);
      WHEN 3 THEN
        fecha_inicio := make_date(v_year, 7, 1);
        fecha_fin := make_date(v_year, 9, 30);
      WHEN 4 THEN
        fecha_inicio := make_date(v_year, 10, 1);
        fecha_fin := make_date(v_year, 12, 31);
    END CASE;
    RETURN NEXT;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Tipus de quota no vàlid: %', p_tipo;
END;
$$;

ALTER TABLE cuotas ADD COLUMN IF NOT EXISTS fecha_inicio date;
ALTER TABLE cuotas ADD COLUMN IF NOT EXISTS fecha_fin date;

DO $$
DECLARE
  r record;
  v_inicio date;
  v_fin date;
BEGIN
  FOR r IN
    SELECT id, tipo, periodo
    FROM cuotas
    WHERE fecha_inicio IS NULL OR fecha_fin IS NULL
  LOOP
    SELECT f.fecha_inicio, f.fecha_fin
    INTO v_inicio, v_fin
    FROM cuotas_fechas_desde_periodo(r.tipo, r.periodo) f;

    UPDATE cuotas
    SET fecha_inicio = v_inicio, fecha_fin = v_fin
    WHERE id = r.id;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS marcar_cuota_pagada(uuid, text, text);

CREATE OR REPLACE FUNCTION marcar_cuota_pagada(
  p_jugador_id uuid,
  p_tipo text,
  p_periodo text,
  p_fecha_inicio date DEFAULT NULL,
  p_fecha_fin date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tipo text;
  v_periodo text;
  v_inicio date;
  v_fin date;
  v_cuota cuotas%ROWTYPE;
BEGIN
  IF NOT es_admin_o_tesorero() THEN
    RAISE EXCEPTION 'No autoritzat.';
  END IF;

  v_tipo := NULLIF(TRIM(p_tipo), '');
  v_periodo := NULLIF(TRIM(p_periodo), '');

  IF v_tipo IS NULL OR v_tipo NOT IN ('anual', 'trimestral') THEN
    RAISE EXCEPTION 'Tipus de quota no vàlid.';
  END IF;

  IF v_periodo IS NULL THEN
    RAISE EXCEPTION 'El període és obligatori.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM jugadores WHERE id = p_jugador_id) THEN
    RAISE EXCEPTION 'Jugador no trobat.';
  END IF;

  SELECT f.fecha_inicio, f.fecha_fin
  INTO v_inicio, v_fin
  FROM cuotas_fechas_desde_periodo(v_tipo, v_periodo) f;

  v_inicio := COALESCE(p_fecha_inicio, v_inicio);
  v_fin := COALESCE(p_fecha_fin, v_fin);

  INSERT INTO cuotas (jugador_id, tipo, periodo, pagada, fecha_pago, fecha_inicio, fecha_fin)
  VALUES (p_jugador_id, v_tipo, v_periodo, true, CURRENT_DATE, v_inicio, v_fin)
  ON CONFLICT (jugador_id, tipo, periodo)
  DO UPDATE SET
    pagada = true,
    fecha_pago = CURRENT_DATE,
    fecha_inicio = COALESCE(EXCLUDED.fecha_inicio, cuotas.fecha_inicio),
    fecha_fin = COALESCE(EXCLUDED.fecha_fin, cuotas.fecha_fin)
  RETURNING * INTO v_cuota;

  RETURN to_jsonb(v_cuota);
END;
$$;

GRANT EXECUTE ON FUNCTION marcar_cuota_pagada(uuid, text, text, date, date) TO authenticated;
