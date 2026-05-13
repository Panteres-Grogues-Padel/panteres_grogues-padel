import { useEffect, useMemo, useState } from "react";
import PartidoCard from "./PartidoCard";
import MoverJugador from "./MoverJugador";
import { copyTextToClipboard } from "../../utils/clipboard";
import { formatHoraInput, getLunesSemanaActual, normalizeSemanaDate } from "../../utils/dates";

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

export default function Partidos({
  partidos,
  slots,
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
  const [slotId, setSlotId] = useState(slots[0]?.id ?? "");
  const [numPistas, setNumPistas] = useState(0);
  const [numIndoor, setNumIndoor] = useState(0);
  const [moverState, setMoverState] = useState({ open: false, origen: null, jugador: null });

  const semanaActual = useMemo(() => getLunesSemanaActual(), []);

  useEffect(() => {
    if (!slotId && slots.length) setSlotId(slots[0].id);
  }, [slotId, slots]);

  useEffect(() => {
    const slot = slots.find((s) => s.id === slotId);
    if (slot) {
      setNumPistas(slot.pistas ?? 0);
      setNumIndoor(0);
    }
  }, [slotId, slots]);

  useEffect(() => {
    if (!slotId || !onLoadSlot) return;
    void onLoadSlot(slotId, semanaActual);
  }, [slotId, semanaActual, onLoadSlot]);

  const slotActual = useMemo(() => slots.find((s) => s.id === slotId), [slots, slotId]);
  const semNorm = normalizeSemanaDate(semanaActual);

  const partidosFiltrados = useMemo(() => {
    const sid = String(slotId);
    const seen = new Map();
    for (const p of partidos) {
      if (String(p.slotId) !== sid) continue;
      if (semNorm && normalizeSemanaDate(p.semana) !== semNorm) continue;
      seen.set(String(p.pistaId ?? p.id), p);
    }
    return [...seen.values()];
  }, [partidos, slotId, semNorm]);

  const rankingPosByJugador = useMemo(() => {
    const map = {};
    (ranking ?? []).forEach((r, idx) => {
      map[String(r.id)] = idx + 1;
    });
    return map;
  }, [ranking]);

  const yaGenerado = partidosFiltrados.length > 0;
  const hayInscritos = (slotActual?.jugadores?.length ?? 0) > 0;

  function handleGenerarClick(regenerar) {
    if (!slotId || !semanaActual) return;
    if (regenerar) {
      const ok = window.confirm("¿Regenerar los partidos de esta semana?");
      if (!ok) return;
    }
    onGenerar(slotId, semanaActual, { numPistas, numIndoor });
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
    const ordenados = [...partidosFiltrados].sort((a, b) => (a.numeroPista ?? 0) - (b.numeroPista ?? 0));
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
        <select
          value={slotId}
          onChange={(e) => setSlotId(e.target.value)}
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
            <span style={{ display: "block", fontSize: "12px", fontWeight: 400, color: "var(--text2)", marginTop: "4px" }}>
              Semana {semanaActual}
            </span>
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
          {yaGenerado ? (
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={() => handleGenerarClick(true)}>
              Regenerar partidos
            </button>
          ) : hayInscritos ? (
            <button type="button" className="btn btn-primary btn-sm btn-block" onClick={() => handleGenerarClick(false)}>
              Generar partidos
            </button>
          ) : null}
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
