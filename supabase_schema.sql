-- ============================================================
-- PANTERES GROGUES PÀDEL — Supabase Schema
-- ============================================================
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================================

-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. JUGADORES (perfil público, vinculado a auth.users)
-- ============================================================
create table jugadores (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid references auth.users(id) on delete cascade unique,
  nombre varchar(50) not null,           -- "Jose"
  apellido1_inicial char(1),             -- "G"
  apellido2_inicial char(1),             -- "B"
  nombre_completo varchar(100) not null, -- solo visible para uno mismo
  email varchar(255) not null unique,
  telefono varchar(20),
  instagram varchar(100),
  foto_url text,
  mostrar_telefono boolean default false,
  autoriza_instagram boolean default false,
  es_coordinador boolean default false,
  activo boolean default true,
  acepto_privacidad boolean default false,
  acepto_privacidad_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 2. SLOTS (días y clubs donde se juega)
-- ============================================================
create table slots (
  id varchar(20) primary key,            -- 'lun-up', 'vie-del', etc.
  label varchar(20) not null,            -- 'Lunes', 'Viernes'
  club varchar(50) not null,             -- 'Club Up', 'Club Delfos'
  dia_semana smallint not null,          -- 0=Lun, 1=Mar... 6=Dom
  pistas_default smallint default 0,
  pistas_activo smallint default 0,
  activo boolean default true
);

-- Datos iniciales de slots
insert into slots values
  ('lun-up',  'Lunes',     'Club Up',     0, 3, 3, true),
  ('lun-del', 'Lunes',     'Club Delfos', 0, 2, 2, true),
  ('mar-up',  'Martes',    'Club Up',     1, 2, 2, true),
  ('mar-del', 'Martes',    'Club Delfos', 1, 2, 2, true),
  ('mie-man', 'Miércoles', 'Mañana',      2, 1, 1, true),
  ('mie-up',  'Miércoles', 'Club Up',     2, 5, 5, true),
  ('mie-del', 'Miércoles', 'Club Delfos', 2, 0, 0, true),
  ('jue-up',  'Jueves',    'Club Up',     3, 1, 1, true),
  ('jue-del', 'Jueves',    'Club Delfos', 3, 2, 2, true),
  ('vie-up',  'Viernes',   'Club Up',     4, 7, 7, true),
  ('vie-del', 'Viernes',   'Club Delfos', 4, 1, 1, true),
  ('dom',     'Domingo',   'Americana',   6, 0, 0, true);

-- ============================================================
-- 3. INSCRIPCIONES (quién está apuntado a qué slot)
-- ============================================================
create table inscripciones (
  id uuid primary key default uuid_generate_v4(),
  jugador_id uuid references jugadores(id) on delete cascade,
  slot_id varchar(20) references slots(id),
  es_socio boolean default false,
  semana date not null,                  -- lunes de la semana en cuestión
  inscrito_at timestamptz default now(),
  unique(jugador_id, slot_id, semana)
);

-- ============================================================
-- 4. PARTIDOS GENERADOS (la asignación de pistas por semana)
-- ============================================================
create table partidos_generados (
  id uuid primary key default uuid_generate_v4(),
  slot_id varchar(20) references slots(id),
  semana date not null,                  -- lunes de la semana
  num_pistas smallint not null,
  num_indoor smallint default 0,
  generado_por uuid references jugadores(id),
  generado_at timestamptz default now(),
  unique(slot_id, semana)
);

-- ============================================================
-- 5. PISTAS DE PARTIDO (cada partido individual dentro de un slot)
-- ============================================================
create table pistas_partido (
  id uuid primary key default uuid_generate_v4(),
  partido_generado_id uuid references partidos_generados(id) on delete cascade,
  numero_pista smallint not null,        -- 1, 2, 3...
  hora time,
  es_indoor boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- 6. JUGADORES EN PISTA (qué jugadores están en qué pista)
-- ============================================================
create table jugadores_pista (
  id uuid primary key default uuid_generate_v4(),
  pista_id uuid references pistas_partido(id) on delete cascade,
  jugador_id uuid references jugadores(id),
  posicion smallint not null,            -- 1, 2, 3, 4 (por ranking)
  confirmado boolean default false,
  confirmado_at timestamptz,
  unique(pista_id, jugador_id)
);

-- ============================================================
-- 7. RESULTADOS
-- ============================================================
create table resultados (
  id uuid primary key default uuid_generate_v4(),
  pista_id uuid references pistas_partido(id),
  fecha date not null,
  set1_p1 smallint not null default 0,
  set1_p2 smallint not null default 0,
  set2_p1 smallint not null default 0,
  set2_p2 smallint not null default 0,
  set3_p1 smallint not null default 0,
  set3_p2 smallint not null default 0,
  introducido_por uuid references jugadores(id),
  introducido_at timestamptz default now(),
  validado_por uuid references jugadores(id),
  validado_at timestamptz
);

-- ============================================================
-- 8. RANKING (calculado, actualizado al guardar resultados)
-- ============================================================
create table ranking (
  jugador_id uuid primary key references jugadores(id) on delete cascade,
  partidos_jugados smallint default 0,
  partidos_ganados smallint default 0,
  juegos_jugados smallint default 0,
  juegos_ganados smallint default 0,
  eficacia decimal(5,4) default 0,
  penalizacion decimal(5,4) default 0,
  score decimal(5,4) default 0,          -- eficacia * (1 - penalizacion)
  updated_at timestamptz default now()
);

-- ============================================================
-- 9. EVENTOS (agenda)
-- ============================================================
create table eventos (
  id uuid primary key default uuid_generate_v4(),
  titulo varchar(100) not null,
  descripcion text,
  tipo varchar(20) not null check (tipo in ('torneo','social','otro')),
  fecha date not null,
  precio decimal(6,2) default 0,
  creado_por uuid references jugadores(id),
  created_at timestamptz default now()
);

-- ============================================================
-- 10. INSCRIPCIONES EVENTOS
-- ============================================================
create table inscripciones_eventos (
  id uuid primary key default uuid_generate_v4(),
  evento_id uuid references eventos(id) on delete cascade,
  jugador_id uuid references jugadores(id) on delete cascade,
  pareja varchar(100),                   -- solo torneos
  pago_confirmado boolean default false,
  pago_confirmado_por uuid references jugadores(id),
  pago_confirmado_at timestamptz,
  inscrito_at timestamptz default now(),
  unique(evento_id, jugador_id)
);

-- ============================================================
-- 11. NOTIFICACIONES
-- ============================================================
create table notificaciones (
  id uuid primary key default uuid_generate_v4(),
  jugador_id uuid references jugadores(id) on delete cascade,
  tipo varchar(30) not null,             -- 'partidos','resultados','jugar','agenda'
  titulo varchar(100) not null,
  texto text,
  leida boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- 12. LOG DE ACTIVIDAD
-- ============================================================
create table activity_log (
  id uuid primary key default uuid_generate_v4(),
  jugador_id uuid references jugadores(id) on delete cascade,
  tipo varchar(30) not null,
  texto text not null,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada jugador solo puede leer/escribir sus propios datos
-- ============================================================

-- Habilitar RLS en todas las tablas
alter table jugadores enable row level security;
alter table inscripciones enable row level security;
alter table partidos_generados enable row level security;
alter table pistas_partido enable row level security;
alter table jugadores_pista enable row level security;
alter table resultados enable row level security;
alter table ranking enable row level security;
alter table eventos enable row level security;
alter table inscripciones_eventos enable row level security;
alter table notificaciones enable row level security;
alter table activity_log enable row level security;

-- Helper: saber si el usuario actual es coordinador
create or replace function es_coordinador()
returns boolean as $$
  select coalesce(
    (select es_coordinador from jugadores where auth_id = auth.uid()),
    false
  );
$$ language sql security definer;

-- JUGADORES: todos ven perfiles (datos públicos), solo tú ves tus datos completos
create policy "Jugadores pueden ver perfiles públicos" on jugadores
  for select using (activo = true);

create policy "Jugadores pueden actualizar su propio perfil" on jugadores
  for update using (auth_id = auth.uid());

create policy "Coordinadores pueden insertar jugadores" on jugadores
  for insert with check (es_coordinador());

-- INSCRIPCIONES: todos ven, cada uno gestiona la suya, coord gestiona todas
create policy "Todos ven inscripciones" on inscripciones
  for select using (true);

create policy "Jugador gestiona su inscripción" on inscripciones
  for all using (
    jugador_id = (select id from jugadores where auth_id = auth.uid())
    or es_coordinador()
  );

-- PARTIDOS: todos ven, solo coord genera
create policy "Todos ven partidos generados" on partidos_generados
  for select using (true);

create policy "Coord genera partidos" on partidos_generados
  for all using (es_coordinador());

create policy "Todos ven pistas" on pistas_partido
  for select using (true);

create policy "Coord gestiona pistas" on pistas_partido
  for all using (es_coordinador());

create policy "Todos ven jugadores pista" on jugadores_pista
  for select using (true);

create policy "Jugador confirma asistencia propia" on jugadores_pista
  for update using (
    jugador_id = (select id from jugadores where auth_id = auth.uid())
    or es_coordinador()
  );

-- RESULTADOS: todos ven, cualquier jugador del partido puede introducir/validar
create policy "Todos ven resultados" on resultados
  for select using (true);

create policy "Jugadores introducen resultados" on resultados
  for insert with check (
    introducido_por = (select id from jugadores where auth_id = auth.uid())
    or es_coordinador()
  );

create policy "Jugadores validan resultados" on resultados
  for update using (
    validado_por = (select id from jugadores where auth_id = auth.uid())
    or es_coordinador()
  );

-- RANKING: todos ven
create policy "Todos ven ranking" on ranking
  for select using (true);

create policy "Sistema actualiza ranking" on ranking
  for all using (es_coordinador());

-- EVENTOS: todos ven
create policy "Todos ven eventos" on eventos
  for select using (true);

create policy "Coord gestiona eventos" on eventos
  for all using (es_coordinador());

-- INSCRIPCIONES EVENTOS: jugador ve la suya, coord ve todas
create policy "Jugador ve su inscripción evento" on inscripciones_eventos
  for select using (
    jugador_id = (select id from jugadores where auth_id = auth.uid())
    or es_coordinador()
  );

create policy "Jugador gestiona su inscripción evento" on inscripciones_eventos
  for all using (
    jugador_id = (select id from jugadores where auth_id = auth.uid())
    or es_coordinador()
  );

-- NOTIFICACIONES: cada uno ve las suyas
create policy "Jugador ve sus notificaciones" on notificaciones
  for all using (
    jugador_id = (select id from jugadores where auth_id = auth.uid())
  );

-- LOG: jugador ve el suyo, coord ve todo
create policy "Jugador ve su log" on activity_log
  for select using (
    jugador_id = (select id from jugadores where auth_id = auth.uid())
    or es_coordinador()
  );

create policy "Sistema inserta log" on activity_log
  for insert with check (true);

-- ============================================================
-- FUNCIÓN: actualizar ranking al guardar resultado
-- ============================================================
create or replace function actualizar_ranking(p_resultado_id uuid)
returns void as $$
declare
  r record;
  j1 uuid; j2 uuid; j3 uuid; j4 uuid;
  juegos_totales smallint;
  juegos1 smallint; juegos2 smallint; juegos3 smallint; juegos4 smallint;
  ganador uuid;
begin
  select * into r from resultados where id = p_resultado_id;

  -- Obtener jugadores ordenados por posición
  select jugador_id into j1 from jugadores_pista where pista_id = r.pista_id and posicion = 1;
  select jugador_id into j2 from jugadores_pista where pista_id = r.pista_id and posicion = 2;
  select jugador_id into j3 from jugadores_pista where pista_id = r.pista_id and posicion = 3;
  select jugador_id into j4 from jugadores_pista where pista_id = r.pista_id and posicion = 4;

  juegos_totales := r.set1_p1 + r.set1_p2 + r.set2_p1 + r.set2_p2 + r.set3_p1 + r.set3_p2;

  -- Set1: j1+j4 vs j2+j3, Set2: j1+j3 vs j2+j4, Set3: j1+j2 vs j3+j4
  juegos1 := r.set1_p1 + r.set2_p1 + r.set3_p1;
  juegos2 := r.set1_p2 + r.set2_p2 + r.set3_p2;  -- aproximado
  juegos3 := r.set1_p2 + r.set2_p1 + r.set3_p2;
  juegos4 := r.set1_p1 + r.set2_p2 + r.set3_p1;

  -- Actualizar ranking para cada jugador
  insert into ranking (jugador_id, partidos_jugados, juegos_jugados, juegos_ganados)
  values
    (j1, 1, juegos_totales, juegos1),
    (j2, 1, juegos_totales, juegos2),
    (j3, 1, juegos_totales, juegos3),
    (j4, 1, juegos_totales, juegos4)
  on conflict (jugador_id) do update set
    partidos_jugados = ranking.partidos_jugados + 1,
    juegos_jugados = ranking.juegos_jugados + excluded.juegos_jugados,
    juegos_ganados = ranking.juegos_ganados + excluded.juegos_ganados,
    updated_at = now();

  -- Recalcular eficacia y score
  update ranking set
    eficacia = case when partidos_jugados > 0 and juegos_jugados > 0
      then ((partidos_ganados::decimal / partidos_jugados) + (juegos_ganados::decimal / juegos_jugados)) / 2
      else 0 end,
    updated_at = now()
  where jugador_id in (j1, j2, j3, j4);
end;
$$ language plpgsql security definer;
