# Bugs resueltos e implementaciones — Panteres Grogues Pàdel

Registro de incidencias corregidas y funcionalidades entregadas en la app React + Supabase.

---

## Bugs resueltos

- **Inscripciones no persistían entre sesiones** — Causa: caché PostgREST en SELECT directo. Solución: RPC `get_inscripciones`.
- **Baja de slot no actualizaba UI** — Causa: race condition con `void` sin esperar recarga. Solución: `await reloadInscripciones()` tras `borrar_inscripcion`.
- **Partidos no persistían tras logout** — Causa: caché PostgREST. Solución: RPC `get_partidos_slot` / `get_partidos_generados`.
- **Resultados no persistían al cambiar pestaña** — Causa: caché PostgREST y vaciado transitorio de `partidos`. Solución: RPC `get_resultados` + mantener estado en hooks durante recargas.
- **Error 403 al crear notificaciones** — Causa: política RLS sin INSERT para coordinadores. Solución: política `Coordinador inserta notificaciones`.
- **Días pasados aparecían en pestaña Jugar** — Solucionado: filtro por semana actual desde el día de hoy (`diaSemana >= diaActual`).
- **Inscripciones no visibles tras logout/login** — Carrera `getSession()` vs estado React. Solución: `authEpoch`, `onAuthStateChange`, sin guarda que aborte la carga.
- **Estado de inscripciones del usuario anterior** — Solución: `setInscripciones([])` al cambiar usuario + `reload` tras logout.
- **Coordinador aparecía apuntado sin fila en BD** — Solución: comparación estricta por UUID en `DetalleSlot`.
- **Coordinador podía apuntarse a dos slots del mismo día** — Solución: comprobación en servidor antes del INSERT.
- **Notificaciones tardaban ~30 s en la UI** — Causa: tabla fuera de publicación Realtime + recarga RPC lenta. Solución: `supabase_realtime` + actualización optimista en `postgres_changes`.

---

## Funcionalidades implementadas

- Sistema de inscripciones con cierre por hora (`hora_cierre` en tabla `slots`)
- Generación de partidos con franjas horarias (outdoor/indoor por franja)
- Regeneración de partidos (borra anteriores: resultados → jugadores_pista → pistas → partidos_generados)
- Resultados con parejas por set (americano: pos1+4 vs 2+3, etc.)
- Validación de resultados solo por coordinador
- Sistema de notificaciones completo (campana, badge, panel con Realtime)
- Notificaciones: apuntarse, baja, recordatorio 2 días (por inscripción), pista completa, resultado introducido, resultado validado, partidos generados/regenerados
- Borrado automático de notificaciones con más de 14 días al cargar `useNotificaciones`
- Panel de notificaciones: todas (leídas y no leídas), ordenadas de más reciente a más antigua; no leídas destacadas visualmente
- Pestaña Partidos: dropdown solo día de hoy; coordinador genera/regenera solo hoy
- Pestaña Resultados: ventanas por rol (coordinador vs jugador), modificar resultado validado
- Log de actividad en Bienvenida

---

## RPCs creadas en Supabase

| RPC | Parámetros | Uso |
|-----|------------|-----|
| `get_inscripciones` | `p_desde`, `p_hasta` | Lectura de inscripciones sin caché PostgREST |
| `get_partidos_slot` | `p_slot_id`, `p_semana` | Partidos generados de un slot/semana |
| `get_partidos_generados` | `p_slot_id`, `p_semana` | Listado histórico de partidos generados |
| `get_resultados` | `p_pista_ids` | Resultados por pistas |
| `get_notificaciones` | `p_jugador_id` | Notificaciones del jugador autenticado |
| `notificacion_duplicada` | `p_jugador_id`, `p_tipo`, `p_titulo`, `p_texto` | Evitar envíos duplicados (recordatorios, pista completa) |
| `borrar_inscripcion` | `p_jugador_id`, `p_slot_id`, `p_semana` | Baja de inscripción |

Otras funciones relacionadas: `actualizar_ranking`, `es_coordinador()` (RLS).

---

## Detalle histórico (referencia)

### Caché PostgREST — inscripciones

Sustituido SELECT directo por `get_inscripciones` con rango de fechas (-2 / +4 semanas desde el lunes actual). Commit: `12f114f`.

### Cierre de inscripción por día y hora

`isSlotOpen` en `slots.js`: día pasado → cerrado; hoy tras `hora_cierre` → cerrado; semana próxima → apertura 7 días antes a las 19:00. Commit: `bd2b20a`.

### Resultados a 0 al cambiar pestaña

`usePartidos` mantiene listado válido en recargas; `useResultados` no vacía si `partidos` está transitoriamente vacío. Commit: `0d8187e`.

### Migraciones Supabase relevantes

- `20250515130500_get_partidos_slot.sql`
- `20250515140000_get_resultados.sql`
- `20250515150000_coord_borra_resultados.sql`
- `20250516120000_get_notificaciones.sql`
- `20250516130000_notificacion_duplicada.sql`
- `20250516140000_notificaciones_realtime.sql`
