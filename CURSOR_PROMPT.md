# CURSOR PROMPT — Panteres Grogues Pàdel

## Contexto del proyecto

Estás construyendo una **PWA (Progressive Web App)** para gestionar la sección de pàdel del colectivo LGTBQ+ **Panteres Grogues** de Cornellà de Llobregat (Barcelona).

El archivo `index.html` contiene el **prototipo funcional completo** — toda la lógica de negocio, el diseño visual y los flujos de usuario están implementados y probados. Tu tarea es convertir ese prototipo en una app React real conectada a Supabase.

---

## Stack técnico

- **Frontend:** React + Vite (PWA)
- **Estilos:** CSS puro (sin Tailwind) — mantener los CSS variables del prototipo
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Deploy:** Vercel
- **Autenticación:** Email/contraseña + Google OAuth

---

## Estructura de carpetas objetivo

```
panteres_grogues-padel/
├── index.html              ← prototipo original (referencia)
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css           ← extraer estilos del prototipo
│   ├── lib/
│   │   └── supabase.js     ← cliente Supabase
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useJugadores.js
│   │   ├── useSlots.js
│   │   ├── usePartidos.js
│   │   ├── useResultados.js
│   │   ├── useRanking.js
│   │   ├── useEventos.js
│   │   └── useNotificaciones.js
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Topbar.jsx
│   │   │   ├── BottomNav.jsx
│   │   │   └── BottomSheet.jsx
│   │   ├── auth/
│   │   │   └── LoginScreen.jsx
│   │   ├── bienvenida/
│   │   │   └── Bienvenida.jsx
│   │   ├── ranking/
│   │   │   ├── Ranking.jsx
│   │   │   └── PerfilJugador.jsx
│   │   ├── jugar/
│   │   │   ├── Jugar.jsx
│   │   │   └── DetalleSlot.jsx
│   │   ├── partidos/
│   │   │   ├── Partidos.jsx
│   │   │   ├── PartidoCard.jsx
│   │   │   └── MoverJugador.jsx
│   │   ├── resultados/
│   │   │   ├── Resultados.jsx
│   │   │   ├── FormularioResultado.jsx
│   │   │   └── CalendarioResultados.jsx
│   │   ├── agenda/
│   │   │   ├── Agenda.jsx
│   │   │   └── EventoCard.jsx
│   │   └── seccion/
│   │       └── Seccion.jsx
│   └── utils/
│       ├── ranking.js      ← cálculos de eficacia y penalización
│       ├── slots.js        ← lógica de apertura de listas
│       └── nombres.js      ← nombreCorto()
```

---

## Roles de usuario

### Jugador normal
- Ver ranking, perfil propio y de otros
- Apuntarse y darse de baja de slots
- Ver sus partidos generados
- Confirmar asistencia a su propio partido
- Meter y validar resultados
- Inscribirse en eventos de agenda
- Ver sus notificaciones

### Coordinador
Todo lo anterior más:
- Generar y regenerar partidos
- Asignar horas e indoor por partido
- Mover jugadores entre partidos
- Meter resultados de cualquier partido
- Validar pagos en eventos
- Ver log de actividad de todos los jugadores
- Crear/editar eventos en agenda

Los coordinadores se identifican por `jugadores.es_coordinador = true`.

---

## Lógica de negocio crítica

### Apertura de listas
La lista de cada slot abre exactamente **7 días antes a las 19:00h**. Es decir, la lista del Viernes abre el Viernes anterior a las 19:00h.

```javascript
function isSlotOpen(slot) {
  const ahora = new Date();
  const diaActual = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1; // 0=Lun
  const diff = (slot.dia_semana - diaActual + 7) % 7;
  if (diff === 0) return true; // semana actual siempre abierta
  if (diaActual > slot.dia_semana) return true; // ya pasó este día esta semana
  if (diaActual === slot.dia_semana && ahora.getHours() >= 19) return true;
  return false;
}
```

### Exclusividad por día
Un jugador no puede estar apuntado a dos slots del mismo día a la vez (ej. Lunes Up y Lunes Delfos). Si quiere cambiarse, debe darse de baja primero.

### Baja con aviso
No hay bloqueo de baja, pero si el jugador se da de baja el mismo día del partido después de las 7:00h, se muestra el mensaje: *"Si te das de baja hoy, por favor busca un@ sustitut@ para el partido"*.

### Generación de partidos
Los jugadores se ordenan por ranking (score = eficacia × (1 - penalización)) y se asignan a pistas de 4 en 4. Las rotaciones de sets son:
- Set 1: 1º+4º vs 2º+3º
- Set 2: 1º+3º vs 2º+4º
- Set 3: 1º+2º vs 3º+4º

### Cálculo de ranking
```
eficacia = (partidos_ganados/partidos_jugados + juegos_ganados/juegos_jugados) / 2
penalización = { 1:0.48, 2:0.43, 3:0.38, 4:0.33, 5:0.27, 6:0.20, 7:0.13, 8:0.05, 9+:0 }
score = eficacia × (1 - penalización)
```

### Privacidad — nombre corto
En toda la app excepto en el propio perfil, los nombres se muestran como "Jose GB" (nombre + iniciales de apellidos sin puntos):
```javascript
function nombreCorto(nombreCompleto) {
  const parts = nombreCompleto.trim().split(/\s+/);
  const nombre = parts[0];
  const aps = [parts[1], parts[2]].filter(Boolean).map(a => a[0].toUpperCase()).join('');
  return nombre + (aps ? ' ' + aps : '');
}
```

---

## Variables de entorno necesarias

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

---

## Cliente Supabase (src/lib/supabase.js)

```javascript
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## Diseño visual

Mantener exactamente los colores y estilos del prototipo:

```css
:root {
  --bg: #FEFCE8;
  --bg2: #FEF9C3;
  --bg3: #FDF6A0;
  --text: #0D1B3E;
  --text2: #2D3D6B;
  --text3: #6B7FAA;
  --border: rgba(13,27,62,0.14);
  --border2: rgba(13,27,62,0.28);
  --navy: #0D1B3E;
  --radius: 8px;
  --radius-lg: 12px;
}
```

---

## Orden de implementación recomendado

### Sprint 1 — Base
1. Configurar Vite + React + Supabase
2. Auth: login email/contraseña + Google OAuth
3. Pantalla de bienvenida (landing)
4. Ranking con datos reales de Supabase

### Sprint 2 — Core
5. Jugar: listas de inscripción con apertura automática
6. Partidos: generación, horas, indoor, confirmación
7. Resultados: meter y validar

### Sprint 3 — Extras
8. Agenda: eventos, inscripción, pagos
9. Notificaciones in-app
10. Log de actividad
11. Panel coordinador: gestión de jugadores

---

## Notas importantes

- El prototipo `index.html` es la **fuente de verdad** para lógica y diseño
- Usar **Supabase Realtime** para notificaciones en tiempo real cuando se generan partidos
- Configurar **Row Level Security** — el schema SQL ya lo incluye
- La app debe funcionar como PWA instalable en móvil (manifest.json + service worker)
- Dos entornos: **staging** (rama `develop`) y **producción** (rama `main`)
- Los servidores de Supabase deben estar en **Frankfurt (EU)** para cumplir RGPD
