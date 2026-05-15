/** Fecha de semana (lunes) como YYYY-MM-DD, alineado con Postgres `date` y useSlots. */
export function normalizeSemanaDate(s) {
  if (s == null || s === "") return "";
  if (s instanceof Date && !Number.isNaN(s.getTime())) {
    return s.toISOString().slice(0, 10);
  }
  const m = String(s).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : String(s).slice(0, 10);
}

export function getMondayUtc(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
  return d;
}

export function formatDateUTC(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function addDaysUtc(d, n) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Lunes de la semana actual (misma convención que useSlots). */
export function getLunesSemanaActual(date = new Date()) {
  return formatDateUTC(getMondayUtc(date));
}

/** Fecha calendario local del día del slot (lunes semanaObjetivo + diaSemana 0=Lun). */
export function fechaSlotEnSemana(semanaObjetivo, diaSemana) {
  if (!semanaObjetivo || diaSemana == null) return null;
  const [y, m, day] = semanaObjetivo.split("-").map(Number);
  const monday = new Date(y, m - 1, day);
  const slotDay = new Date(monday);
  slotDay.setDate(monday.getDate() + Number(diaSemana));
  return new Date(slotDay.getFullYear(), slotDay.getMonth(), slotDay.getDate());
}

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Ventana visible en Partidos: desde hoy hasta martes de la próxima semana (2 días).
 */
export function getVentanaPartidos(now = new Date()) {
  const today = startOfLocalDay(now);
  const lunesActual = getLunesSemanaActual(now);
  const lunesProximo = formatDateUTC(addDaysUtc(getMondayUtc(now), 7));
  const maxVisible = fechaSlotEnSemana(lunesProximo, 1);
  return { today, lunesActual, lunesProximo, maxVisible };
}

/**
 * Resuelve semana objetivo y estado del slot para la pestaña Partidos.
 * - pasado: el día del partido ya pasó o queda fuera de la ventana
 * - activo: hoy o futuro próximo (incl. lun/mar próxima semana)
 */
export function resolverPartidoSlot(diaSemana, now = new Date()) {
  const ds = Number(diaSemana);
  if (!Number.isFinite(ds)) {
    return { estado: "pasado", semanaObjetivo: null, fechaPartido: null };
  }

  const { today, lunesActual, lunesProximo, maxVisible } = getVentanaPartidos(now);
  const fechaActual = fechaSlotEnSemana(lunesActual, ds);
  const fechaProxima = fechaSlotEnSemana(lunesProximo, ds);

  const enVentana = (fecha) =>
    fecha && fecha >= today && maxVisible && fecha <= maxVisible;

  if (enVentana(fechaActual)) {
    return { estado: "activo", semanaObjetivo: lunesActual, fechaPartido: fechaActual };
  }
  if (enVentana(fechaProxima) && ds <= 1) {
    return { estado: "activo", semanaObjetivo: lunesProximo, fechaPartido: fechaProxima };
  }

  const fechaRef = fechaProxima && fechaProxima >= today ? fechaProxima : fechaActual;
  return { estado: "pasado", semanaObjetivo: null, fechaPartido: fechaRef };
}

/** true si hoy es el día del partido o el día anterior. */
export function puedeGenerarPartidos(semanaObjetivo, diaSemana, now = new Date()) {
  const slotDay = fechaSlotEnSemana(semanaObjetivo, diaSemana);
  if (!slotDay) return false;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((slotDay - today) / (1000 * 60 * 60 * 24));
  return diffDays === 0 || diffDays === 1;
}

/** Valor para <input type="time" /> (HH:MM) desde Postgres `time` o string. */
export function formatHoraInput(h) {
  if (h == null || h === "") return "";
  const s = String(h).trim();
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return s.length >= 5 ? s.slice(0, 5) : s;
}
