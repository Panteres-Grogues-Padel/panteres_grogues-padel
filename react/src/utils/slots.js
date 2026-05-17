import { getDiaSemanaMadrid, getHourMadrid, getMinuteMadrid, hoyMadridStr } from "./datetime";
import { fechaPartidoFromSlot } from "./dates";

export function getDiaSemanaActual(date = new Date()) {
  return getDiaSemanaMadrid(date);
}

/** 0=Lun … 6=Dom; unifica string/number desde PostgREST o mock. */
export function normalizeDiaSemana(slotOrDow) {
  const raw = slotOrDow != null && typeof slotOrDow === "object" ? slotOrDow.diaSemana : slotOrDow;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Exclusividad: mismo día de la semana del slot (no el mismo id). */
export function sameDiaSemanaSlot(a, b) {
  const da = normalizeDiaSemana(a);
  const db = normalizeDiaSemana(b);
  if (da == null || db == null) return false;
  return da === db;
}

/** Parsea hora_cierre (time de Postgres: "HH:MM" o "HH:MM:SS"). */
function parseHoraCierreMinutos(horaCierre) {
  if (horaCierre == null || horaCierre === "") return null;
  const m = String(horaCierre).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Fecha calendario local del día del slot dentro de la semana (lunes = semanaObjetivo). */
function dateFromSemanaObjetivo(semanaObjetivo, diaSemana) {
  const [y, m, day] = semanaObjetivo.split("-").map(Number);
  const monday = new Date(y, m - 1, day);
  const slotDay = new Date(monday);
  slotDay.setDate(monday.getDate() + diaSemana);
  return startOfLocalDay(slotDay);
}

function isPastHoraCierre(horaCierre, now) {
  const closeMins = parseHoraCierreMinutos(horaCierre);
  if (closeMins == null) return false;
  const nowMins = getHourMadrid(now) * 60 + getMinuteMadrid(now);
  return nowMins >= closeMins;
}

/**
 * ¿Está abierta la lista de la semana próxima?
 * Cada slot abre exactamente 7 días antes, el mismo día de la semana a las 19:00h.
 */
export function isNextWeekSlotOpen(slot, now = new Date()) {
  const diaActual = getDiaSemanaActual(now);
  const ds = normalizeDiaSemana(slot);
  if (ds == null) return true;

  if (diaActual > ds) return true;
  if (diaActual === ds && getHourMadrid(now) >= 19) return true;
  return false;
}

/**
 * ¿Lista abierta para apuntarse?
 * - Día del slot ya pasado (en la semana objetivo): cerrada.
 * - Día del slot es hoy: cerrada si la hora actual supera hora_cierre.
 * - Día futuro, semana próxima: abre 7 días antes el mismo día de la semana a las 19:00h.
 * - Día futuro, semana actual: abierta.
 */
export function isSlotOpen(slot, options = {}) {
  const now = options.now ?? new Date();
  const ds = normalizeDiaSemana(slot);
  if (ds == null) return true;

  const horaCierre = slot.horaCierre ?? slot.hora_cierre;
  const semanaObjetivo = options.semanaObjetivo;

  if (semanaObjetivo) {
    const slotDayYmd = fechaPartidoFromSlot(semanaObjetivo, ds);
    const todayYmd = hoyMadridStr(now);

    if (todayYmd > slotDayYmd) return false;
    if (todayYmd === slotDayYmd) {
      return !isPastHoraCierre(horaCierre, now);
    }
    if (options.semana === "proxima") return isNextWeekSlotOpen(slot, now);
    return true;
  }

  if (options.semana === "proxima") return isNextWeekSlotOpen(slot, now);
  return true;
}

export function isBajaWarning(slot) {
  const ahora = new Date();
  const diaActual = getDiaSemanaActual(ahora);
  return diaActual === slot.diaSemana && getHourMadrid(ahora) >= 7;
}
