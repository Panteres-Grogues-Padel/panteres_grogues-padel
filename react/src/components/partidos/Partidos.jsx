import { useEffect, useMemo, useRef, useState } from "react";
import PartidoCard from "./PartidoCard";
import MoverJugador from "./MoverJugador";

export default function Partidos({
  partidos,
  slots,
  ranking,
  currentUser,
  onGenerar,
  onHora,
  onIndoor,
  onMover,
  onConfirmar,
  isCoord
}) {
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [semana, setSemana] = useState(slots[0]?.semanaObjetivo ?? "");
  const [numPistas, setNumPistas] = useState(0);
  const [numIndoor, setNumIndoor] = useState(0);
  const [moverState, setMoverState] = useState({ open: false, origen: null, jugador: null });
  const slotIdAnteriorRef = useRef(null);

  const semanasDisponibles = useMemo(() => {
    const set = new Set([
      ...slots.map((s) => s.semanaObjetivo).filter(Boolean),
      ...partidos.map((p) => p.semana).filter(Boolean)
    ]);
    return [...set].sort();
  }, [slots, partidos]);

  useEffect(() => {
    if (!slotId && slots.length) setSlotId(slots[0].id);
  }, [slotId, slots]);

  /** Misma semana que alta en Jugar: `getSemanaObjetivo` en useSlots (no dejar la semana del slot anterior en el desplegable). */
  useEffect(() => {
    if (!slotId) return;
    if (slotIdAnteriorRef.current === slotId) return;
    slotIdAnteriorRef.current = slotId;
    const slot = slots.find((s) => s.id === slotId);
    if (slot?.semanaObjetivo) setSemana(slot.semanaObjetivo);
  }, [slotId, slots]);

  useEffect(() => {
    const slot = slots.find((s) => s.id === slotId);
    if (slot) {
      setNumPistas(slot.pistas ?? 0);
      setNumIndoor(0);
    }
  }, [slotId, slots]);

  useEffect(() => {
    if (!semana && semanasDisponibles.length) setSemana(semanasDisponibles[0]);
  }, [semana, semanasDisponibles]);

  const slotActual = useMemo(() => slots.find((s) => s.id === slotId), [slots, slotId]);
  const partidosFiltrados = useMemo(() => partidos.filter((p) => p.slotId === slotId && (!semana || p.semana === semana)), [partidos, slotId, semana]);
  const rankingPosByJugador = useMemo(() => {
    const map = {};
    (ranking ?? []).forEach((r, idx) => {
      map[r.id] = idx + 1;
    });
    return map;
  }, [ranking]);

  const yaGenerado = useMemo(
    () => partidosFiltrados.length > 0,
    [partidos, slotId, semana]
  );

  function handleGenerarClick() {
    if (!slotId || !semana) {
      console.warn("[Partidos] Generar cancelado: falta slotId o semana", { slotId, semana });
      return;
    }
    if (yaGenerado) {
      const ok = window.confirm("Ya existen partidos para ese slot y semana. ¿Regenerar?");
      if (!ok) return;
    }
    onGenerar(slotId, semana, { numPistas, numIndoor });
  }

  const reservas = useMemo(() => {
    if (!slotActual) return [];
    const idsAsignados = new Set(partidosFiltrados.flatMap((p) => p.jugadores.map((j) => j.jugadorId)));
    const candidates = (ranking ?? []).filter((r) => slotActual.jugadores?.some((j) => j.nombre === r.nombre && !idsAsignados.has(r.id)));
    return candidates;
  }, [slotActual, partidosFiltrados, ranking]);

  function buildWaText() {
    if (!slotActual || !partidosFiltrados.length) return "";
    let wa = `🎾 *${slotActual.label} — ${slotActual.club}*\n`;
    wa += `Partidos: ${partidosFiltrados.length} · Jugadores: ${partidosFiltrados.reduce((acc, p) => acc + p.jugadores.length, 0)}\n`;
    const indoorCount = partidosFiltrados.filter((p) => p.indoor).length;
    if (indoorCount > 0) wa += `🏠 ${indoorCount} partido${indoorCount !== 1 ? "s" : ""} indoor\n`;
    wa += "\n";
    partidosFiltrados.forEach((p, i) => {
      const hora = p.hora ? ` · 🕐 ${p.hora}` : "";
      const indoor = p.indoor ? " 🏠" : "";
      wa += `*Partido ${i + 1}*${hora}${indoor}\n`;
      wa += `${p.jugadores.map((j) => j.nombre).join(" · ")}\n\n`;
    });
    if (reservas.length) wa += `*Reserva:* ${reservas.map((r) => r.nombre).join(", ")}`;
    return wa;
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
      <h2 className="section-title">Partidos</h2>
      <div id="partidos-days">
        <select value={slotId} onChange={(e) => setSlotId(e.target.value)} style={{ fontSize: "14px", fontWeight: 600, height: "46px", borderColor: "var(--border2)", background: "var(--bg)", width: "100%", marginBottom: "1rem" }}>
          {slots.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slot.label} — {slot.club} ({slot.jugadores?.length ?? 0})
            </option>
          ))}
        </select>
      </div>

      {isCoord ? (
        <div className="coord-box">
          <div className="coord-box-title">
            <span className="coord-pill">Coord.</span> {slotActual?.label} — {slotActual?.club}
          </div>
          <div className="pistas-row">
            <span style={{ flex: 1, fontSize: "13px", color: "var(--text2)" }}>
              Pistas
              <br />
              <span style={{ fontSize: "12px" }}>
                <strong>{(slotActual?.jugadores?.length ?? 0) > numPistas * 4 ? numPistas * 4 : slotActual?.jugadores?.length ?? 0}</strong> titulares ·{" "}
                <strong>{Math.max(0, (slotActual?.jugadores?.length ?? 0) - numPistas * 4)}</strong> reserva
              </span>
            </span>
            <div className="pistas-ctrl">
              <button className="pistas-btn" onClick={() => setNumPistas((v) => Math.max(0, v - 1))}>−</button>
              <span className="pistas-num">{numPistas}</span>
              <button className="pistas-btn" onClick={() => setNumPistas((v) => Math.min(15, v + 1))}>+</button>
            </div>
          </div>
          <div className="pistas-row" style={{ marginBottom: ".75rem" }}>
            <span style={{ flex: 1, fontSize: "13px", color: "var(--text2)" }}>
              Pistas indoor
              <br />
              <span style={{ fontSize: "11px" }}>Lotería aleatoria</span>
            </span>
            <div className="pistas-ctrl">
              <button className="pistas-btn" onClick={() => setNumIndoor((v) => Math.max(0, v - 1))}>−</button>
              <span className="pistas-num">{numIndoor}</span>
              <button className="pistas-btn" onClick={() => setNumIndoor((v) => Math.min(numPistas, v + 1))}>+</button>
            </div>
          </div>
          <select value={semana} onChange={(e) => setSemana(e.target.value)}>
            {semanasDisponibles.map((sem) => (
              <option key={sem} value={sem}>
                Semana {sem}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm btn-block" onClick={handleGenerarClick}>
            {yaGenerado ? "🔄 Regenerar partidos" : "Generar partidos"}
          </button>
        </div>
      ) : null}

      {!partidosFiltrados.length ? (
        <div className="card">
          <div className="empty-state">{slotActual?.jugadores?.length ? "Los partidos aún no se han generado" : "No hay nadie apuntado"}</div>
        </div>
      ) : (
        <>
          {partidosFiltrados
            .sort((a, b) => (a.numeroPista ?? 0) - (b.numeroPista ?? 0))
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
                Reserva ({reservas.length})
              </div>
              <div>{reservas.map((p) => <span key={p.id} className="chip" style={{ fontSize: "11px" }}>{p.nombre}</span>)}</div>
            </div>
          ) : null}

          <div className="wa-box">
            <div className="wa-header">
              <span>WhatsApp</span>
              <button className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(buildWaText())}>Copiar</button>
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
