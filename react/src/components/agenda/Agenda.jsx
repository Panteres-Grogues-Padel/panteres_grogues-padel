import { useMemo, useState } from "react";
import { jugadoresCoinciden } from "../../utils/jugador";
import { avatarClassFromNombre, initialsFromNombre } from "../../utils/avatar";
import { copyTextToClipboard } from "../../utils/clipboard";
import { DATE_LOCALE, formatHoraInput, monthName, monthShortCapitalName, weekdayShortName } from "../../utils/dates";
import { getNombreVisible } from "../../utils/nombres";
import { t, pluralSuffix } from "../../i18n";

const TIPO_LABEL = {
  torneo: () => t("agenda.types.torneo"),
  social: () => t("agenda.types.social"),
  otro: () => t("agenda.types.otro")
};

function formatFechaEventoLista(fecha) {
  if (!fecha) return "";
  const s = String(fecha).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y}`;
}

function nombreCompletoInscrito(ins) {
  const name = (ins?.nombreCompleto ?? ins?.nombre ?? "").trim();
  return name || t("common.player");
}

function buildEventoListaText(evento) {
  if (!evento?.inscritos?.length) return "";
  const fecha = formatFechaEventoLista(evento.fecha);
  let text = `${evento.titulo} - ${fecha}\n\n`;
  evento.inscritos.forEach((ins, idx) => {
    const estado = ins.pagoConfirmado ? "Pagat" : "Pendent";
    text += `${idx + 1}. ${nombreCompletoInscrito(ins)} - ${estado}\n`;
  });
  return text.trimEnd();
}

function parejaNombre(parejaRef, inscritos) {
  if (!parejaRef) return "";
  const hit = inscritos.find((i) => jugadoresCoinciden(i.jugadorId, parejaRef));
  return hit ? getNombreVisible(hit) || hit.nombre : String(parejaRef);
}

function eventoEnMes(e, year, month) {
  const start = e.fecha;
  const end = e.fechaFin ?? e.fecha;
  if (!start) return false;
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return start <= monthEnd && end >= monthStart;
}

function eventosEnMes(eventos, year, month) {
  return eventos
    .filter((e) => eventoEnMes(e, year, month))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function formatRangoFechas(fecha, fechaFin) {
  if (!fecha) return "";
  const fin = fechaFin ?? fecha;
  const opts = { day: "numeric", month: "short" };
  const d0 = new Date(`${fecha}T12:00:00`);
  if (fin === fecha) return d0.toLocaleDateString(DATE_LOCALE, opts);
  const d1 = new Date(`${fin}T12:00:00`);
  return `${d0.toLocaleDateString(DATE_LOCALE, opts)} – ${d1.toLocaleDateString(DATE_LOCALE, opts)}`;
}

function tiposEnMes(eventos, year, month) {
  const tipos = new Set();
  for (const e of eventosEnMes(eventos, year, month)) {
    tipos.add(e.tipo);
  }
  return tipos;
}

const FORM_CREAR_INICIAL = {
  titulo: "",
  fechaInicio: "",
  fechaFin: "",
  hora: "",
  descripcion: "",
  aforoMaximo: ""
};

export default function Agenda({
  eventos,
  currentUser,
  isCoord,
  loading = false,
  onApuntarse,
  onBaja,
  onValidarPago,
  onSeleccionarPareja,
  onCrearEvento,
  onBorrarEvento
}) {
  const now = useMemo(() => new Date(), []);
  const calYear = now.getFullYear();
  const mesActual = now.getMonth();

  const [vista, setVista] = useState("año");
  const [calMonth, setCalMonth] = useState(mesActual);
  const [openDetailId, setOpenDetailId] = useState(null);
  const [listaEventoId, setListaEventoId] = useState(null);
  const [crearOpen, setCrearOpen] = useState(false);
  const [formCrear, setFormCrear] = useState(FORM_CREAR_INICIAL);
  const [formError, setFormError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const listaEvento = listaEventoId != null ? eventos.find((x) => x.id === listaEventoId) ?? null : null;

  async function handleCopyEventoLista() {
    if (!listaEvento) return;
    const texto = buildEventoListaText(listaEvento);
    if (!texto) return;
    await copyTextToClipboard(texto);
  }

  const evsMes = useMemo(() => eventosEnMes(eventos, calYear, calMonth), [eventos, calYear, calMonth]);

  const resumenMeses = useMemo(() => {
    return Array.from({ length: 12 }, (_, month) => {
      const delMes = eventosEnMes(eventos, calYear, month);
      return {
        month,
        nombre: monthName(month),
        corto: monthShortCapitalName(month),
        count: delMes.length,
        tipos: tiposEnMes(eventos, calYear, month)
      };
    });
  }, [eventos, calYear]);

  function abrirMes(month) {
    setCalMonth(month);
    setVista("mes");
    setOpenDetailId(null);
  }

  function volverAAno() {
    setVista("año");
    setOpenDetailId(null);
  }

  function abrirCrearEvento() {
    setFormCrear(FORM_CREAR_INICIAL);
    setFormError("");
    setCrearOpen(true);
  }

  async function handleGuardarEvento(ev) {
    ev.preventDefault();
    if (!onCrearEvento) return;
    setFormError("");
    setGuardando(true);
    const res = await onCrearEvento(formCrear);
    setGuardando(false);
    if (!res.ok) {
      setFormError(res.error ?? t("agenda.createEventFailed"));
      return;
    }
    const fechaGuardada = formCrear.fechaInicio;
    setCrearOpen(false);
    setFormCrear(FORM_CREAR_INICIAL);
    const d = fechaGuardada ? new Date(`${fechaGuardada}T12:00:00`) : null;
    if (d && !Number.isNaN(d.getTime())) {
      setCalMonth(d.getMonth());
      setVista("mes");
    }
  }

  return (
    <div className={loading ? "agenda-page agenda-page--loading" : "agenda-page"}>
      <div className="agenda-title-row">
        <h2 className="section-title">{t("agenda.title")}</h2>
        {loading ? <span className="agenda-loading-hint">{t("common.loadingEllipsis")}</span> : null}
        {isCoord ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={abrirCrearEvento}>
            {t("agenda.createEvent")}
          </button>
        ) : null}
      </div>

      {vista === "año" ? (
        <>
          <div className="agenda-year-label">{calYear}</div>
          <div className="legend agenda-legend-compact">
            <div className="leg-item">
              <div className="ev-dot dot-torneo" />
              {t("agenda.types.torneo")}
            </div>
            <div className="leg-item">
              <div className="ev-dot dot-social" />
              {t("agenda.types.social")}
            </div>
            <div className="leg-item">
              <div className="ev-dot dot-otro" />
              {t("agenda.legendOther")}
            </div>
          </div>
          <div className="agenda-year-grid">
            {resumenMeses.map((m) => {
              const esActual = m.month === mesActual;
              const cls = [
                "agenda-month-card",
                esActual ? "agenda-month-card--current" : "",
                m.count > 0 ? "agenda-month-card--has-events" : ""
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={m.month}
                  type="button"
                  className={cls}
                  onClick={() => abrirMes(m.month)}
                  aria-current={esActual ? "date" : undefined}
                >
                  <span className="agenda-month-card__name">{m.corto}</span>
                  {m.count > 0 ? (
                    <span className="agenda-month-card__count">
                      {t("agenda.eventCount", { count: m.count, plural: pluralSuffix(m.count) })}
                    </span>
                  ) : (
                    <span className="agenda-month-card__count agenda-month-card__count--empty">—</span>
                  )}
                  {m.count > 0 ? (
                    <div className="agenda-month-card__dots" aria-hidden>
                      {[...m.tipos].map((t) => (
                        <span key={t} className={`ev-dot dot-${t}`} />
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="agenda-month-header">
            <button type="button" className="btn btn-sm agenda-back-btn" onClick={volverAAno}>
              {t("agenda.yearBack")}
            </button>
            <span className="agenda-month-header__title">
              {monthName(calMonth)} {calYear}
            </span>
          </div>

          <div className="legend agenda-legend-compact">
            <div className="leg-item">
              <div className="ev-dot dot-torneo" />
              {t("agenda.types.torneo")}
            </div>
            <div className="leg-item">
              <div className="ev-dot dot-social" />
              {t("agenda.types.social")}
            </div>
            <div className="leg-item">
              <div className="ev-dot dot-otro" />
              {t("agenda.legendOther")}
            </div>
          </div>

          <div className="ev-list">
            {evsMes.length === 0 ? (
              <div className="empty-state">{t("agenda.noEventsInMonth", { month: monthName(calMonth) })}</div>
            ) : (
              evsMes.map((e) => (
                <EventoCard
                  key={e.id}
                  e={e}
                  currentUser={currentUser}
                  isCoord={isCoord}
                  openDetail={openDetailId === e.id}
                  onToggle={() => setOpenDetailId((id) => (id === e.id ? null : e.id))}
                  onApuntarse={() => onApuntarse(e.id)}
                  onBaja={() => onBaja(e.id)}
                  onValidarPago={(inscripcionId) => onValidarPago(e.id, inscripcionId)}
                  onSeleccionarPareja={(parejaJugadorId) => onSeleccionarPareja(e.id, parejaJugadorId)}
                  onAbrirLista={() => setListaEventoId(e.id)}
                  onBorrar={() => onBorrarEvento(e.id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {crearOpen ? (
        <div
          className="profile-overlay open"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget && !guardando) setCrearOpen(false);
          }}
        >
          <div className="profile-sheet" onClick={(ev) => ev.stopPropagation()}>
            <div className="profile-handle" />
            <div className="agenda-form-title">{t("agenda.formTitle")}</div>
            <form className="agenda-form" onSubmit={handleGuardarEvento}>
              <label className="agenda-field">
                <span className="agenda-field__label">{t("agenda.fieldTitle")}</span>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formCrear.titulo}
                  onChange={(ev) => setFormCrear((f) => ({ ...f, titulo: ev.target.value }))}
                  placeholder={t("agenda.fieldTitlePlaceholder")}
                />
              </label>
              <label className="agenda-field">
                <span className="agenda-field__label">{t("agenda.fieldStartDate")}</span>
                <input
                  type="date"
                  required
                  value={formCrear.fechaInicio}
                  onChange={(ev) =>
                    setFormCrear((f) => {
                      const inicio = ev.target.value;
                      let fin = f.fechaFin || inicio;
                      if (fin < inicio) fin = inicio;
                      return { ...f, fechaInicio: inicio, fechaFin: fin };
                    })
                  }
                />
              </label>
              <label className="agenda-field">
                <span className="agenda-field__label">{t("agenda.fieldEndDate")}</span>
                <input
                  type="date"
                  required
                  min={formCrear.fechaInicio || undefined}
                  value={formCrear.fechaFin}
                  onChange={(ev) => setFormCrear((f) => ({ ...f, fechaFin: ev.target.value }))}
                />
              </label>
              <label className="agenda-field">
                <span className="agenda-field__label">{t("agenda.fieldTime")}</span>
                <input
                  type="time"
                  value={formCrear.hora}
                  onChange={(ev) => setFormCrear((f) => ({ ...f, hora: ev.target.value }))}
                />
              </label>
              <label className="agenda-field">
                <span className="agenda-field__label">{t("agenda.fieldDescription")}</span>
                <textarea
                  rows={3}
                  value={formCrear.descripcion}
                  onChange={(ev) => setFormCrear((f) => ({ ...f, descripcion: ev.target.value }))}
                  placeholder={t("agenda.fieldDescriptionPlaceholder")}
                />
              </label>
              <label className="agenda-field">
                <span className="agenda-field__label">{t("agenda.fieldCapacity")}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={formCrear.aforoMaximo}
                  onChange={(ev) => setFormCrear((f) => ({ ...f, aforoMaximo: ev.target.value }))}
                  placeholder={t("common.noLimit")}
                />
              </label>
              {formError ? <p className="agenda-form-error">{formError}</p> : null}
              <button type="submit" className="btn btn-primary btn-block" disabled={guardando}>
                {guardando ? t("common.saving") : t("agenda.saveEvent")}
              </button>
              <button
                type="button"
                className="close-btn"
                disabled={guardando}
                onClick={() => setCrearOpen(false)}
              >
                {t("common.cancel")}
              </button>
            </form>
          </div>
        </div>
      ) : null}

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
              {t("agenda.inscribedPaid", {
                inscritos: listaEvento.inscritos.length,
                pagados: listaEvento.inscritos.filter((i) => i.pagoConfirmado).length
              })}
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
                  <div className={`avatar ${avatarClassFromNombre(getNombreVisible(ins))}`} style={{ width: 28, height: 28, fontSize: 11 }}>
                    {initialsFromNombre(getNombreVisible(ins))}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{getNombreVisible(ins)}</div>
                    {esTorneo && ins.pareja ? (
                      <div style={{ fontSize: 11, color: "var(--text2)" }}>
                        {t("agenda.withPartner", {
                          name: parejaNombre(ins.pareja, listaEvento.inscritos)
                        })}
                      </div>
                    ) : null}
                  </div>
                  {isCoord ? (
                    <label
                      className="agenda-pago-check"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={pagado}
                        onChange={async (ev) => {
                          const res = await onValidarPago(listaEvento.id, ins.id, ev.target.checked);
                          if (!res?.ok) ev.target.checked = pagado;
                        }}
                      />
                      <span>{t("agenda.paid")}</span>
                    </label>
                  ) : pagado ? (
                    <span style={{ fontSize: 12, color: "#27500A", fontWeight: 600 }}>✅ {t("agenda.paid")}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text2)" }}>{t("agenda.paymentPending")}</span>
                  )}
                </div>
              );
            })}
            {isCoord && listaEvento.inscritos.length ? (
              <button
                type="button"
                className="btn btn-sm btn-block"
                style={{ marginTop: 12, fontSize: 12 }}
                onClick={() => void handleCopyEventoLista()}
              >
                {t("agenda.copyList")}
              </button>
            ) : null}
            <button type="button" className="close-btn" onClick={() => setListaEventoId(null)}>
              {t("common.close")}
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
  openDetail,
  onToggle,
  onApuntarse,
  onBaja,
  onValidarPago,
  onSeleccionarPareja,
  onAbrirLista,
  onBorrar
}) {
  const d = new Date(`${e.fecha}T12:00:00`);
  const dow = weekdayShortName((d.getDay() + 6) % 7);
  const miIns = e.miInscripcion ?? null;
  const haPagado = Boolean(miIns?.pagoConfirmado);
  const esTorneo = e.tipo === "torneo";
  const horaLabel = formatHoraInput(e.hora);
  const aforoMax = e.aforoMaximo;
  const inscritosCount = e.inscritos?.length ?? 0;
  const completo = aforoMax != null && inscritosCount >= aforoMax;
  const candidatosPareja = e.inscritos.filter((i) => !jugadoresCoinciden(i.jugadorId, currentUser?.id));

  return (
    <div
      className="ev-card"
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
            {(TIPO_LABEL[e.tipo] ? TIPO_LABEL[e.tipo]() : null) ?? e.tipo}
          </span>
          {horaLabel ? (
            <span style={{ fontSize: 10, color: "var(--text2)" }}>{horaLabel}</span>
          ) : null}
          {aforoMax != null ? (
            <span style={{ fontSize: 10, color: completo ? "#BA7517" : "var(--text2)" }}>
              {t("agenda.places", { current: inscritosCount, max: aforoMax })}
            </span>
          ) : null}
          {(e.fechaFin ?? e.fecha) !== e.fecha ? (
            <span style={{ fontSize: 10, color: "var(--text2)" }}>{formatRangoFechas(e.fecha, e.fechaFin)}</span>
          ) : null}
          {e.precio > 0 ? (
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text2)" }}>{e.precio}€</span>
          ) : null}
          {esTorneo ? (
            <span style={{ fontSize: 10, color: "var(--text2)" }}>{t("agenda.individual")}</span>
          ) : null}
          {miIns ? (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#27500A" }}>
              {t("agenda.signedUp")}
              {haPagado ? ` · ${t("agenda.paid")}` : ""}
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
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--success-t)" }}>{t("agenda.signedUp")}</span>
                  {haPagado ? (
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#27500A" }}>{t("agenda.paymentConfirmed")}</span>
                  ) : (
                    <span style={{ fontSize: 11, color: "#BA7517" }}>{t("agenda.paymentPendingEmoji")}</span>
                  )}
                </div>
                {esTorneo && miIns.pareja ? (
                  <div style={{ fontSize: 12, color: "var(--success-t)", marginTop: 3 }}>
                    {t("agenda.partner", { name: parejaNombre(miIns.pareja, e.inscritos) })}
                  </div>
                ) : null}
                {esTorneo && miIns && candidatosPareja.length > 0 ? (
                  <div style={{ marginTop: 10 }}>
                    <label htmlFor={`pareja-sel-${e.id}`} style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 4 }}>
                      {t("agenda.choosePartner")}
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
                      <option value="">{t("common.selectPlaceholder")}</option>
                      {candidatosPareja.map((i) => (
                        <option key={String(i.jugadorId)} value={String(i.jugadorId)}>
                          {getNombreVisible(i)}
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
                  {t("agenda.unregister")}
                </button>
              </div>
            ) : completo ? (
              <p style={{ marginTop: 8, fontSize: 12, color: "#BA7517" }}>{t("agenda.eventFull")}</p>
            ) : (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-primary btn-sm btn-block" style={{ fontSize: 13 }} onClick={() => onApuntarse()}>
                  {t("agenda.signUp")}
                </button>
              </div>
            )}
            {isCoord ? (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {e.inscritos.length ? (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ width: "100%", fontSize: 12 }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onAbrirLista();
                    }}
                  >
                    {t("agenda.viewInscribed", {
                      count: e.inscritos.length,
                      paid: e.totalPagados ?? e.inscritos.filter((i) => i.pagoConfirmado).length
                    })}{" "}
                    ↑
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  style={{ width: "100%", fontSize: 12 }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (window.confirm(t("agenda.deleteConfirm"))) onBorrar();
                  }}
                >
                  {t("common.delete")}
                </button>
              </div>
            ) : e.inscritos.length ? (
              <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 6 }}>
                {t("agenda.inscribedSummary", {
                  count: e.inscritos.length,
                  plural: pluralSuffix(e.inscritos.length),
                  paid: e.totalPagados ?? e.inscritos.filter((i) => i.pagoConfirmado).length
                })}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
