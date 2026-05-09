/** Fecha de semana (lunes) como YYYY-MM-DD, alineado con Postgres `date` y useSlots. */
export function normalizeSemanaDate(s) {
  if (s == null || s === "") return "";
  if (s instanceof Date && !Number.isNaN(s.getTime())) {
    return s.toISOString().slice(0, 10);
  }
  const m = String(s).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : String(s).slice(0, 10);
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
