# Contexto operativo — Panteres Grogues Pàdel

Documento de referencia para el estado del proyecto y decisiones recientes.

---

## Implementado hoy (04/06/2026)

### 1. Coordinador del día — prioridad al apuntarse

- Tabla **`coordinador_dia`** (`dia_semana` 1–7, `jugador_id`) con asignación por día de la semana.
- RPC **`es_coordinador_dia(p_slot_id)`** comprueba si el usuario autenticado es el coordinador de ese día.
- Al apuntarse, el coordinador del día recibe **`inscrito_at` mínimo** (`1970-01-01T00:00:00Z`) para quedar primero en el orden de llegada (titulares y reservas).
- Migración: `supabase/migrations/20260602130000_coordinador_dia.sql`

### 2. Bloqueo de generación de partidos (resultados pendientes)

- RPC **`hay_resultados_pendientes()`** devuelve `true` si existe algún resultado con `introducido_por` relleno, sin validar (`validado_por` / `validado_at` NULL) y `fecha <= CURRENT_DATE` (incluye hoy).
- En **Partidos**, «Generar» / «Regenerar» llama a la RPC y bloquea con mensaje si hay pendientes.
- Migraciones: `20260602140000_rpc_hay_resultados_pendientes.sql`, `20260604100000_fix_hay_resultados_pendientes.sql`

### 3. Resultados — ventana del coordinador

- **`enVentanaCoordResultados`**: el coordinador ve y gestiona resultados de **cualquier fecha pasada o hoy** (`fecha <= hoy`), igual que el jugador en el calendario; sin partidos futuros.
- Hint UI: «Pots veure tots els resultats passats» / «Puedes ver todos los resultados pasados».

### 4. Sets inválidos → 0-0 con aviso

- Al guardar, marcadores no válidos en pádel (fuera de 6-0…6-4, 7-5, 7-6) se normalizan a **0-0** vía `setParaGuardar` en `useResultados.js`.
- Respuesta `{ ok: true, warning: "…" }` + toast informativo en **App.jsx**.

### 5. `setsDraft` se limpia tras guardar

- Tras guardar con éxito, **`setsDraft`** se limpia en **Resultados.jsx** para que la UI muestre los datos de BD (p. ej. 0-0) y no el draft inválido que había escrito el jugador.

### 6. Apertura de slots exactamente a las 19:00

- **`useSlots.js`**: sustituido `setInterval` de 60 s por **`setTimeout`** alineado al próximo 19:00 local + listener **`visibilitychange`** para recalcular al volver a la pestaña.
- El candado desaparece a las 19:00 sin recargar la app (complementa el cron `cron-slot-abierto` para notificaciones push).

### 7. Botón «Copiar llista clubs» (coordinador)

- En **Partidos**, solo visible para `isCoord`: copia lista plana `Partits [fecha] — [club]` con jugadores numerados por **`nombreCompleto`** (sin agrupación por pista ni nickname).
- Función `buildClubsListText()` + `handleCopyClubsList()`.

### 8. Número de pista editable por coordinador

- **PartidoCard.jsx**: input numérico «Pista» con debounce 800 ms.
- **`usePartidos.js`**: `asignarNumeroPista` → RPC **`asignar_numero_pista(p_pista_id, p_numero_pista)`**.
- Texto WhatsApp (`buildWaText`): `*Pista ${numeroPista} (${hora})*`.
- Migración: `supabase/migrations/20260604110000_rpc_asignar_numero_pista.sql`

### 9. Validación automática al confirmar + modal

- Al pulsar «Guardar», modal en catalán: «Confirmes el resultat? Un cop confirmat s'actualitzarà el rànquing automàticament.»
- **`guardarResultado`**: guarda con `validado_por` / `validado_at` del usuario actual, llama **`actualizar_ranking`** y notifica `resultat_validat` al resto de jugadores de la pista.
- Eliminados botones «Validar» en la UI; el coordinador solo ve «Modificar» si el resultado ya estaba validado (`modificar_resultado` sigue disponible).
- `puedeValidar: false` en `resultadosUtils.js`.

### 10. Eliminada UI de mover jugadores entre partidos

- Quitados botón ↕️ en **PartidoCard**, modal **MoverJugador** y estado `moverState` en **Partidos.jsx**.
- La lógica en `usePartidos.js` / `MoverJugador.jsx` permanece en el código pero sin acceso desde la UI.
- Commit: `fix: eliminar UI de mover jugadores entre partidos`

### Sanciones

- **`sancionar_jugador`**: además de marcar `sancionat` / `sancio_fins`, da de baja inscripciones cuya fecha de partido cae en el período de sanción y notifica a **coordinadores** y al **jugador sancionado**.
- **Bloqueo de inscripción** en cliente: compara la **fecha del slot** (`fechaPartidoFromSlot`) con `sancio_fins` (`fechaSlot <= sancio_fins` → no puede apuntarse).
- Tras sancionar/desancionar el perfil propio, **`patchCurrentUser`** / **`refreshCurrentJugador`** actualizan `currentUser` en tiempo real (sin relogar).
- Migraciones: `20260602110000_sancionar_jugador_baja_notificacio.sql`, `20260602120000_sancionar_jugador_notificacio_jugador.sql`

### Partidos — titulares, reservas y generación

- **Titulares** en Jugar/Partidos: primeros N inscritos por **`inscrito_at`** (orden de llegada).
- **Reservas** en Partidos: inscritos no asignados a ninguna pista, ordenados por **`inscrito_at`**.
- Al **generar partidos**: candidatos = primeros `4 × pistas` por llegada; dentro de ese cupo se **reordenan por ranking** y se agrupan en parejas de 4 por nivel.

---

## Cambios recientes

### Nickname y nombres en UI

- El **nickname** (nombre visible) solo lo edita el **coordinador** desde el perfil en Ranking (`actualizar_nickname_jugador` + RLS).
- **`getNombreVisible()`** en toda la app: muestra nickname si existe; si no, `nombre` corto. El **nombre completo no se muestra** en ningún sitio (eliminado subtítulo en perfil propio; sigue en BD).
- **`get_ranking`** devuelve nickname con fallback, `sancionat`/`sancio_fins` y `ocultar_telefon` en el objeto `jugadores`.

### Perfil y privacidad

- **`contactForm`** se inicializa con teléfono, Instagram y `ocultar_telefon` al abrir el perfil.
- **`actualizar_perfil_jugador`** sincroniza `ocultar_telefon` y `mostrar_telefono` (columna legacy) para que el checkbox y `mapPerfilFromRpc` no se contradigan.

### Realtime

- Refresco en tiempo real en **resultados**, **inscripciones** (slots), **partidos**, **ranking** (tabla `jugadores`) y **agenda** (`eventos`, `inscripciones_eventos`).
- Tablas en publicación **`supabase_realtime`**: `partidos_generados`, `pistas_partido`, `jugadores_pista`, `jugadores`, `inscripciones`, `slots`, `eventos`, `inscripciones_eventos`, `resultados` (y `notificaciones`).
- **Resultados:** debounce 400 ms en refetch + `lastSaveRef` 2 s tras guardar para no resetear el formulario.
- **RLS `inscripciones_eventos`:** cualquier jugador activo autenticado ve todas las inscripciones (necesario para que el coordinador inscrito sea visible vía realtime).

### Slots y resultados

- **Slots:** `setTimeout` alineado a las **19:00** + `visibilitychange` en `useSlots` (ver punto 6 del 04/06/2026).
- **Resultados:** validación automática al confirmar guardado; desbloqueo del coordinador con RPC **`modificar_resultado`** en el paso «Modificar».
- **Partidos:** número de pista manual (`asignar_numero_pista`); botón «Copiar llista clubs» para coordinadores.

### Operaciones staging

- Email de prueba actualizado: `sergic@pa.com` → `sergir@pa.com` (`auth.users` + `jugadores`).

---

## Implementado hoy (28/05/2026)

### Sistema de padrinos/madrinas

- Columna `padrino_id` (uuid, FK nullable) añadida en tabla `jugadores`
- RPCs creadas: `get_jugadores()`, `asignar_padrino(p_ahijado_id, p_padrino_id)`
- Nueva pestaña **Padrinos** en landing page entre Utilidades e Historial
- Vista jugador: muestra su padrino/madrina y sus ahijados/as (o mensaje si no tiene)
- Vista coordinador: dos desplegables — selecciona ahijado, luego asigna padrino/madrina
- Botón quitar padrino/madrina si ya tiene uno asignado
- Hook `react/src/hooks/usePadrinos.js` — lecturas vía RPC, sin UPDATE directo
- Migración: `supabase/migrations/20250519200000_padrinos.sql`

### Calendario en Resultados

- Sustituido el desplegable de fecha por calendario de scroll vertical continuo (estilo Agenda)
- Meses desde el más antiguo con partidos hasta el actual
- Días con partidos marcados con punto amarillo (`#fde047`), seleccionables
- Día seleccionado en azul marino (`#0d1b3e`) con texto amarillo (`#fef9c3`)
- Día de hoy marcado sutilmente; días sin partidos en gris, no seleccionables
- Componentes: `ResultadosCalendario.jsx`, utilidades en `resultadosCalendar.js`
- **La lógica de introducción y validación de resultados no se ha tocado**

### Cron Edge Function — notificación slot abierto

- Creada Edge Function `supabase/functions/cron-slot-abierto/index.ts`
- Desplegada en Supabase con `supabase functions deploy cron-slot-abierto`
- Service role key guardada en Vault (`service_role_key`)
- `pg_cron` activado y cron programado: `0 17 * * *` UTC (19:00 Madrid verano; 18:00 en invierno CET)
- Idempotente vía RPC `notificacion_duplicada`
- **Sustituye la Opción A** (solo si app abierta en `useSlots.js`) — ahora funciona siempre para todos los jugadores activos

#### Flujo del cron

1. `get_slots_apertura_hoy()` — slots activos con `hora_cierre`, cuyo `dia_semana` coincide con hoy (Europe/Madrid)
2. `get_jugadores_activos()` — jugadores con `activo = true`
3. Por cada par (slot, jugador): comprobar duplicado; si no existe, insertar notificación con `tipo: slot_abierto`, título `¡Ya puedes inscribirte!`, texto `Las inscripciones para [nombre] ya están abiertas`

#### Despliegue / mantenimiento

```bash
supabase db push
supabase functions deploy cron-slot-abierto
```

Programar cron: ejecutar `supabase/cron_slot_abierto_schedule.sql` o **Dashboard → Cron** → Edge Function `cron-slot-abierto`.

Configuración en `supabase/config.toml`:

```toml
[functions.cron-slot-abierto]
verify_jwt = false
```

| RPC | Uso |
|-----|-----|
| `get_slots_apertura_hoy` | Slots que abren inscripción hoy |
| `get_jugadores_activos` | Destinatarios del cron |
| `notificacion_duplicada` | Evitar duplicados (compatible con `service_role`) |

Migración: `supabase/migrations/20250520190000_cron_slot_abierto.sql`

### Estilo Ranking

- Filas alternas blanco (`#fff`) / amarillo suave (`#fef9c3`)
- Números de posición en azul marino (`#0d1b3e`) en negrita
- Jugador propio destacado con fondo azul claro y borde izquierdo navy
- Textos secundarios (PJ, PG, eficacia, etc.) en `#2d3d6b`
- Sin destacado especial para el 1.º puesto (eliminado tras prueba)

### Otros fixes del día

- Icono 📜 en la fila Actividad/Historial de la landing (alineado con Utilidades 🗺️ y Padrinos 🤝)
- `get_jugadores` en `usePadrinos.js` llamado con parámetros vacíos explícitos: `rpc('get_jugadores', {})`

### Cambios implementados del 20/05 al 28/05

#### Perfil y datos de jugador

- Añadida foto de perfil en la app y persistencia visual en componentes principales.
- Perfil ampliado con teléfono e Instagram.
- Se corrigió la visibilidad del teléfono oculto para que no se muestre a nadie.
- Edición de `nickname` solo por coordinador; `getNombreVisible` en toda la app (ver **Cambios recientes**).

#### Notificaciones y navegación

- Implementados deep links para notificaciones.
- Corregido deep link de notificación `slot_obert` para abrir correctamente la pantalla **Jugar**.

#### Inscripciones y partidos

- Corregida apertura de `slot_obert`: acceso a **Jugar** sin preselección incorrecta de slot.
- Vista de partidos ajustada para cargar automáticamente el partido del jugador en el día actual.
- Se restauró el desplegable de días en Partidos tras regresión.
- Ajustado filtro temporal para mostrar solo el día correcto cuando aplica.
- Corrección de fecha de mayo en vista de inscripciones.

#### Utilidades, sanciones y UX

- Añadido reglamento en Utilidades.
- Reorganizadas Utilidades en dos filas para separar acciones y mejorar lectura.
- Sanciones visibles en perfil para todos los jugadores (no solo coordinadores).
- Añadida opción de copiar lista de apuntados para compartir por WhatsApp.
- Eliminado login demo.

#### Diseño y estilos

- Ajustes visuales del Topbar y del overlay de Hero.
- Restauración del avatar del Hero con tamaños originales.

---

## Pendientes añadidos

- **Onboarding nuevos jugadores:** formulario de bienvenida + email automático con Resend
- **Notificación push móvil** cuando la app está cerrada (Firebase FCM — futuro)
- **RPC `guardar_resultado`:** migrar INSERT/UPDATE de sets desde PostgREST directo (alinear con regla de escrituras)

---

## Regla importante — caché PostgREST

**Todo SELECT directo a Supabase debe hacerse vía RPC** para evitar el caché de PostgREST.

Las escrituras sensibles deben ir por **RPC** cuando afecten permisos, caché o lógica de negocio (ej. `modificar_resultado`, `actualizar_nickname_jugador`, `borrar_inscripcion`). Otros INSERT/UPDATE pueden usar API de tabla con RLS si están acotados; priorizar RPC si hay incidencias.

Las lecturas que alimentan la UI deben pasar por funciones `get_*` con `SECURITY DEFINER` cuando haya riesgo de caché o ambigüedad de embeds.

Ver también `BUGS_RESUELTOS.md` para historial de bugs y lista completa de migraciones.
