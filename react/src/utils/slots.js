export function getDiaSemanaActual(date = new Date()) {
  const today = date.getDay();
  return today === 0 ? 6 : today - 1;
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

/**
 * ¿Está abierta la lista de la semana próxima?
 * Cada slot abre exactamente 7 días antes, el mismo día de la semana a las 19:00h.
 */
export function isNextWeekSlotOpen(slot, now = new Date()) {
  const diaActual = getDiaSemanaActual(now);
  const ds = normalizeDiaSemana(slot);
  if (ds == null) return true;

  if (diaActual > ds) return true;
  if (diaActual === ds && now.getHours() >= 19) return true;
  return false;
}

/**
 * ¿Lista abierta para apuntarse?
 * - Semana actual: todos los días están siempre abiertos.
 * - Semana próxima: usar `isNextWeekSlotOpen` cuando haga falta distinguirla.
 */
export function isSlotOpen(slot, options = {}) {
  if (options.semana === "proxima") return isNextWeekSlotOpen(slot, options.now);
  return true;
}

export function isBajaWarning(slot) {
  const ahora = new Date();
  const diaActual = getDiaSemanaActual(ahora);
  return diaActual === slot.diaSemana && ahora.getHours() >= 7;
}
