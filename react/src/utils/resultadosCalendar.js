import { formatFechaLocal, getDiaSemanaLocal, monthName, weekdayShortName } from "./dates";

export function mesCalendarioResultados(monthIndex) {
  return monthName(monthIndex);
}

export function dowCalendarioCorto(diaSemana) {
  return weekdayShortName(diaSemana);
}

/** Meses desde el más antiguo con partido hasta el mes actual (inclusive). */
export function buildMesesCalendarioResultados(fechasConPartidos, now = new Date()) {
  const fechas = [...(fechasConPartidos ?? [])].sort();
  const endY = now.getFullYear();
  const endM = now.getMonth();

  if (!fechas.length) {
    return [{ year: endY, month: endM }];
  }

  const first = new Date(`${fechas[0]}T12:00:00`);
  let y = first.getFullYear();
  let m = first.getMonth();
  const months = [];

  while (y < endY || (y === endY && m <= endM)) {
    months.push({ year: y, month: m });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }

  return months;
}

/** Celdas de un mes: relleno inicial + días (fecha YYYY-MM-DD). */
export function celdasMesCalendario(year, month) {
  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startPad = getDiaSemanaLocal(first);
  const cells = [];

  for (let i = 0; i < startPad; i += 1) {
    cells.push({ type: "pad", key: `pad-${year}-${month}-${i}` });
  }

  for (let d = 1; d <= lastDay; d += 1) {
    const fecha = formatFechaLocal(new Date(year, month, d));
    cells.push({ type: "day", key: fecha, fecha, day: d });
  }

  return cells;
}
