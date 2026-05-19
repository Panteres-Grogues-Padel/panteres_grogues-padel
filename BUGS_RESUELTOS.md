# Bugs resueltos e implementaciones — Panteres Grogues Pàdel

Registro de incidencias corregidas y funcionalidades entregadas en la app React + Supabase.

---

## Bugs resueltos

- **Inscripciones no persistían entre sesiones** — Causa: caché PostgREST en SELECT directo. Solución: RPC `get_inscripciones`.
- **Partidos no persistían tras logout** — Causa: caché PostgREST. Solución: RPC `get_partidos_slot` / `get_partidos_generados`.
- **Resultados no persistían al cambiar pestaña** — Causa: caché PostgREST y vaciado transitorio de `partidos`. Solución: RPC `get_resultados` + mantener estado en hooks durante recargas.
- **Error 403 notificaciones** — Causa: política RLS sin INSERT para coordinadores. Solución: política `Coordinador inserta notificaciones`.
- **Baja de slot no actualizaba UI** — Causa: race condition con `void` sin esperar recarga. Solución: `await reloadInscripciones()` tras `borrar_inscripcion`.
- **Días pasados aparecían en Jugar** — Solucionado con filtrado por fecha/semana actual desde el día de hoy.
- **Ranking mostraba nombres incorrectos** — Solucionado: RPC `get_ranking()` y mapeo correcto de `nombre` en la respuesta.
- **Pago confirmado no se mostraba a jugadores** — Causa: caché PostgREST en lectura de `inscripciones_eventos`. Solución: RPC `get_inscripciones_eventos` (incluye `pago_confirmado`).
- **Inscripciones no visibles tras logout/login** — Carrera `getSession()` vs estado React. Solución: `authEpoch`, `onAuthStateChange`, recarga al iniciar sesión.
- **Estado de inscripciones del usuario anterior** — Solución: `setInscripciones([])` al cambiar usuario + `reloadInscripciones` tras logout.
- **Coordinador aparecía apuntado sin fila en BD** — Solución: comparación estricta por UUID en `DetalleSlot`.
- **Coordinador podía apuntarse a dos slots del mismo día** — Solución: comprobación en servidor antes del INSERT.
- **Notificaciones tardaban ~30 s en la UI** — Causa: tabla fuera de publicación Realtime. Solución: migración Realtime + actualización optimista en `postgres_changes`.
- **Error embed `inscripciones_eventos` + `jugadores`** — Causa: ambigüedad PostgREST (FK `jugador_id` vs `pago_confirmado_por`). Solución: RPC `get_inscripciones_eventos`.
- **Generar partidos sin inscritos** — Causa: semana incorrecta en query (fecha del slot vs lunes UTC). Solución: `getLunesSemanaActual()` al buscar inscripciones.
- **Marcar pago se revertía en UI** — Causa: race entre actualización optimista y `loadEventos` / caché. Solución: optimista → RPC → revertir si falla; recarga de inscripciones solo vía RPC tras confirmar.

---

## Funcionalidades implementadas

- Inscripciones con cierre por hora (`hora_cierre` en tabla `slots`)
- Generación de partidos con franjas horarias (outdoor/indoor por franja)
- Horarios asignados aleatoriamente a las pistas (`shufflePistasPlan`)
- Regeneración de partidos (borra anteriores: resultados → jugadores_pista → pistas → partidos_generados antes de insertar)
- Resultados con parejas por set americano (pos1+4 vs 2+3, pos1+3 vs 2+4, pos1+2 vs 3+4)
- Validación y modificación de resultados solo por coordinador
- Ranking con fórmula: **eficacia × (1 − penalización)**, donde **penalización = MAX(0, (9 − partidos) × 0,06)**
- Sistema de notificaciones completo (campana, badge, panel, Realtime, borrado automático a los 14 días)
- Notificaciones: apuntarse, baja, recordatorio 2 días (por inscripción), apertura lista 19:00, pista completa, resultado introducido/validado, partidos generados/regenerados
- Agenda con vista anual en grid (12 meses) → detalle por mes; crear/borrar eventos; fechas inicio/fin (`fecha_fin`); inscripciones; marcar pago (coordinador)
- Saludo dinámico según hora Madrid (buenos días / tardes / noches)
- Pestaña renombrada **Coordinación** (antes «Sección»)
- Información de la organización en Utilidades (Bienvenida)
- Timezone corregido (hora Europe/Madrid en saludo y lógica de slots)
- Panel de notificaciones: todas (leídas y no leídas), orden reciente; no leídas destacadas
- Pestaña Partidos: dropdown solo día de hoy; coordinador genera/regenera solo hoy
- Pestaña Resultados: ventanas por rol (coordinador vs jugador)
- Log de actividad en Bienvenida

---

## RPCs creadas en Supabase

| RPC | Parámetros | Uso |
|-----|------------|-----|
| `get_inscripciones` | `p_desde`, `p_hasta` | Inscripciones a slots (sin caché PostgREST) |
| `get_partidos_slot` | `p_slot_id`, `p_semana` | Partidos generados de un slot/semana |
| `get_partidos_generados` | `p_slot_id`, `p_semana` | Listado histórico de partidos generados |
| `get_resultados` | `p_pista_ids` | Resultados por pistas |
| `get_ranking` | — | Ranking con nombres y estadísticas |
| `get_notificaciones` | `p_jugador_id` | Notificaciones del jugador autenticado |
| `get_eventos` | — | Eventos de agenda (sin caché PostgREST) |
| `get_inscripciones_eventos` | `p_evento_id` (opcional) | Inscripciones a eventos + `pago_confirmado` + nombres |
| `notificacion_duplicada` | `p_jugador_id`, `p_tipo`, `p_titulo`, `p_texto` | Evitar notificaciones duplicadas |
| `get_slots_apertura_hoy` | — | Slots que abren inscripción hoy (19h Madrid) |
| `get_jugadores_activos` | — | Jugadores activos (cron notificaciones) |
| `borrar_inscripcion` | `p_jugador_id`, `p_slot_id`, `p_semana` | Baja de inscripción a slot |
| `marcar_pago_inscripcion_evento` | `p_inscripcion_id`, `p_pagado` | Marcar/desmarcar pago (coordinador) |
| `actualizar_ranking` | `p_resultado_id` | Recalcular ranking tras validar resultado |

Funciones auxiliares en BD: `es_coordinador()` (RLS).

---

## Pendientes

- ~~Notificación slot abierto a las 19h~~ — Edge Function `cron-slot-abierto` + pg_cron 17:00 UTC (ver `CONTEXT.md`)
- Horarios aleatorios — pendiente probar con 8+ jugadores
- Sistema de padrinos/ahijados
- Google OAuth
- Organigrama en Coordinación
- Migración usuarios desde Google Sheets
- i18n catalán/inglés
- Penalización ranking por inactividad (2 meses sin jugar → bajada máx. 30 posiciones)

---

## Regla importante — caché PostgREST

**Todo SELECT directo a Supabase debe hacerse vía RPC** para evitar el caché de PostgREST.

Las escrituras (INSERT, UPDATE, DELETE) pueden usar la API de tabla con RLS; las lecturas que alimentan la UI deben pasar por funciones `get_*` con `SECURITY DEFINER` cuando haya riesgo de caché o ambigüedad de embeds.

---

## Migraciones Supabase relevantes

- `20250515130500_get_partidos_slot.sql`
- `20250515140000_get_resultados.sql`
- `20250515150000_coord_borra_resultados.sql`
- `20250516120000_get_notificaciones.sql`
- `20250516130000_notificacion_duplicada.sql`
- `20250516140000_notificaciones_realtime.sql`
- `20250516150000_get_ranking.sql`
- `20250519140000_get_inscripciones_eventos.sql`
- `20250519150000_eventos_hora_aforo.sql`
- `20250519160000_get_eventos.sql`
- `20250519170000_eventos_fecha_fin_y_pago.sql`
- `20250519180000_marcar_pago_pagado_param.sql`
- `20250519190000_get_inscripciones_eventos_pago.sql`
- `20250520190000_cron_slot_abierto.sql`
