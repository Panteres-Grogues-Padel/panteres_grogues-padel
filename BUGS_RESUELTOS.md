# Bugs resueltos e implementaciones — Panteres Grogues Pàdel

Registro de incidencias corregidas y funcionalidades entregadas en la app React + Supabase.

---

## Bugs resueltos

- **Inscripciones no persistían entre sesiones** — Causa: caché PostgREST en SELECT directo. Solución: RPC `get_inscripciones`.
- **Producción sin `get_inscripciones`** (16/07/2026) — Causa: la RPC existía en staging pero **no estaba versionada** en `supabase/migrations/`. Solución: aplicar en prod + migración `20250515120000_get_inscripciones.sql` + `migration repair --status applied`.
- **Vercel producción servía el prototipo `index.html`** — Causa: Root Directory / Output incorrectos (no Vite/`dist`). Solución: `react/vercel.json` (Vite, `dist`) + settings del proyecto `panteres-grogues-padel-production`.
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
- **Nickname editable por cualquier jugador en perfil** — Solución: solo coordinador puede cambiar el nickname visible desde `PerfilJugador` (Ranking); RPC `actualizar_nickname_jugador` + política RLS para coordinadores.
- **Nombre real visible en ranking o perfil** — Solución: `getNombreVisible()` en toda la app (nickname si existe; si no, `nombre` corto). El nombre completo no se muestra en la UI.
- **Ranking sin sanciones ni `ocultar_telefon` en listados** — Solución: `get_ranking` fusiona nickname con fallback, `sancionat`/`sancio_fins` y `ocultar_telefon` en el objeto `jugadores`; `mapRankingRow` alinea el fallback de privacidad del teléfono.
- **Realtime no refrescaba UI** (resultados, inscripciones, partidos, ranking, agenda) — Solución: suscripciones `postgres_changes` en hooks + tablas en publicación `supabase_realtime` (`partidos_generados`, `pistas_partido`, `jugadores_pista`, `jugadores`, `inscripciones`, `slots`, `eventos`, `inscripciones_eventos`, `resultados`).
- **Formulario de resultados se reseteaba al guardar** (coordinador/jugador) — Solución: debounce 400 ms en refetch realtime de resultados + `lastSaveRef` (2 s) para ignorar eventos propios tras `guardarResultado`.
- **Coordinador inscrito en eventos no visible para otros** — Causa: RLS SELECT en `inscripciones_eventos` solo devolvía la fila propia. Solución: política para que cualquier jugador activo autenticado vea todas las inscripciones de eventos.
- **Teléfono/Instagram del perfil no persistían al guardar** — Causa: `contactForm` vacío sobrescribía BD. Solución: inicializar `contactForm` al abrir perfil con datos de `view`/RPC.
- **Checkbox «ocultar teléfono» se desmarcaba al guardar** — Causa: `mostrar_telefono` legacy en `true` mientras `ocultar_telefon` era `true`; `mapPerfilFromRpc` aplicaba fallback incorrecto. Solución: `actualizar_perfil_jugador` sincroniza ambas columnas; `get_ranking` expone `ocultar_telefon`; fallback coherente en `useRanking` y `PerfilJugador`.
- **Candado de slots no desaparecía a las 19:00 sin recargar** — Solución inicial: `setInterval` 60 s. Mejora 04/06/2026: `setTimeout` alineado exactamente a las 19:00 + `visibilitychange` para recalcular `isSlotOpen` al volver a la pestaña.
- **Desbloquear resultado validado vía PostgREST** — Violaba regla de escrituras sensibles y podía afectar caché/permisos. Solución: RPC `modificar_resultado(p_resultado_id)` (solo coordinador).
- **Nombre completo visible en perfil propio** — Eliminado el subtítulo «Nom complet» en `PerfilJugador`; el dato sigue en BD pero no se muestra en la app.
- **Coordinador no veía ayer en calendario de Resultados** — Causa: `enVentanaCoordResultados` limitaba a «semana pasada» + hoy. Solución: ventana `fecha <= hoy` (misma visibilidad de fechas que el jugador; permisos de edición siguen por rol).
- **UI de resultados mostraba marcador inválido tras guardar** — Causa: `setsDraft` tenía prioridad sobre datos recargados de BD. Solución: limpiar draft del partido tras `onGuardar` con `ok` + `loadResultados()`.
- **Generación de partidos con resultados sin validar** — Solución: RPC `hay_resultados_pendientes()` (incluye hoy con `introducido_por` y sin validar); bloqueo en Partidos antes de generar/regenerar.
- **`hay_resultados_pendientes` ignoraba pendientes de hoy** — Causa: filtro `fecha < CURRENT_DATE`. Solución: `fecha <= CURRENT_DATE` + `introducido_por IS NOT NULL`.
- **Sanción no actualizaba sesión del jugador** — Solución: `patchCurrentUser` / `refreshCurrentJugador` al sancionar o desancionar el perfil propio desde Ranking.
- **Inscripción bloqueada por sanción con criterio incorrecto** — Solución: comparar fecha del partido del slot con `sancio_fins` (`fechaSlot <= sancio_fins`).
- **Marcadores inválidos guardados tal cual** — Solución: `setParaGuardar` normaliza a 0-0 + `warning` en respuesta y toast en App.
- **Botones «Validar» redundantes tras nuevo flujo** — Solución: validación automática en `guardarResultado` con modal de confirmación; `puedeValidar: false`.
- **UI de mover jugadores sin lógica operativa** — Solución: eliminados botón ↕️, modal `MoverJugador` y props `onOpenMover`/`onMover` en Partidos/PartidoCard (lógica backend intacta).
- **Checkbox socio UP oculto con slot cerrado** — El usuario no podía marcar «soci Up» antes de las 19:00. Solución: checkbox en bloque separado en `DetalleSlot.jsx` visible con `!enrolled` independientemente de `slot.abierto`; confirmación sigue condicionada a apertura.
- **Emoji 🏳️‍🌈 en subtítulo del hero** — Solución: eliminado al renderizar en `Bienvenida.jsx` (texto i18n sin cambiar).
- **Perfil mostraba número de socio generado (hash del UUID)** en lugar del valor real de BD — Solución: `numero_socio` en RPCs de perfil + `mapPerfilFromRpc` + `PerfilJugador.jsx` muestra el campo real con fallback al hash solo si está vacío. Migración: `20260620130000_perfil_numero_socio.sql`.
- **Datos incorrectos tras completar onboarding Google** (teléfono, etc. de sesión anterior) — Causa: race entre `completeOnboarding()` y listener `onAuthStateChange` → `aplicarSesionSupabase`. Solución: usar `res.perfil` de `completarOnboardingRpc` directamente (sin refetch) + `setAuthEpoch` al completar.
- **Nickname no visible en lista de apuntados tras inscribirse** — Causa: update optimista en `apuntarEnSlot` solo incluía `nombre` sin `nickname`. Solución: incluir `nickname` en `jugadores` optimista + `reloadInscripciones()` tras INSERT (`useSlots.js`). Commit `de216da`.
- **Detalle de slot se cerraba al apuntarse** — Causa: `useEffect` en `Jugar.jsx` ponía `showLista(false)` al cambiar `slotsVisibles` tras `reloadInscripciones`. Solución: no cerrar detalle si `showLista` y el slot sigue existiendo por `id`; solo cerrar si el slot desaparece del listado.

### Operaciones (staging)

- Email de usuario de prueba actualizado: `sergic@pa.com` → `sergir@pa.com` en `auth.users` y `jugadores`.
- Super admins asignados manualmente: `manul@pa.com`, `jordib@pa.com`, `vipe@pa.com` (`es_super_admin = true`).

### Operaciones (producción — 16/07/2026)

- Proyecto Supabase `tjgjxwzxikoblbprxqwt`; migraciones + baseline aplicadas; buckets `avatars`/`assets`.
- Google OAuth producción; Edge Functions + crons + Vault `service_role_key`.
- Super admin: `mls.manuls@gmail.com`.
- Vercel: `panteres-grogues-padel-production.vercel.app` (rama `main`); staging en `panteres-grogues-padel.vercel.app` (rama `staging`).

---

## Funcionalidades implementadas

- Inscripciones con cierre por hora (`hora_cierre` en tabla `slots`)
- Generación de partidos con franjas horarias (outdoor/indoor por franja)
- Horarios asignados aleatoriamente a las pistas (`shufflePistasPlan`)
- Regeneración de partidos (borra anteriores: resultados → jugadores_pista → pistas → partidos_generados antes de insertar)
- Resultados con parejas por set americano (pos1+4 vs 2+3, pos1+3 vs 2+4, pos1+2 vs 3+4)
- Validación automática al confirmar guardado (modal catalán) + modificación de resultados validados solo por coordinador (`modificar_resultado`)
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
- Pestaña Resultados: coordinador ve fechas pasadas y hoy; jugador introduce solo hoy/ayer en sus partidos
- Log de actividad en Bienvenida
- **Nickname visible** en ranking, partidos y perfil vía `getNombreVisible`; edición solo por coordinador (`actualizar_nickname_jugador`)
- **Perfil:** teléfono, Instagram, ocultar teléfono; sin mostrar nombre completo en UI
- **Realtime** en resultados, inscripciones (slots), partidos, jugadores/ranking y agenda (eventos + inscripciones_eventos)
- **Apertura de listas a las 19:00** sin relogar: `setTimeout` alineado a 19:00 + `visibilitychange` en `useSlots`
- **Modificar resultado validado:** desbloqueo con RPC `modificar_resultado`; re-guardar valida de nuevo y actualiza ranking
- **Coordinador del día:** tabla `coordinador_dia` + RPC `es_coordinador_dia`; al apuntarse, `inscrito_at` mínimo para prioridad en titulares/reservas
- **Bloqueo generar partidos** si hay resultados introducidos sin validar (`hay_resultados_pendientes`)
- **Resultados coordinador:** calendario y permisos con cualquier fecha pasada o hoy (`enVentanaCoordResultados`)
- **Sets inválidos:** guardado automático como 0-0 (`setParaGuardar`) + toast de aviso al jugador
- **Sancionar jugador:** baja automática de inscripciones en el período + notificaciones a coordinadores y jugador (`sancionar_jugador` / `desancionar_jugador`)
- **Reservas en Partidos:** inscritos no en pista, ordenados por `inscrito_at`
- **Generar partidos:** titulares por orden de llegada (tope `4 × pistas`), reordenados por ranking al formar grupos de 4
- **Copiar llista clubs** (coordinador): lista plana con nombres completos, sin agrupación por pista (`buildClubsListText`)
- **Número de pista manual:** input en PartidoCard + RPC `asignar_numero_pista`; reflejado en texto WhatsApp
- **Notificación `resultat_validat`** a otros jugadores de la pista tras confirmar resultado
- **Fondo del hero personalizable:** `fondo_hero` en perfil (`bandera` gradiente pride | `blau` `#0c5673`); RPC `actualizar_perfil_jugador` + sección en PerfilJugador
- **Checkbox socio UP** visible en detalle de slot antes de las 19:00; valor `es_socio` leído al confirmar inscripción
- **Panel de administración:** pestaña Admin con 4 secciones (Jugadors, Coordinadors, Cuotes, Pendents); acceso super admin o tesorero (tesorero solo Cuotes)
- **Campos admin en jugadores:** `primer_apellido`, `segundo_apellido`, `numero_socio`, `id_app_antigua`, `es_super_admin`, `es_tesorero`
- **Cuotas de socio:** tabla `cuotas` (anual/trimestral, período, pagada, `fecha_pago`, `fecha_inicio`, `fecha_fin`); marcar pagada desde panel; fechas calculadas automáticamente por tipo/período
- **Gestión jugadores admin:** crear, editar, activar/desactivar, asignar coordinador; RPCs `get_jugadores_admin`, `crear_jugador_admin`, `editar_jugador_admin`, `get_cuotas`, `marcar_cuota_pagada`
- **Google OAuth:** login con cuenta Google (Google Cloud Console + Supabase Auth); redirect a `window.location.origin`; **producción** configurada y publicada (16/07/2026)
- **Login — «Com accedir?»:** modal con pasos de Google + onboarding (`LoginScreen.jsx`, i18n ca/es)
- **Onboarding nuevos usuarios:** formulario completo (`OnboardingScreen.jsx`) — pronombre, nombre, apellidos, nickname, numero_socio, id_app_antigua, documento_identidad, email_contacto, telefono; RPC `completar_onboarding`
- **Pantalla pendent d'aprovació:** `PendingApprovalScreen.jsx` para jugadores con `activo = false` tras onboarding; activación manual por super admin
- **Vincular Google con jugador existente:** RPC `vincular_jugador_existente` — empareja por email si `auth_id IS NULL`
- **Panel admin — campos onboarding:** pronombre, documento_identidad, email_contacto, telefono visibles, editables y buscables; `editar_jugador_admin` ampliada (migraciones `20260620140000`, `20260620150000`)
- **Número de socio real en perfil:** columna `numero_socio` de BD en lugar del hash `PG-XXXXXX` derivado del UUID
- **Apuntarse a slot:** nickname correcto en lista de inscritos (optimista + reload); usuario permanece en `DetalleSlot` tras inscribirse

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
| `get_perfil_jugador` | `p_jugador_id` | Perfil público de un jugador |
| `get_mi_perfil_jugador` | — | Perfil del jugador autenticado |
| `actualizar_perfil_jugador` | `p_jugador_id`, teléfono, instagram, ocultar, nickname, fondo_hero | Actualizar contacto, privacidad y fondo del hero (propietario) |
| `actualizar_nickname_jugador` | `p_jugador_id`, `p_nickname` | Cambiar nickname visible (solo coordinador) |
| `modificar_resultado` | `p_resultado_id` | Desbloquear resultado validado para edición (solo coordinador) |
| `hay_resultados_pendientes` | — | Bloquear generación de partidos si hay resultados sin validar (hasta hoy inclusive) |
| `es_coordinador_dia` | `p_slot_id` | Comprobar si el usuario es coordinador del día del slot |
| `sancionar_jugador` | `p_jugador_id`, `p_fins` | Sancionar, bajar inscripciones afectadas y notificar |
| `desancionar_jugador` | `p_jugador_id` | Quitar sanción |
| `asignar_numero_pista` | `p_pista_id`, `p_numero_pista` | Asignar número de pista manualmente (solo coordinador) |
| `get_jugadores_admin` | — | Listado de jugadores para panel admin (super admin o tesorero) |
| `crear_jugador_admin` | nombre, apellidos, nickname, email, numero_socio | Alta de jugador (solo super admin) |
| `editar_jugador_admin` | `p_jugador_id` + campos opcionales (incl. pronombre, documento, email_contacto, telefono) | Editar jugador, roles y `activo` (solo super admin) |
| `get_cuotas` | `p_jugador_id` | Cuotas de un jugador (super admin o tesorero) |
| `marcar_cuota_pagada` | `p_jugador_id`, `p_tipo`, `p_periodo`, `p_fecha_inicio`?, `p_fecha_fin`? | Marcar cuota pagada; fechas opcionales (calculadas si null) |
| `crear_jugador_pendiente` | — | Crea fila `jugadores` inactiva para OAuth sin perfil (SECURITY DEFINER) |
| `get_mi_perfil_pendiente` | — | Perfil del jugador autenticado sin exigir `activo = true` |
| `completar_onboarding` | pronombre, nombre, apellidos, nickname, numero_socio, id_app_antigua, documento, email_contacto, telefono | Guarda datos del formulario de bienvenida |
| `vincular_jugador_existente` | — | Vincula `auth_id` a jugador existente por coincidencia de email |

Funciones auxiliares en BD: `es_coordinador()` (RLS), `es_super_admin()`, `es_tesorero()`, `es_admin_o_tesorero()`, `cuotas_fechas_desde_periodo(tipo, periodo)`.

---

## Pendientes

- ~~Notificación slot abierto a las 19h~~ — Edge Function `cron-slot-abierto` + pg_cron 17:00 UTC (ver `CONTEXT.md`)
- ~~Nickname en ranking y perfil~~ — Implementado con `getNombreVisible` y RPC coordinador
- Horarios aleatorios — pendiente probar con 8+ jugadores
- Sistema de padrinos/ahijados — implementado (ver `CONTEXT.md`); revisar UX si hace falta
- Migrar `guardarResultado` a RPC (INSERT/UPDATE de sets) para alinear con regla PostgREST
- ~~Google OAuth~~ — Implementado (20/06/2026): OAuth + onboarding + pendent + vincular por email
- ~~Migración usuarios desde Google Sheets~~ — Descartado (24/06/2026): producción vía OAuth + onboarding; jugadores/coordinadores existentes: actualizar `email` en admin antes del primer login Google para vincular con `vincular_jugador_existente`
- Organigrama en Coordinación
- i18n catalán/inglés
- Penalización ranking por inactividad (2 meses sin jugar → bajada máx. 30 posiciones)

---

## Regla importante — caché PostgREST

**Todo SELECT directo a Supabase debe hacerse vía RPC** para evitar el caché de PostgREST.

Las escrituras (INSERT, UPDATE, DELETE) pueden usar la API de tabla con RLS; las lecturas que alimentan la UI deben pasar por funciones `get_*` con `SECURITY DEFINER` cuando haya riesgo de caché o ambigüedad de embeds.

---

## Migraciones Supabase relevantes

- `20250501000000_initial_schema.sql` — baseline DDL (producción vacía)
- `20250515120000_get_inscripciones.sql` — RPC `get_inscripciones(p_desde, p_hasta)`
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
- `20260527140000_perfil_telefon_instagram.sql`
- `20260527150000_actualizar_perfil_nickname.sql`
- `20260528134900_get_ranking_nickname_fallback.sql`
- `20260528135800_realtime_jugadores_ranking_refresh.sql`
- `20260528151000_coord_actualizar_nickname_jugador.sql`
- `20260528160000_get_ranking_fusion.sql`
- `20260528190000_realtime_partidos_jugadores.sql`
- `20260529100000_rls_inscripciones_eventos_select.sql`
- `20260529110000_get_ranking_ocultar_telefon.sql`
- `20260529120000_fix_actualizar_perfil_mostrar_telefono.sql`
- `20260529130000_rpc_modificar_resultado.sql`
- `20260602110000_sancionar_jugador_baja_notificacio.sql`
- `20260602120000_sancionar_jugador_notificacio_jugador.sql`
- `20260602130000_coordinador_dia.sql`
- `20260602140000_rpc_hay_resultados_pendientes.sql`
- `20260604100000_fix_hay_resultados_pendientes.sql`
- `20260604110000_rpc_asignar_numero_pista.sql`
- `20260604120000_fondo_hero.sql`
- `20260609100000_panel_admin.sql`
- `20260609110000_cuotas_fechas.sql`
- `20260620100000_onboarding_google.sql`
- `20260620110000_vincular_jugador_google.sql`
- `20260620120000_onboarding_campos.sql`
- `20260620130000_perfil_numero_socio.sql`
- `20260620140000_editar_jugador_campos_onboarding.sql`
- `20260620150000_editar_jugador_telefono.sql`
