import { useMemo, useState } from "react";
import { hoyMadridStr } from "../../utils/datetime";
import { jugadoresCoinciden } from "../../utils/jugador";
import { avatarClassFromNombre, initialsFromNombre } from "../../utils/avatar";

const DS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];
const DSH = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const TIPO_LABEL = { torneo: "Torneo", social: "Social", otro: "Actividad" };

function parejaNombre(parejaRef, inscritos) {
  if (!parejaRef) return "";
  const hit = inscritos.find((i) => jugadoresCoinciden(i.jugadorId, parejaRef));
  return hit?.nombre ?? String(parejaRef);
}

export default function Agenda({
  eventos,
  currentUser,
  isCoord,
  onApuntarse,
  onBaja,
  onValidarPago,
  onSeleccionarPareja
}) {
  const now = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selDateStr, setSelDateStr] = useState(null);
  const [openDetailId, setOpenDetailId] = useState(null);
  const [listaEventoId, setListaEventoId] = useState(null);
  const listaEvento = listaEventoId != null ? eventos.find((x) => x.id === listaEventoId) ?? null : null;

  const evByDate = useMemo(() => {
    const m = new Map();
    for (const e of eventos) {
      const arr = m.get(e.fecha) ?? [];
      arr.push(e);
      m.set(e.fecha, arr);
    }
    return m;
  }, [eventos]);

  const evsMes = useMemo(() => {
    if (selDateStr) return eventos.filter((e) => e.fecha === selDateStr);
    return eventos
      .filter((e) => {
        const d = new Date(`${e.fecha}T12:00:00`);
        return d.getFullYear() === calYear && d.getMonth() === calMonth;
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [eventos, calYear, calMonth, selDateStr]);

  const listTitle = selDateStr
    ? (() => {
        const d = new Date(`${selDateStr}T12:00:00`);
        return `${d.getDate()} de ${MESES[d.getMonth()]}`;
      })()
    : `Eventos de ${MESES[calMonth]}`;

  function changeMonth(delta) {
    let m = calMonth + delta;
    let y = calYear;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    setCalMonth(m);
    setCalYear(y);
    setSelDateStr(null);
  }

  const first = new Date(calYear, calMonth, 1);
  const last = new Date(calYear, calMonth + 1, 0);
  let startDow = first.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const tod = hoyMadridStr(now);

  return (
    <div>
      <h2 className="section-title">Agenda</h2>

      <div className="cal-nav">
        <button type="button" className="btn btn-sm" onClick={() => changeMonth(-1)}>
          ←
        </button>
        <span className="cal-month">
          {MESES[calMonth]} {calYear}
        </span>
        <button type="button" className="btn btn-sm" onClick={() => changeMonth(1)}>
          →
        </button>
      </div>

      <div className="legend">
        <div className="leg-item">
          <div className="ev-dot dot-torneo" />
          Torneo
        </div>
        <div className="leg-item">
          <div className="ev-dot dot-social" />
          Social
        </div>
        <div className="leg-item">
          <div className="ev-dot dot-otro" />
          Otro
        </div>
      </div>

      <div className="cal-grid">
        {DSH.map((d) => (
          <div key={d} className="cal-dow">
            {d}
          </div>
        ))}
        {Array.from({ length: startDow }, (_, i) => {
          const pd = new Date(calYear, calMonth, -startDow + i + 1);
          return (
            <div key={`pad-${i}`} className="cal-day other-m">
              <span className="cal-num">{pd.getDate()}</span>
            </div>
          );
        })}
        {Array.from({ length: last.getDate() }, (_, idx) => {
          const d = idx + 1;
          const ds = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const evs = evByDate.get(ds) ?? [];
          const isT = ds === tod;
          const isSel = ds === selDateStr;
          const hasEv = evs.length > 0;
          const cls = ["cal-day", isT ? "today" : "", hasEv ? "has-ev" : "", isSel ? "sel-date" : ""]
            .filter(Boolean)
            .join(" ");
          return (
            <div
              key={ds}
              className={cls}
              onClick={hasEv ? () => setSelDateStr((prev) => (prev === ds ? null : ds)) : undefined}
            >
              <span className="cal-num">{d}</span>
              {hasEv ? (
                <div className="ev-dots">
                  {evs.map((e) => (
                    <div key={e.id} className={`ev-dot dot-${e.tipo}`} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="ev-month-title">{listTitle}</div>
      <div className="ev-list">
        {evsMes.length === 0 ? (
          <div className="empty-state">No hay eventos este mes</div>
        ) : (
          evsMes.map((e) => (
            <EventoCard
              key={e.id}
              e={e}
              currentUser={currentUser}
              isCoord={isCoord}
              selDateStr={selDateStr}
              openDetail={openDetailId === e.id}
              onToggle={() => setOpenDetailId((id) => (id === e.id ? null : e.id))}
              onApuntarse={() => onApuntarse(e.id)}
              onBaja={() => onBaja(e.id)}
              onValidarPago={(inscripcionId) => onValidarPago(e.id, inscripcionId)}
              onSeleccionarPareja={(parejaJugadorId) => onSeleccionarPareja(e.id, parejaJugadorId)}
              onAbrirLista={() => setListaEventoId(e.id)}
            />
          ))
        )}
      </div>

      {listaEvento ? (
        <div
          className="profile-overlay open"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) setListaEventoId(null);
          }}
        >
          <div className="profile-sheet" onClick={(ev) => ev.stopPropagation()}>
            <div className="profile-handle" />
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{listaEvento.titulo}</div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: "1rem" }}>
              {listaEvento.inscritos.length} inscritos ·{" "}
              {listaEvento.inscritos.filter((i) => i.pagoConfirmado).length} pagados
            </div>
            {listaEvento.inscritos.map((ins) => {
              const pagado = ins.pagoConfirmado;
              const esTorneo = listaEvento.tipo === "torneo";
              return (
                <div
                  key={ins.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 0",
                    borderBottom: "0.5px solid var(--border)"
                  }}
                >
                  <div className={`avatar ${avatarClassFromNombre(ins.nombre)}`} style={{ width: 28, height: 28, fontSize: 11 }}>
                    {initialsFromNombre(ins.nombre)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{ins.nombre}</div>
                    {esTorneo && ins.pareja ? (
                      <div style={{ fontSize: 11, color: "var(--text2)" }}>
                        con {parejaNombre(ins.pareja, listaEvento.inscritos)}
                      </div>
                    ) : null}
                  </div>
                  {pagado ? (
                    <span style={{ fontSize: 12, color: "#27500A", fontWeight: 600 }}>✅ Pagado</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm agenda-btn-pago"
                      onClick={async () => {
                        await onValidarPago(listaEvento.id, ins.id);
                      }}
                    >
                      Marcar pago
                    </button>
                  )}
                </div>
              );
            })}
            <button type="button" className="close-btn" onClick={() => setListaEventoId(null)}>
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EventoCard({
  e,
  currentUser,
  isCoord,
  selDateStr,
  openDetail,
  onToggle,
  onApuntarse,
  onBaja,
  onValidarPago,
  onSeleccionarPareja,
  onAbrirLista
}) {
  const d = new Date(`${e.fecha}T12:00:00`);
  const dow = DS[(d.getDay() + 6) % 7].slice(0, 3);
  const miIns = e.miInscripcion ?? null;
  const haPagado = Boolean(miIns?.pagoConfirmado);
  const esTorneo = e.tipo === "torneo";
  const candidatosPareja = e.inscritos.filter((i) => !jugadoresCoinciden(i.jugadorId, currentUser?.id));

  return (
    <div
      className={`ev-card${e.fecha === selDateStr ? " hl" : ""}`}
      style={{ cursor: "pointer" }}
      onClick={(ev) => {
        if (ev.target.closest("button") || ev.target.closest("input") || ev.target.closest("select")) return;
        onToggle();
      }}
    >
      <div className="ev-date">
        <div className="ev-day-n">{d.getDate()}</div>
        <div className="ev-day-s">{dow}</div>
      </div>
      <div className="ev-div" />
      <div className="ev-body" style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
          <div className="ev-title" style={{ flex: 1 }}>
            {e.titulo}
          </div>
          <span style={{ fontSize: 11, color: "var(--text2)", flexShrink: 0, marginTop: 2, transform: openDetail ? "rotate(90deg)" : "" }}>
            ▶
          </span>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marginTop: 3 }}>
          <span className={`ev-type et-${e.tipo}`} style={{ marginTop: 0 }}>
            {TIPO_LABEL[e.tipo] ?? e.tipo}
          </span>
          {e.precio > 0 ? (
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text2)" }}>{e.precio}€</span>
          ) : null}
          {esTorneo ? (
            <span style={{ fontSize: 10, color: "var(--text2)" }}>Individual</span>
          ) : null}
          {miIns ? (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#27500A" }}>
              ✓ Apuntado
              {haPagado ? " · Pagado" : ""}
            </span>
          ) : null}
          {e.inscritos.length && !miIns ? (
            <span style={{ fontSize: 10, color: "var(--text2)" }}>{e.inscritos.length} inscritos</span>
          ) : null}
        </div>
        {openDetail ? (
          <>
            <div className="ev-desc" style={{ marginTop: 8 }}>
              {e.desc}
            </div>
            {miIns ? (
              <div
                style={{
                  background: "var(--success-bg)",
                  border: "0.5px solid #C0DD97",
                  borderRadius: "var(--radius)",
                  padding: "8px 10px",
                  marginTop: 8
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--success-t)" }}>✓ Apuntado</span>
                  {haPagado ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#27500A" }}>✅ Pago confirmado</span>
                  ) : (
                    <span style={{ fontSize: 11, color: "#BA7517" }}>⏳ Pago pendiente</span>
                  )}
                </div>
                {esTorneo && miIns.pareja ? (
                  <div style={{ fontSize: 12, color: "var(--success-t)", marginTop: 3 }}>
                    Pareja: <strong>{parejaNombre(miIns.pareja, e.inscritos)}</strong>
                  </div>
                ) : null}
                {esTorneo && miIns && candidatosPareja.length > 0 ? (
                  <div style={{ marginTop: 10 }}>
                    <label htmlFor={`pareja-sel-${e.id}`} style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 4 }}>
                      Elegir pareja (entre inscrit@s)
                    </label>
                    <select
                      key={`${e.id}-${miIns?.pareja || "np"}`}
                      id={`pareja-sel-${e.id}`}
                      defaultValue=""
                      style={{ height: 36, fontSize: 13, width: "100%", marginBottom: 6 }}
                      onChange={(ev) => {
                        const v = ev.target.value;
                        if (v) void onSeleccionarPareja(v);
                        ev.target.value = "";
                      }}
                    >
                      <option value="">— Seleccionar —</option>
                      {candidatosPareja.map((i) => (
                        <option key={String(i.jugadorId)} value={String(i.jugadorId)}>
                          {i.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  style={{ marginTop: 8, width: "100%", fontSize: 12 }}
                  onClick={() => onBaja()}
                >
                  Darme de baja
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-primary btn-sm btn-block" style={{ fontSize: 13 }} onClick={() => onApuntarse()}>
                  Apuntarme
                </button>
              </div>
            )}
            {isCoord && e.inscritos.length ? (
              <button
                type="button"
                className="btn btn-sm"
                style={{ marginTop: 8, width: "100%", fontSize: 12 }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onAbrirLista();
                }}
              >
                Ver inscritos ({e.inscritos.length}) · {e.totalPagados ?? e.inscritos.filter((i) => i.pagoConfirmado).length} pagados ↑
              </button>
            ) : e.inscritos.length ? (
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
                {e.inscritos.length} inscrito{e.inscritos.length !== 1 ? "s" : ""}
                {e.precio > 0
                  ? ` · ${e.totalPagados ?? e.inscritos.filter((i) => i.pagoConfirmado).length} pagados`
                  : ""}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
