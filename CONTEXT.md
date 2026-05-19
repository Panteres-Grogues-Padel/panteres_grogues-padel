# Contexto operativo — Panteres Grogues Pàdel

Documento de referencia para el estado del proyecto y decisiones recientes.

---

## Implementado hoy (19/05/2026)

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

---

## Pendientes añadidos

- **Onboarding nuevos jugadores:** formulario de bienvenida + email automático con Resend
- **Nickname:** columna `nickname` en `jugadores`, mostrar en ranking y perfil
- **Notificación push móvil** cuando la app está cerrada (Firebase FCM — futuro)

---

## Regla importante — caché PostgREST

**Todo SELECT directo a Supabase debe hacerse vía RPC** para evitar el caché de PostgREST.

Las escrituras (INSERT, UPDATE, DELETE) pueden usar la API de tabla con RLS; las lecturas que alimentan la UI deben pasar por funciones `get_*` con `SECURITY DEFINER` cuando haya riesgo de caché o ambigüedad de embeds.

Ver también `BUGS_RESUELTOS.md` para historial de bugs y lista completa de migraciones.
