/** Zona horaria de la app (España peninsular, con DST automático). */
export const APP_TIMEZONE = "Europe/Madrid";

export function parseInstant(value) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** YYYY-MM-DD del instante en calendario de Madrid. */
export function formatYmdMadrid(value) {
  const date = parseInstant(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(date);
}

export function hoyMadridStr(now = new Date()) {
  return formatYmdMadrid(now);
}

export function getHourMadrid(now = new Date()) {
  const h = new Intl.DateTimeFormat("es-ES", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    hour12: false
  }).format(now);
  return Number(h);
}

export function getMinuteMadrid(now = new Date()) {
  const m = new Intl.DateTimeFormat("es-ES", {
    timeZone: APP_TIMEZONE,
    minute: "numeric"
  }).format(now);
  return Number(m);
}

/** 0=Lun … 6=Dom según calendario de Madrid. */
export function getDiaSemanaMadrid(date = new Date()) {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short"
  }).format(date);
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[wd] ?? 0;
}

export function formatDateTimeMadrid(value, options = {}) {
  const date = parseInstant(value);
  if (!date) return "";
  return date.toLocaleString("es-ES", { timeZone: APP_TIMEZONE, ...options });
}

export function formatTimeMadrid(value) {
  return formatDateTimeMadrid(value, { hour: "2-digit", minute: "2-digit" });
}

export function formatDateMadrid(value, options = {}) {
  const date = parseInstant(value);
  if (!date) return "";
  return date.toLocaleDateString("es-ES", { timeZone: APP_TIMEZONE, ...options });
}

/** Suma días a YYYY-MM-DD (calendario, sin cambio de zona). */
export function addDaysYmd(ymd, n) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
