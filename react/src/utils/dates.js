import { t } from "../i18n";

const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const WEEKDAY_SHORT_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
];
const MONTH_SHORT_KEYS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export const DATE_LOCALE = "ca-ES";

export function weekdayName(diaSemana) {
  const key = WEEKDAY_KEYS[Number(diaSemana)];
  return key ? t(`dates.weekdays.${key}`) : "";
}

export function weekdayShortName(diaSemana) {
  const key = WEEKDAY_SHORT_KEYS[Number(diaSemana)];
  return key ? t(`dates.weekdaysShort.${key}`) : "";
}

export function monthName(monthIndex) {
  const key = MONTH_KEYS[Number(monthIndex)];
  return key ? t(`dates.months.${key}`) : "";
}

export function monthShortName(monthIndex) {
  const key = MONTH_SHORT_KEYS[Number(monthIndex)];
  return key ? t(`dates.monthsShort.${key}`) : "";
}

export function monthShortCapitalName(monthIndex) {
  const key = MONTH_SHORT_KEYS[Number(monthIndex)];
  return key ? t(`dates.monthsShortCapital.${key}`) : "";
}

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

function addDaysLocal(fecha, n) {
  const x = new Date(fecha);
  x.setDate(x.getDate() + n);
  return startOfLocalDay(x);
}

export function formatFechaLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function hoyLocalStr(now = new Date()) {
  return formatFechaLocal(startOfLocalDay(now));
}

export function ayerLocalStr(now = new Date()) {
  return formatFechaLocal(addDaysLocal(startOfLocalDay(now), -1));
}

export function mananaLocalStr(now = new Date()) {
  return formatFechaLocal(addDaysLocal(startOfLocalDay(now), 1));
}

/** YYYY-MM-DD del día del partido (semana lunes + diaSemana 0=Lun). */
export function fechaPartidoFromSlot(semanaObjetivo, diaSemana) {
  const d = fechaSlotEnSemana(semanaObjetivo, diaSemana);
  return d ? formatFechaLocal(d) : "";
}

/** Nom del dia en català (ex. «dimarts») per textos de notificació. */
export function formatDiaPartidoLabel(fechaStr) {
  if (!fechaStr) return "";
  const d = new Date(`${fechaStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return fechaStr;
  const label = d.toLocaleDateString(DATE_LOCALE, { weekday: "long" });
  return label.charAt(0).toLowerCase() + label.slice(1);
}

/** Lunes–domingo de la semana calendario anterior. */
export function getRangoSemanaPasada(now = new Date()) {
  const today = startOfLocalDay(now);
  const thisMonday = addDaysLocal(today, -getDiaSemanaLocal(today));
  const lastMonday = addDaysLocal(thisMonday, -7);
  const lastSunday = addDaysLocal(lastMonday, 6);
  return { desde: formatFechaLocal(lastMonday), hasta: formatFechaLocal(lastSunday) };
}

/** Coordinador: semana pasada (lun–dom) + hoy; sin futuros. */
export function enVentanaCoordResultados(fechaStr, now = new Date()) {
  if (!fechaStr) return false;
  const hoy = hoyLocalStr(now);
  if (fechaStr > hoy) return false;
  if (fechaStr === hoy) return true;
  const { desde, hasta } = getRangoSemanaPasada(now);
  return fechaStr >= desde && fechaStr <= hasta;
}

/** Días con partidos visibles en el dropdown de Resultados (orden cronológico). */
export function getDiasDisponiblesResultados(partidos, isCoord, now = new Date()) {
  const hoy = hoyLocalStr(now);
  const fechas = new Set();
  for (const p of partidos ?? []) {
    const f = p.fechaPartido;
    if (!f || f > hoy) continue;
    if (isCoord) {
      if (enVentanaCoordResultados(f, now)) fechas.add(f);
    } else {
      fechas.add(f);
    }
  }
  return [...fechas].sort();
}

/** 0=Lun … 6=Dom (convención slots). */
export function getDiaSemanaLocal(fecha) {
  const d = startOfLocalDay(fecha);
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}

/** Lunes de la semana local que contiene `fecha` (YYYY-MM-DD). */
export function getLunesDeSemanaLocal(fecha) {
  const d = startOfLocalDay(fecha);
  const dow = getDiaSemanaLocal(d);
  const monday = new Date(d);
  monday.setDate(d.getDate() - dow);
  return formatFechaLocal(monday);
}

/**
 * Fechas de la ventana Partidos: ayer, hoy y los 2 próximos días calendario con slot.
 */
export function getFechasVentanaPartidos(slotsCatalog, now = new Date()) {
  const slots = slotsCatalog ?? [];
  const today = startOfLocalDay(now);
  const yesterday = addDaysLocal(today, -1);
  const fechas = [yesterday, today];

  let cursor = addDaysLocal(today, 1);
  while (fechas.filter((f) => f > today).length < 2) {
    const ds = getDiaSemanaLocal(cursor);
    if (slots.some((s) => Number(s.diaSemana) === ds)) {
      fechas.push(new Date(cursor));
    }
    cursor = addDaysLocal(cursor, 1);
    if ((cursor - today) / 86400000 > 21) break;
  }

  return fechas;
}

/**
 * Opciones del dropdown Partidos: cada slot en ayer, hoy y próximos 2 días con slot.
 * modo: 'ayer' (solo consulta) | 'hoy' | 'proximo'
 */
export function buildOpcionesDropdownPartidos(slotsCatalog, now = new Date()) {
  const slots = [...(slotsCatalog ?? [])];
  const today = startOfLocalDay(now);
  const yesterday = addDaysLocal(today, -1);

  const ventana = [
    { fecha: yesterday, modo: "ayer" },
    { fecha: today, modo: "hoy" }
  ];

  let cursor = addDaysLocal(today, 1);
  while (ventana.filter((v) => v.modo === "proximo").length < 2) {
    const ds = getDiaSemanaLocal(cursor);
    if (slots.some((s) => Number(s.diaSemana) === ds)) {
      ventana.push({ fecha: new Date(cursor), modo: "proximo" });
    }
    cursor = addDaysLocal(cursor, 1);
    if ((cursor - today) / 86400000 > 21) break;
  }

  const opciones = [];
  for (const { fecha, modo } of ventana) {
    const ds = getDiaSemanaLocal(fecha);
    const semanaObjetivo = getLunesDeSemanaLocal(fecha);
    const fechaKey = formatFechaLocal(fecha);
    for (const slot of slots) {
      if (Number(slot.diaSemana) !== ds) continue;
      opciones.push({
        id: `${slot.id}:${fechaKey}`,
        slotId: slot.id,
        semanaObjetivo,
        fechaPartido: startOfLocalDay(fecha),
        modo,
        slot,
        diaSemana: ds
      });
    }
  }

  opciones.sort(
    (a, b) =>
      a.fechaPartido - b.fechaPartido ||
      Number(a.diaSemana) - Number(b.diaSemana) ||
      String(a.slot.club).localeCompare(String(b.slot.club))
  );
  return opciones;
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
