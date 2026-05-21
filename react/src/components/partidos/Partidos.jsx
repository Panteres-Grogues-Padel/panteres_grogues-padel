import { useEffect, useMemo, useState } from "react";
import PartidoCard from "./PartidoCard";
import MoverJugador from "./MoverJugador";
import { copyTextToClipboard } from "../../utils/clipboard";
import {
  buildOpcionesDropdownPartidos,
  formatFechaLocal,
  formatHoraInput,
  normalizeSemanaDate
} from "../../utils/dates";
import {
  createFranjaInicial,
  franjasFromPartidos,
  resumenFranjas
} from "../../utils/franjasPartidos";
import { getNombre } from "../../utils/nombres";
import { monthShortName, slotDayLabel, weekdayName, getDiaSemanaLocal } from "../../utils/dates";
import { t, pluralSuffix } from "../../i18n";

function jugadoresOrdenRanking(jugadores, rankingPosByJugador) {
  const copy = [...jugadores];
  copy.sort((a, b) => {
    const ra = rankingPosByJugador[String(a.jugadorId)] ?? 9999;
    const rb = rankingPosByJugador[String(b.jugadorId)] ?? 9999;
    if (ra !== rb) return ra - rb;
    return (a.posicion ?? 0) - (b.posicion ?? 0);
  });
  return copy;
}

function formatFechaPartido(d) {
  if (!d) return "";
  const wd = weekdayName(getDiaSemanaLocal(d));
  return `${wd}, ${d.getDate()} ${monthShortName(d.getMonth())}`;
}

function etiquetaOpcion(o) {
  return t("partidos.todayLabel", {
    day: slotDayLabel(o.slot),
    club: o.slot.club
  });
}

export default function Partidos({
  partidos,
  slotsCatalog,
  slotsJugar,
  ranking,
  currentUser,
  onGenerar,
  onLoadSlot,
  onHora,
  onIndoor,
  onMover,
  onConfirmar,
  isCoord
}) {
  const opciones = useMemo(() => buildOpcionesDropdownPartidos(slotsCatalog), [slotsCatalog]);

  const [opcionId, setOpcionId] = useState("");
  const [franjas, setFranjas] = useState(() => [createFranjaInicial()]);
  const [moverState, setMoverState] = useState({ open: false, origen: null, jugador: null });

  useEffect(() => {
    if (!opcionId && opciones.length) setOpcionId(opciones[0].id);
    if (opcionId && !opciones.some((o) => o.id === opcionId) && opciones.length) {
      setOpcionId(opciones[0].id);
    }
  }, [opcionId, opciones]);

  const seleccion = useMemo(() => opciones.find((o) => o.id === opcionId), [opciones, opcionId]);

  const slotId = seleccion?.slotId ?? "";
  const semanaObjetivo = seleccion?.semanaObjetivo ?? null;
  const esHoy = Boolean(seleccion);

  const jugadoresSlot = useMemo(() => {
    if (!slotId || !semanaObjetivo) return [];
    const entry = (slotsJugar ?? []).find(
      (s) => (s.baseId ?? s.id) === slotId && normalizeSemanaDate(s.semanaObjetivo) === semanaObjetivo
    );
    return entry?.jugadores ?? [];
  }, [slotsJugar, slotId, semanaObjetivo]);

  const slotActual = useMemo(
    () =>
      seleccion?.slot
        ? {
            ...seleccion.slot,
            jugadores: jugadoresSlot
          }
        : null,
    [seleccion, jugadoresSlot]
  );

  useEffect(() => {
    if (!slotId || !onLoadSlot || !semanaObjetivo) return;
    void onLoadSlot(slotId, semanaObjetivo);
  }, [slotId, semanaObjetivo, onLoadSlot]);

  const fechaPartidoSel = useMemo(() => {
    if (!seleccion?.fechaPartido) return "";
    return formatFechaLocal(seleccion.fechaPartido);
  }, [seleccion]);

  const partidosFiltrados = useMemo(() => {
    if (!slotId) return [];
    const sid = String(slotId);
    const semNorm = semanaObjetivo ? normalizeSemanaDate(semanaObjetivo) : "";
    const seen = new Map();
    for (const p of partidos) {
      if (String(p.slotId) !== sid) continue;
      if (semNorm && normalizeSemanaDate(p.semana) !== semNorm) continue;
      if (fechaPartidoSel && p.fechaPartido && p.fechaPartido !== fechaPartidoSel) continue;
      seen.set(String(p.pistaId ?? p.id), p);
    }
    return [...seen.values()];
  }, [partidos, slotId, semanaObjetivo, fechaPartidoSel]);

  useEffect(() => {
    if (!slotActual) return;
    if (partidosFiltrados.length > 0) {
      setFranjas(franjasFromPartidos(partidosFiltrados));
    } else {
      const def = Number(slotActual.pistasDefault ?? slotActual.pistas ?? 2);
      setFranjas([createFranjaInicial({ outdoor: def, indoor: 0 })]);
    }
  }, [slotActual, partidosFiltrados]);

  const resumen = useMemo(
    () => resumenFranjas(franjas, slotActual?.jugadores?.length ?? 0),
    [franjas, slotActual]
  );

  function updateFranja(id, patch) {
    setFranjas((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function addFranja() {
    setFranjas((prev) => [...prev, createFranjaInicial({ outdoor: 1, indoor: 0 })]);
  }

  function removeFranja(id) {
    setFranjas((prev) => (prev.length <= 1 ? prev : prev.filter((f) => f.id !== id)));
  }

  const rankingPosByJugador = useMemo(() => {
    const map = {};
    (ranking ?? []).forEach((r, idx) => {
      map[String(r.id)] = idx + 1;
    });
    return map;
  }, [ranking]);

  const yaGenerado = partidosFiltrados.length > 0;
  const hayInscritos = (slotActual?.jugadores?.length ?? 0) > 0;
  const mostrarRegenerar = yaGenerado;
  const mostrarGenerar = !mostrarRegenerar && hayInscritos && esHoy;

  function handleGenerarClick(regenerar) {
    if (!slotId || !semanaObjetivo || !esHoy) return;
    if (regenerar) {
      const ok = window.confirm(t("partidos.regenerateConfirm"));
      if (!ok) return;
    }
    onGenerar(slotId, semanaObjetivo, { franjas });
  }

  const reservas = useMemo(() => {
    if (!slotActual) return [];
    const idsAsignados = new Set(partidosFiltrados.flatMap((p) => p.jugadores.map((j) => j.jugadorId)));
    const candidates = (ranking ?? []).filter((r) =>
      slotActual.jugadores?.some((j) => j.nombre === r.nombre && !idsAsignados.has(r.id))
    );
    return candidates;
  }, [slotActual, partidosFiltrados, ranking]);

  function buildWaText() {
    if (!slotActual || !partidosFiltrados.length) return "";
    const ordenados = [...partidosFiltrados].sort(
      (a, b) =>
        (formatHoraInput(a.hora) || "99:99").localeCompare(formatHoraInput(b.hora) || "99:99") ||
        (a.numeroPista ?? 0) - (b.numeroPista ?? 0)
    );
    const n = ordenados.length;
    let wa = `🎾 *${slotDayLabel(slotActual)} — ${slotActual.club}*\n`;
    wa += `${t("partidos.waTemplateHeader", { count: n, players: n * 4 })}\n`;
    const indoorCount = ordenados.filter((p) => p.indoor).length;
    if (indoorCount > 0) {
      wa += `${t("partidos.waIndoorCount", { count: indoorCount, plural: pluralSuffix(indoorCount) })}\n`;
    }
    wa += "\n";
    ordenados.forEach((p, i) => {
      const horaRaw = formatHoraInput(p.hora);
      const hora = horaRaw ? ` · 🕐 ${horaRaw}` : "";
      const indoorSuffix = p.indoor ? " Indoor" : "";
      wa += `${t("partidos.waMatchLine", { num: i + 1, hora, indoorSuffix })}\n`;
      const jugOrd = jugadoresOrdenRanking(p.jugadores, rankingPosByJugador);
      wa += `${jugOrd.map((j) => getNombre(j)).join(" · ")}\n\n`;
    });
    if (reservas.length) {
      wa += t("partidos.waReserve", { names: reservas.map((r) => getNombre(r)).join(", ") });
    }
    return wa;
  }

  async function handleCopyWa() {
    const texto = buildWaText();
    await copyTextToClipboard(texto);
  }

  function onOpenMover(origenPartido, jugador) {
    setMoverState({ open: true, origen: origenPartido, jugador });
  }

  async function onMove(destinoId) {
    const ok = await onMover(moverState.origen.id, destinoId, moverState.jugador.jugadorId);
    if (ok) setMoverState({ open: false, origen: null, jugador: null });
  }

  return (
    <div>
      <h2 className="section-title">{t("partidos.title")}</h2>
      <div id="partidos-days">
        {opciones.length ? (
          <select
            value={opcionId}
            onChange={(e) => setOpcionId(e.target.value)}
            style={{
              fontSize: "14px",
              fontWeight: 600,
              height: "46px",
              borderColor: "var(--border2)",
              background: "var(--bg)",
              width: "100%",
              marginBottom: "1rem"
            }}
          >
            {opciones.map((o) => (
              <option key={o.id} value={o.id}>
                {etiquetaOpcion(o)}
              </option>
            ))}
          </select>
        ) : (
          <p className="slot-meta">{t("partidos.noSlotsToday")}</p>
        )}
      </div>

      {isCoord && esHoy ? (
        <div className="coord-box">
          <div className="coord-box-title">
            <span className="coord-pill">{t("partidos.coordBox")}</span> {slotDayLabel(slotActual)} — {slotActual?.club}
            <span style={{ display: "block", fontSize: "12px", fontWeight: 400, color: "var(--text2)", marginTop: "4px" }}>
              {formatFechaPartido(seleccion?.fechaPartido)}
            </span>
          </div>
          <div className="franjas-list">
            {franjas.map((f, idx) => (
              <div key={f.id} className="franja-card">
                <div className="franja-card-head">
                  <span className="franja-card-title">{t("common.fringeNumber", { num: idx + 1 })}</span>
                  {franjas.length > 1 ? (
                    <button
                      type="button"
                      className="franja-remove"
                      onClick={() => removeFranja(f.id)}
                      aria-label={t("partidos.deleteFringe")}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                <label className="franja-field">
                  <span className="franja-label">{t("agenda.fieldTime")}</span>
                  <input
                    type="time"
                    className="franja-hora"
                    value={formatHoraInput(f.hora) || "20:00"}
                    onChange={(e) => updateFranja(f.id, { hora: e.target.value })}
                  />
                </label>
                <div className="franja-counters">
                  <div className="franja-counter">
                    <span className="franja-label">{t("common.outdoor")}</span>
                    <div className="pistas-ctrl">
                      <button
                        type="button"
                        className="pistas-btn"
                        onClick={() => updateFranja(f.id, { outdoor: Math.max(0, (f.outdoor ?? 0) - 1) })}
                      >
                        −
                      </button>
                      <span className="pistas-num">{f.outdoor ?? 0}</span>
                      <button
                        type="button"
                        className="pistas-btn"
                        onClick={() => updateFranja(f.id, { outdoor: Math.min(15, (f.outdoor ?? 0) + 1) })}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="franja-counter">
                    <span className="franja-label">{t("common.indoor")}</span>
                    <div className="pistas-ctrl">
                      <button
                        type="button"
                        className="pistas-btn"
                        onClick={() => updateFranja(f.id, { indoor: Math.max(0, (f.indoor ?? 0) - 1) })}
                      >
                        −
                      </button>
                      <span className="pistas-num">{f.indoor ?? 0}</span>
                      <button
                        type="button"
                        className="pistas-btn"
                        onClick={() => updateFranja(f.id, { indoor: Math.min(15, (f.indoor ?? 0) + 1) })}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm btn-block franja-add-btn" onClick={addFranja}>
            {t("partidos.addFringe")}
          </button>
          <div className="franjas-resumen">
            {t("partidos.summaryCourts", {
              pistas: resumen.totalPistas,
              pistasPlural: pluralSuffix(resumen.totalPistas),
              indoor: resumen.totalIndoor,
              titulares: resumen.titulares,
              reserva: resumen.reserva
            })}
          </div>
          {mostrarRegenerar ? (
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={() => handleGenerarClick(true)}>
              {t("partidos.regenerateMatches")}
            </button>
          ) : mostrarGenerar ? (
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={() => handleGenerarClick(false)}>
              {t("partidos.generateMatches")}
            </button>
          ) : null}
        </div>
      ) : null}

      {!partidosFiltrados.length ? (
        <div className="card">
          <div className="empty-state">
            {slotActual?.jugadores?.length
              ? t("partidos.notGeneratedYet")
              : t("partidos.nobodySignedUp")}
          </div>
        </div>
      ) : (
        <>
          {partidosFiltrados
            .sort(
              (a, b) =>
                (formatHoraInput(a.hora) || "99:99").localeCompare(formatHoraInput(b.hora) || "99:99") ||
                (a.numeroPista ?? 0) - (b.numeroPista ?? 0)
            )
            .map((p, i) => (
              <PartidoCard
                key={p.id}
                partido={p}
                index={i}
                isCoord={isCoord}
                currentUser={currentUser}
                onConfirmar={onConfirmar}
                onHora={onHora}
                onIndoor={onIndoor}
                onOpenMover={onOpenMover}
                rankingPosByJugador={rankingPosByJugador}
              />
            ))}

          {reservas.length ? (
            <div className="reserva-box">
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#BA7517", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "6px" }}>
                {t("partidos.reserveBox", { count: reservas.length })}
              </div>
              <div>{reservas.map((p) => <span key={p.id} className="chip" style={{ fontSize: "11px" }}>{getNombre(p)}</span>)}</div>
            </div>
          ) : null}

          <div className="wa-box">
            <div className="wa-header">
              <span>{t("partidos.waHeader")}</span>
              <button type="button" className="btn btn-sm" onClick={() => void handleCopyWa()}>
                {t("common.copy")}
              </button>
            </div>
            <div className="wa-text">{buildWaText()}</div>
          </div>
        </>
      )}

      <MoverJugador
        open={moverState.open}
        origenPartido={moverState.origen}
        jugador={moverState.jugador}
        destinos={partidosFiltrados.filter((p) => p.id !== moverState.origen?.id)}
        onClose={() => setMoverState({ open: false, origen: null, jugador: null })}
        onMove={onMove}
      />
    </div>
  );
}