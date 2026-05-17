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

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

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
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
}

function etiquetaOpcion(o) {
  const modoLabel = o.modo === "ayer" ? "ayer" : o.modo === "hoy" ? "hoy" : formatFechaPartido(o.fechaPartido);
  return `${DIAS[o.diaSemana] ?? o.slot.label} — ${o.slot.club} (${modoLabel})`;
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
  const esSoloConsulta = seleccion?.modo === "ayer";
  const esHoy = seleccion?.modo === "hoy";
  const puedeGestionar = esHoy || seleccion?.modo === "proximo";

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
  const mostrarRegenerar = yaGenerado || (isCoord && esHoy);
  const mostrarGenerar = !mostrarRegenerar && hayInscritos && puedeGestionar;

  function handleGenerarClick(regenerar) {
    if (!slotId || !semanaObjetivo || !puedeGestionar) return;
    if (regenerar) {
      const ok = window.confirm("¿Regenerar los partidos de esta semana?");
      if (!ok) return;
    }
    onGenerar(slotId, semanaObjetivo, { franjas });
  }

  const reservas = useMemo(() => {
    if (!slotActual || esSoloConsulta) return [];
    const idsAsignados = new Set(partidosFiltrados.flatMap((p) => p.jugadores.map((j) => j.jugadorId)));
    const candidates = (ranking ?? []).filter((r) =>
      slotActual.jugadores?.some((j) => j.nombre === r.nombre && !idsAsignados.has(r.id))
    );
    return candidates;
  }, [slotActual, partidosFiltrados, ranking, esSoloConsulta]);

  function buildWaText() {
    if (!slotActual || !partidosFiltrados.length) return "";
    const ordenados = [...partidosFiltrados].sort(
      (a, b) =>
        (formatHoraInput(a.hora) || "99:99").localeCompare(formatHoraInput(b.hora) || "99:99") ||
        (a.numeroPista ?? 0) - (b.numeroPista ?? 0)
    );
    const n = ordenados.length;
    let wa = `🎾 *${slotActual.label} — ${slotActual.club}*\n`;
    wa += `Partidos: ${n} · Jugadores: ${n * 4}\n`;
    const indoorCount = ordenados.filter((p) => p.indoor).length;
    if (indoorCount > 0) {
      wa += `${indoorCount} partido${indoorCount !== 1 ? "s" : ""} Indoor\n`;
    }
    wa += "\n";
    ordenados.forEach((p, i) => {
      const horaRaw = formatHoraInput(p.hora);
      const hora = horaRaw ? ` · 🕐 ${horaRaw}` : "";
      const indoor = p.indoor ? " Indoor" : "";
      wa += `*Partido ${i + 1}*${hora}${indoor}\n`;
      const jugOrd = jugadoresOrdenRanking(p.jugadores, rankingPosByJugador);
      wa += `${jugOrd.map((j) => j.nombre).join(" · ")}\n\n`;
    });
    if (reservas.length) wa += `*Reserva:* ${reservas.map((r) => r.nombre).join(", ")}`;
    return wa;
  }

  async function handleCopyWa() {
    const texto = buildWaText();
    await copyTextToClipboard(texto);
  }

  function onOpenMover(origenPartido, jugador) {
    if (esSoloConsulta) return;
    setMoverState({ open: true, origen: origenPartido, jugador });
  }

  async function onMove(destinoId) {
    const ok = await onMover(moverState.origen.id, destinoId, moverState.jugador.jugadorId);
    if (ok) setMoverState({ open: false, origen: null, jugador: null });
  }

  return (
    <div>
      <h2 className="section-title">Partidos</h2>
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
          <p className="slot-meta">No hay slots en la ventana de estos días</p>
        )}
      </div>

      {esSoloConsulta && seleccion ? (
        <p className="slot-meta" style={{ marginBottom: "1rem" }}>
          Ayer · solo consulta (sin generar partidos)
        </p>
      ) : null}

      {puedeGestionar && isCoord ? (
        <div className="coord-box">
          <div className="coord-box-title">
            <span className="coord-pill">Coord.</span> {slotActual?.label} — {slotActual?.club}
            <span style={{ display: "block", fontSize: "12px", fontWeight: 400, color: "var(--text2)", marginTop: "4px" }}>
              {formatFechaPartido(seleccion?.fechaPartido)}
            </span>
          </div>
          <div className="franjas-list">
            {franjas.map((f, idx) => (
              <div key={f.id} className="franja-card">
                <div className="franja-card-head">
                  <span className="franja-card-title">Franja {idx + 1}</span>
                  {franjas.length > 1 ? (
                    <button
                      type="button"
                      className="franja-remove"
                      onClick={() => removeFranja(f.id)}
                      aria-label="Eliminar franja"
                    >
                      ×
                    </button>
                  ) : null}
                </div>
                <label className="franja-field">
                  <span className="franja-label">Hora</span>
                  <input
                    type="time"
                    className="franja-hora"
                    value={formatHoraInput(f.hora) || "20:00"}
                    onChange={(e) => updateFranja(f.id, { hora: e.target.value })}
                  />
                </label>
                <div className="franja-counters">
                  <div className="franja-counter">
                    <span className="franja-label">Outdoor</span>
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
                    <span className="franja-label">Indoor</span>
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
            + Añadir franja horaria
          </button>
          <div className="franjas-resumen">
            <strong>{resumen.totalPistas}</strong> pistas ({resumen.totalIndoor} indoor) ·{" "}
            <strong>{resumen.titulares}</strong> titulares · <strong>{resumen.reserva}</strong> reserva
          </div>
          {mostrarRegenerar ? (
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={() => handleGenerarClick(true)}>
              Regenerar partidos
            </button>
          ) : mostrarGenerar ? (
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={() => handleGenerarClick(false)}>
              Generar partidos
            </button>
          ) : null}
        </div>
      ) : null}

      {!partidosFiltrados.length ? (
        <div className="card">
          <div className="empty-state">
            {esSoloConsulta
              ? "No hay partidos generados para ayer"
              : slotActual?.jugadores?.length
                ? "Los partidos aún no se han generado"
                : "No hay nadie apuntado"}
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
                isCoord={isCoord && !esSoloConsulta}
                currentUser={currentUser}
                onConfirmar={onConfirmar}
                onHora={esSoloConsulta ? undefined : onHora}
                onIndoor={esSoloConsulta ? undefined : onIndoor}
                onOpenMover={esSoloConsulta ? undefined : onOpenMover}
                rankingPosByJugador={rankingPosByJugador}
              />
            ))}

          {!esSoloConsulta && reservas.length ? (
            <div className="reserva-box">
              <div style={{ fontSize: "11px", fontWeight: 600, color: "#BA7517", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "6px" }}>
                Reserva ({reservas.length})
              </div>
              <div>{reservas.map((p) => <span key={p.id} className="chip" style={{ fontSize: "11px" }}>{p.nombre}</span>)}</div>
            </div>
          ) : null}

          <div className="wa-box">
            <div className="wa-header">
              <span>WhatsApp</span>
              <button type="button" className="btn btn-sm" onClick={() => void handleCopyWa()}>
                Copiar
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