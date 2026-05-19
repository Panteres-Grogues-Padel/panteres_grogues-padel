# Contexto operativo — Panteres Grogues Pàdel

## Notificación «slot abierto» (19:00 Madrid)

**Antes (Opción A):** el cliente React (`useSlots.js`) enviaba la notificación solo si la app estaba abierta en la ventana 19:00–19:04 (`esAperturaListaProximaHoy`).

**Ahora:** Edge Function **`cron-slot-abierto`** + **pg_cron** a las **17:00 UTC** (≈ 19:00 en horario de verano España). La función es **idempotente** gracias a la RPC `notificacion_duplicada`.

### Flujo

1. `get_slots_apertura_hoy()` — slots activos con `hora_cierre`, cuyo `dia_semana` coincide con hoy (Europe/Madrid).
2. `get_jugadores_activos()` — todos los jugadores con `activo = true`.
3. Por cada par (slot, jugador): si no existe duplicado (`tipo = slot_abierto`, título y texto fijos), `INSERT` en `notificaciones`.

### Despliegue

```bash
supabase db push
supabase functions deploy cron-slot-abierto
```

Luego ejecutar `supabase/cron_slot_abierto_schedule.sql` (Vault con `service_role_key`) o crear el job en **Dashboard → Cron** apuntando a la función.

### RPCs

| RPC | Uso |
|-----|-----|
| `get_slots_apertura_hoy` | Slots que abren inscripción hoy |
| `get_jugadores_activos` | Destinatarios |
| `notificacion_duplicada` | Evitar duplicados (compatible con `service_role`) |

La Opción A en el cliente puede mantenerse como refuerzo; el cron es la fuente fiable para todos los jugadores.
