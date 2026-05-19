import { useEffect, useMemo, useRef } from "react";
import { hoyLocalStr } from "../../utils/dates";
import {
  buildMesesCalendarioResultados,
  celdasMesCalendario,
  DOW_CORTO,
  MESES_RESULTADOS
} from "../../utils/resultadosCalendar";

export default function ResultadosCalendario({ fechasConPartidos, fechaSel, onSelectFecha }) {
  const hoy = hoyLocalStr();
  const fechasSet = useMemo(() => new Set(fechasConPartidos), [fechasConPartidos]);
  const meses = useMemo(() => buildMesesCalendarioResultados(fechasConPartidos), [fechasConPartidos]);
  const selectedMonthRef = useRef(null);

  useEffect(() => {
    if (!fechaSel || !selectedMonthRef.current) return;
    selectedMonthRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [fechaSel]);

  if (!fechasConPartidos.length) {
    return <p className="slot-meta resultados-cal-empty">No hay partidos con resultados en esta ventana</p>;
  }

  return (
    <div className="resultados-cal-scroll" role="region" aria-label="Calendario de partidos">
      {meses.map(({ year, month }) => {
        const mesKey = `${year}-${month}`;
        const esMesSeleccionado =
          fechaSel && fechaSel.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`);

        return (
          <section
            key={mesKey}
            ref={esMesSeleccionado ? selectedMonthRef : undefined}
            className="resultados-cal-month"
          >
            <h3 className="resultados-cal-month__title">
              {MESES_RESULTADOS[month]} {year}
            </h3>
            <div className="cal-grid resultados-cal-grid">
              {DOW_CORTO.map((d) => (
                <div key={d} className="cal-dow">
                  {d}
                </div>
              ))}
              {celdasMesCalendario(year, month).map((cell) => {
                if (cell.type === "pad") {
                  return <div key={cell.key} className="cal-day cal-day--pad" aria-hidden="true" />;
                }

                const hasPartidos = fechasSet.has(cell.fecha);
                const isSelected = fechaSel === cell.fecha;
                const isToday = cell.fecha === hoy;

                const className = [
                  "resultados-cal-day",
                  "cal-day",
                  hasPartidos ? "resultados-cal-day--has" : "resultados-cal-day--muted",
                  isSelected ? "resultados-cal-day--selected" : "",
                  isToday ? "resultados-cal-day--today" : ""
                ]
                  .filter(Boolean)
                  .join(" ");

                if (!hasPartidos) {
                  return (
                    <div key={cell.key} className={className} aria-disabled="true">
                      <span className="cal-num">{cell.day}</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={className}
                    aria-pressed={isSelected}
                    aria-label={`${cell.day} de ${MESES_RESULTADOS[month]}, con partidos`}
                    onClick={() => onSelectFecha(cell.fecha)}
                  >
                    <span className="cal-num">{cell.day}</span>
                    <span className="res-cal-dot" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
