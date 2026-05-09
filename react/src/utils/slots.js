export function getDiaSemanaActual() {
  const today = new Date().getDay();
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
 * ¿Lista abierta para apuntarse? 0=Lun … 6=Dom (getDiaSemanaActual).
 * Regla: la lista abre el mismo día de la semana 7 días antes a las 19:00.
 * Para domingo: abre el domingo anterior a las 19h; entre lunes y sábado ya ha pasado ese momento.
 */
export function isSlotOpen(slot) {
  const ahora = new Date();
  const diaActual = getDiaSemanaActual();
  const ds = slot.diaSemana;

  // Domingo (6): diaActual > ds nunca se cumple (6 es el último día del ciclo 0–6).
  // Lun–Sáb: ya pasó el domingo previo → lista abierta.
  if (ds === 6 && diaActual !== 6) return true;

  const diff = (ds - diaActual + 7) % 7;
  if (diff === 0) return true;
  if (diaActual > ds) return true;
  if (diaActual === ds && ahora.getHours() >= 19) return true;
  return false;
}

export function isBajaWarning(slot) {
  const ahora = new Date();
  const diaActual = getDiaSemanaActual();
  return diaActual === slot.diaSemana && ahora.getHours() >= 7;
}
