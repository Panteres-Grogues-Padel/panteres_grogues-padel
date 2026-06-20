# Contexto operativo — Panteres Grogues Pàdel

Documento de referencia para el estado del proyecto y decisiones recientes.

---

## Implementado hoy (20/06/2026)

### 1. Google OAuth

- **Google Cloud Console:** cliente OAuth 2.0 configurado (origen JavaScript + URI de redirección de la app).
- **Supabase Dashboard:** proveedor Google activado; **Site URL** y **Redirect URLs** apuntan al dominio de staging/producción (en local, `http://localhost:5173` o el puerto Vite).
- **Frontend:** `loginGoogle()` en `useAuth.js` con `signInWithOAuth({ provider: "google", redirectTo: window.location.origin })`.
- Login con email/contraseña sigue igual; OAuth usa flujo `allowPending: true` para jugadores nuevos o inactivos.

### 2. Onboarding — nuevos usuarios Google

- **Pantalla** `OnboardingScreen.jsx`: formulario obligatorio con 10 campos en este orden:
  - `pronombre` (Ell / Ella / Elle / Altre / Prefereixo no dir-ho)
  - `nombre`, `primer_apellido`, `segundo_apellido`
  - `nickname` (nombre visible en ranking/partidos)
  - `numero_socio`, `id_app_antigua`, `documento_identidad`
  - `email_contacto` (prellenado con email Google), `telefono`
- **RPCs:** `crear_jugador_pendiente`, `get_mi_perfil_pendiente`, `completar_onboarding` (10 parámetros).
- **Columnas nuevas en `jugadores`:** `pronombre`, `documento_identidad`, `email_contacto`.
- Migraciones: `20260620100000_onboarding_google.sql`, `20260620120000_onboarding_campos.sql`.

### 3. Pantalla «Pendent d'aprovació»

- **`PendingApprovalScreen.jsx`:** tras completar onboarding, el jugador queda con `activo = false` y ve mensaje de espera + botón cerrar sesión.
- **`authStatus`** en `useAuth.js`: `'onboarding' | 'pending' | 'active' | null`.
- El super admin activa desde Admin → **Pendents** o **Jugadors** (`editar_jugador_admin` con `p_activo = true`).

### 4. Vincular cuenta Google con jugador existente

- **RPC `vincular_jugador_existente()`:** si el email de Google coincide con un `jugadores.email` sin `auth_id`, asigna `auth_id = auth.uid()` y devuelve el perfil.
- Se invoca en `fetchJugadorSesion` antes de crear jugador pendiente (evita duplicados al migrar usuarios con email ya en BD).
- Migración: `20260620110000_vincular_jugador_google.sql`.

### 5. Flujo auth OAuth (`useAuth.js`)

1. `get_mi_perfil_jugador` (solo `activo = true`).
2. Si null y OAuth: `vincular_jugador_existente` → `get_mi_perfil_pendiente` / `crear_jugador_pendiente`.
3. Sin nombre → `authStatus = 'onboarding'`.
4. Con nombre y `activo = false` → `'pending'`.
5. `activo = true` → app normal.

### 6. Panel admin — campos onboarding

- **`mapJugadorAdminRow`:** incluye `pronombre`, `documento_identidad`, `email_contacto`, `telefono`.
- **Modal Editar jugador:** todos los campos anteriores + nombre, apellidos, nickname, email, `numero_socio`, `id_app_antigua`.
- **Lista Jugadors:** meta línea con email, `#numero_socio` y `email_contacto` si difiere del email principal.
- **Búsqueda:** incluye todos los campos del onboarding.
- **`editar_jugador_admin`:** acepta `p_pronombre`, `p_documento_identidad`, `p_email_contacto`, `p_telefono`.
- Migraciones: `20260620140000_editar_jugador_campos_onboarding.sql`, `20260620150000_editar_jugador_telefono.sql`.

### 7. Perfil — número de socio real

- **`get_perfil_jugador`** y **`get_mi_perfil_pendiente`** exponen `numero_socio` en el JSON.
- **`mapPerfilFromRpc`** mapea `numero_socio`.
- **`PerfilJugador.jsx`:** muestra `view.numero_socio` si existe; fallback a `numeroSocioPanteres(id)` solo si no hay valor en BD.
- Migración: `20260620130000_perfil_numero_socio.sql`.

### 8. Fix race condition en `completeOnboarding`

- **Problema:** tras enviar el formulario, `onAuthStateChange` podía ejecutar `aplicarSesionSupabase` en paralelo y sobrescribir `currentUser` con datos antiguos.
- **Solución:** usar directamente `res.perfil` de `completarOnboardingRpc` (sin segundo fetch `get_mi_perfil_pendiente`) + `setAuthEpoch(n + 1)` para invalidar caché de hooks (`useSlots`, etc.).

---

## Implementado hoy (09/06/2026)

### 1. Panel de administración — campos nuevos en `jugadores`

- **`primer_apellido`**, **`segundo_apellido`**, **`numero_socio`**, **`id_app_antigua`**
- **`es_super_admin`**, **`es_tesorero`** (boolean, default `false`)
- Helpers de permisos: **`es_super_admin()`**, **`es_tesorero()`**, **`es_admin_o_tesorero()`**
- Migración: `supabase/migrations/20260609100000_panel_admin.sql`

### 2. Tabla `cuotas`

- Columnas: `jugador_id`, `tipo` (`anual` | `trimestral`), `periodo`, `pagada`, `fecha_pago`, **`fecha_inicio`**, **`fecha_fin`**
- Restricción `UNIQUE (jugador_id, tipo, periodo)`
- **Período anual:** `"YYYY"` (ej. `"2026"`)
- **Período trimestral:** `"YYYY-T1"` … `"YYYY-T4"`
- Migraciones: `20260609100000_panel_admin.sql`, `20260609110000_cuotas_fechas.sql`

### 3. RPCs de administración

| RPC | Permiso | Uso |
|-----|---------|-----|
| `get_jugadores_admin` | super admin o tesorero | Listado completo de jugadores para el panel |
| `crear_jugador_admin` | solo super admin | Alta de jugador + fila en `ranking` |
| `editar_jugador_admin` | solo super admin | Edición de datos, roles (`es_coordinador`, `es_tesorero`, `es_super_admin`) y `activo` |
| `get_cuotas` | super admin o tesorero | Historial de cuotas de un jugador |
| `marcar_cuota_pagada` | super admin o tesorero | Marca cuota pagada; acepta `p_fecha_inicio` / `p_fecha_fin` opcionales |

Función auxiliar BD: **`cuotas_fechas_desde_periodo(tipo, periodo)`** — calcula rango de fechas del período.

### 4. UI — pestaña Admin

- Nueva pestaña **Admin** en `BottomNav` / `App.jsx` (visible si `es_super_admin` o `es_tesorero` vía `useAdminAccess`)
- Componentes: **`Admin.jsx`**, **`admin.css`**, hook **`useAdmin.js`**, utilidades **`adminJugador.js`**
- **4 secciones** (pestañas internas):
  - **Jugadors** (solo super admin): listado, edición modal, activar/desactivar
  - **Coordinadors** (solo super admin): asignar/quitar coordinador
  - **Cuotes** (super admin y tesorero): cuota anual y trimestral del período vigente; marcar pagada
  - **Pendents** (solo super admin): jugadores inactivos pendientes de aprobación
- El **tesorero** solo ve la sección Cuotes (resto de pestañas ocultas)
- Botón «Actualitzar llista» (solo super admin): recarga `get_jugadores_admin`

### 5. Cuotas con fechas de inicio y fin

- Cálculo automático según tipo y período (en BD y cliente):
  - Anual `"2026"`: 01/01/2026 → 31/12/2026
  - Trimestral `T1`…`T4`: Q1 01/01–31/03, Q2 01/04–30/06, Q3 01/07–30/09, Q4 01/10–31/12
- **`marcar_cuota_pagada`**: si no se pasan fechas, las calcula; el cliente también envía `p_fecha_inicio` / `p_fecha_fin` desde `fechasCuotaDesdePeriodo`
- UI: rango de fechas visible en cada tarjeta de jugador (formato `ca-ES`)
- Migración: `supabase/migrations/20260609110000_cuotas_fechas.sql`

### 6. Super admins en staging (manual)

- `manul@pa.com`, `jordib@pa.com`, `vipe@pa.com` → `es_super_admin = true` (SQL directo en staging)

---

## Implementado hoy (04/06/2026)

### 1. Validación automática al confirmar + modal

- Al pulsar «Guardar», modal en catalán: «Confirmes el resultat? Un cop confirmat s'actualitzarà el rànquing automàticament.»
- **`guardarResultado`**: guarda con `validado_por` / `validado_at` del usuario actual, llama **`actualizar_ranking`** y notifica `resultat_validat` al resto de jugadores de la pista.
- Eliminados botones «Validar» en la UI; el coordinador solo ve «Modificar» si el resultado ya estaba validado (`modificar_resultado` sigue disponible).
- `puedeValidar: false` en `resultadosUtils.js`.

### 2. Eliminada UI de mover jugadores entre partidos

- Quitados botón ↕️ en **PartidoCard**, modal **MoverJugador** y estado `moverState` en **Partidos.jsx**.
- La lógica en `usePartidos.js` / `MoverJugador.jsx` permanece en el código pero sin acceso desde la UI.

### 3. Fondo del hero personalizable (bandera / blau)

- Columna **`fondo_hero`** en `jugadores` (`bandera` | `blau`, default `bandera`).
- RPC **`actualizar_perfil_jugador`** guarda `fondo_hero`; **`get_perfil_jugador`** / **`get_mi_perfil_jugador`** lo devuelven.
- **PerfilJugador.jsx**: sección «Fons de pantalla» con dos opciones visuales (gradiente bandera / azul `#0c5673`).
- **Bienvenida.jsx**: clase `hero-pride--blau` según `currentUser.fondo_hero`.
- Migración: `supabase/migrations/20260604120000_fondo_hero.sql`

### 4. Eliminado emoji bandera LGBT del hero

- **Bienvenida.jsx**: el subtítulo de bienvenida ya no muestra 🏳️‍🌈 (se elimina al renderizar; el texto i18n no cambia).

### 5. Botón «Copiar llista clubs» (coordinador)

- En **Partidos**, solo visible para `isCoord`: copia lista plana `Partits [fecha] — [club]` con jugadores numerados por **`nombreCompleto`** (sin agrupación por pista ni nickname).
- Función `buildClubsListText()` + `handleCopyClubsList()`.

### 6. Número de pista editable por coordinador

- **PartidoCard.jsx**: input numérico «Pista» con debounce 800 ms.
- **`usePartidos.js`**: `asignarNumeroPista` → RPC **`asignar_numero_pista(p_pista_id, p_numero_pista)`**.
- Texto WhatsApp (`buildWaText`): `*Pista ${numeroPista} (${hora})*`.
- Migración: `supabase/migrations/20260604110000_rpc_asignar_numero_pista.sql`

### 7. Checkbox socio UP visible antes de las 19:00

- **DetalleSlot.jsx**: el checkbox «Sóc soci/a del Club Cornellà Up» se muestra en bloque separado siempre que `!enrolled`, aunque el slot esté cerrado.
- El botón «Confirmar inscripció» sigue apareciendo solo con `slot.abierto && !rivalSlot`; al confirmar se lee el checkbox (`es_socio` en `inscripciones`).

### 8. Apertura de slots exactamente a las 19:00

- **`useSlots.js`**: sustituido `setInterval` de 60 s por **`setTimeout`** alineado al próximo 19:00 local + listener **`visibilitychange`** para recalcular al volver a la pestaña.
- El candado desaparece a las 19:00 sin recargar la app (complementa el cron `cron-slot-abierto` para notificaciones push).

### También el mismo día

#### Coordinador del día — prioridad al apuntarse

- Tabla **`coordinador_dia`** + RPC **`es_coordinador_dia(p_slot_id)`**; `inscrito_at` mínimo al apuntarse.
- Migración: `20260602130000_coordinador_dia.sql`

#### Bloqueo de generación de partidos (resultados pendientes)

- RPC **`hay_resultados_pendientes()`**; bloqueo en Partidos antes de generar/regenerar.
- Migraciones: `20260602140000_rpc_hay_resultados_pendientes.sql`, `20260604100000_fix_hay_resultados_pendientes.sql`

#### Resultados — ventana del coordinador

- **`enVentanaCoordResultados`**: fechas pasadas o hoy (`fecha <= hoy`), igual que el jugador.

#### Sets inválidos → 0-0 y `setsDraft`

- `setParaGuardar` + toast; limpieza de **`setsDraft`** tras guardar OK en **Resultados.jsx**.

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
- **`fondo_hero`** (`bandera` | `blau`): elección de fondo del hero en perfil propio (ver punto 3 del 04/06/2026).

### Realtime

- Refresco en tiempo real en **resultados**, **inscripciones** (slots), **partidos**, **ranking** (tabla `jugadores`) y **agenda** (`eventos`, `inscripciones_eventos`).
- Tablas en publicación **`supabase_realtime`**: `partidos_generados`, `pistas_partido`, `jugadores_pista`, `jugadores`, `inscripciones`, `slots`, `eventos`, `inscripciones_eventos`, `resultados` (y `notificaciones`).
- **Resultados:** debounce 400 ms en refetch + `lastSaveRef` 2 s tras guardar para no resetear el formulario.
- **RLS `inscripciones_eventos`:** cualquier jugador activo autenticado ve todas las inscripciones (necesario para que el coordinador inscrito sea visible vía realtime).

### Slots y resultados

- **Slots:** `setTimeout` alineado a las **19:00** + `visibilitychange` en `useSlots` (ver punto 8 del 04/06/2026).
- **Inscripciones:** checkbox socio UP visible antes de apertura del slot (`DetalleSlot.jsx`).
- **Resultados:** validación automática al confirmar guardado; desbloqueo del coordinador con RPC **`modificar_resultado`** en el paso «Modificar».
- **Partidos:** número de pista manual (`asignar_numero_pista`); botón «Copiar llista clubs» para coordinadores.
- **Hero/Bienvenida:** fondo personalizable (`fondo_hero`); sin emoji 🏳️‍🌈 en subtítulo.
- **Panel admin:** pestaña Admin (`Admin.jsx`); cuotas con fechas; super admins en staging; **campos onboarding visibles/editables** (pronombre, documento, email contacto, teléfono).
- **Google OAuth + onboarding:** login Google, formulario completo, pantalla pendent, vinculación por email existente.

### Operaciones staging

- Email de prueba actualizado: `sergic@pa.com` → `sergir@pa.com` (`auth.users` + `jugadores`).
- Super admins en staging: `manul@pa.com`, `jordib@pa.com`, `vipe@pa.com` (`es_super_admin = true`, SQL manual).

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

- ~~**Google OAuth + onboarding**~~ — Implementado (20/06/2026): OAuth Google, formulario completo, pendent d'aprovació, vincular por email.
- **Email automático bienvenida** tras alta (Resend) — pendiente
- **Notificación push móvil** cuando la app está cerrada (Firebase FCM — futuro)
- **RPC `guardar_resultado`:** migrar INSERT/UPDATE de sets desde PostgREST directo (alinear con regla de escrituras)

---

## Regla importante — caché PostgREST

**Todo SELECT directo a Supabase debe hacerse vía RPC** para evitar el caché de PostgREST.

Las escrituras sensibles deben ir por **RPC** cuando afecten permisos, caché o lógica de negocio (ej. `modificar_resultado`, `actualizar_nickname_jugador`, `borrar_inscripcion`). Otros INSERT/UPDATE pueden usar API de tabla con RLS si están acotados; priorizar RPC si hay incidencias.

Las lecturas que alimentan la UI deben pasar por funciones `get_*` con `SECURITY DEFINER` cuando haya riesgo de caché o ambigüedad de embeds.

Ver también `BUGS_RESUELTOS.md` para historial de bugs y lista completa de migraciones.
