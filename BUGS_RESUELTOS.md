# Bugs resueltos — Panteres Grogues Pàdel

Registro de incidencias corregidas en la app React + Supabase.

---

## Inscripciones no visibles tras logout y nuevo login

**Síntoma:** El usuario se inscribe correctamente (la fila existe en Supabase), pero tras cerrar sesión y volver a entrar la UI no muestra la inscripción. En modo incógnito funcionaba.

**Causa:** En `useSlots.js`, el efecto de carga vaciaba `inscripciones` y luego abortaba si `getSession()` devolvía `null` (carrera entre `currentUser` en React y la sesión de Supabase en navegadores con `localStorage` previo). No había reintento.

**Solución:**
- Eliminada la guarda de `getSession()` en la lectura de inscripciones.
- Añadido `authEpoch` en `useAuth.js` (incrementa en login/logout/restauración de sesión) como dependencia de recarga en `useSlots`.
- Listener `onAuthStateChange` para recargar inscripciones en `SIGNED_IN`, `INITIAL_SESSION` y `TOKEN_REFRESHED`.
- Commit: `be1f4bb`

---

## Caché de PostgREST devolviendo inscripciones obsoletas

**Síntoma:** Tras login, el SELECT de inscripciones podía devolver datos cacheados incorrectos en el navegador normal.

**Causa:** PostgREST cacheaba respuestas del SELECT directo sobre `inscripciones`.

**Solución:**
- Sustituido el SELECT directo por la RPC `get_inscripciones` con `p_desde` y `p_hasta` (carga inicial y `reloadInscripciones`).
- Commit: `12f114f`

---

## Estado de inscripciones no se limpiaba al cambiar de usuario / logout

**Síntoma:** Tras logout o cambio de sesión, la UI mostraba inscripciones del usuario anterior aunque Supabase no tuviera filas para el usuario actual.

**Causa:** Estado de React en memoria sin reset completo entre sesiones.

**Solución:**
- `setInscripciones([])` inmediato al detectar cambio de usuario en `useSlots`.
- En `App.jsx`, `window.location.reload()` tras `logout()` para resetear todo el árbol de React.
- Commits relacionados: `de74204`, `d9c79f8`, `2368109`

---

## Coordinador aparecía apuntado sin inscripción en BD

**Síntoma:** El coordinador (`10000000-0000-4000-b000-000000000001`) veía “apuntado” en slots donde no tenía fila en `inscripciones`.

**Causa:** Comparación débil por nombre en `DetalleSlot.jsx` y lógica de coincidencia de IDs insuficientemente estricta.

**Solución:**
- `jugadorIdCoincide` exige UUID exacto en ambos lados.
- `DetalleSlot.jsx`: sin fallback por nombre cuando existe `jugadorId` UUID.

---

## Exclusividad por día no aplicada al coordinador

**Síntoma:** El coordinador podía apuntarse a dos slots del mismo día.

**Causa:** La comprobación dependía solo del estado local; no había lectura previa fiable en Supabase.

**Solución:**
- `leerInscripcionesJugadorSemana()` consulta por `jugador_id` + `semana` antes del INSERT, sin excepción por rol.

---

## Cierre de inscripción por día y hora

**Síntoma:** Las listas de la semana actual permanecían abiertas aunque el día del slot ya hubiera pasado o fuera el mismo día pasada la hora de cierre.

**Solución:**
- `isSlotOpen` en `slots.js` con reglas:
  - Día del slot ya pasado (en `semanaObjetivo`) → cerrado
  - Día del slot es hoy → cerrado si hora actual ≥ `hora_cierre`
  - Día futuro, semana próxima → apertura 7 días antes a las 19:00 (`isNextWeekSlotOpen`)
  - Día futuro, semana actual → abierto
- Carga de `hora_cierre` desde la tabla `slots`.
- Commit: `bd2b20a`

---

## Resultados a 0 al cambiar de pestaña (coordinador)

**Síntoma:** Tras guardar un resultado y navegar entre pestañas, Resultados mostraba todo a 0.

**Causa:** Al desmontar `Resultados`, `partidos` llegaba vacío momentáneamente; `useResultados` hacía `setResultados([])`.

**Solución:**
- `usePartidos` mantiene el último listado válido durante recargas transitorias.
- `useResultados` no borra resultados cuando `partidos` está vacío de forma transitoria.
- Commit: `0d8187e` (posteriormente hubo revert parcial del rediseño de Resultados en `6cb194d`; el fix de persistencia en hooks puede convivir con la UI revertida según el estado actual de `main`).

---

## Limpieza

- Eliminados `console.log` temporales con prefijo `[debug]` en `useSlots.js` — commit `46948ec`.
