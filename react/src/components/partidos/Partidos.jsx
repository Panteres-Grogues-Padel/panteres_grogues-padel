import { useMemo, useState } from "react";

export default function Partidos({
  partidos,
  slots,
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
  const [filtroSlot, setFiltroSlot] = useState("all");

  const semanasDisponibles = useMemo(() => {
    const set = new Set([
      ...slots.map((s) => s.semanaObjetivo).filter(Boolean),
      ...partidos.map((p) => p.semana).filter(Boolean)
    ]);
    return [...set].sort();
  }, [slots, partidos]);

  const partidosFiltrados = useMemo(
    () =>
      partidos.filter((p) => {
        const okSlot = filtroSlot === "all" || p.slotId === filtroSlot;
        const okSemana = !semana || p.semana === semana;
        return okSlot && okSemana;
      }),
    [partidos, filtroSlot, semana]
  );

  const yaGenerado = useMemo(
    () => partidos.some((p) => p.slotId === slotId && p.semana === semana),
    [partidos, slotId, semana]
  );

  function handleGenerarClick() {
    if (yaGenerado) {
      const ok = window.confirm("Ya existen partidos para ese slot y semana. ¿Regenerar?");
      if (!ok) return;
    }
    onGenerar(slotId, semana);
  }

  return (
    <div>
      <div className="row-between">
        <h2 className="section-title">Partidos</h2>
      </div>
      {isCoord ? (
        <div className="card">
          <div className="stack">
            <select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.label} · {slot.club}
                </option>
              ))}
            </select>
            <select value={semana} onChange={(e) => setSemana(e.target.value)}>
              {semanasDisponibles.map((sem) => (
                <option key={sem} value={sem}>
                  Semana {sem}
                </option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleGenerarClick}>
              {yaGenerado ? "Regenerar slot" : "Generar para slot"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="card">
        <div className="stack">
          <select value={filtroSlot} onChange={(e) => setFiltroSlot(e.target.value)}>
            <option value="all">Todos los slots</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.label} · {slot.club}
              </option>
            ))}
          </select>
          <select value={semana} onChange={(e) => setSemana(e.target.value)}>
            {semanasDisponibles.map((sem) => (
              <option key={sem} value={sem}>
                Semana {sem}
              </option>
            ))}
          </select>
        </div>
      </div>

      {partidosFiltrados.map((p) => (
        <article className="card" key={p.id}>
          <p>
            <strong>
              {p.slotLabel} · {p.club}
            </strong>
          </p>
          <p className="slot-meta">Semana: {p.semana}</p>
          <p className="slot-meta">
            Jugadores: {p.jugadores.map((j) => j.nombre).join(", ")}
          </p>
          {p.jugadores.length < 4 ? (
            <p className="error-box">Partido incompleto: faltan jugadores para llegar a 4.</p>
          ) : null}
          {p.jugadores.length === 4 ? (
            <div className="info-box">
              <div>Set 1: {p.jugadores[0].nombre}+{p.jugadores[3].nombre} vs {p.jugadores[1].nombre}+{p.jugadores[2].nombre}</div>
              <div>Set 2: {p.jugadores[0].nombre}+{p.jugadores[2].nombre} vs {p.jugadores[1].nombre}+{p.jugadores[3].nombre}</div>
              <div>Set 3: {p.jugadores[0].nombre}+{p.jugadores[1].nombre} vs {p.jugadores[2].nombre}+{p.jugadores[3].nombre}</div>
            </div>
          ) : null}

          <div className="stack mt-8">
            {p.jugadores.map((j) => (
              <div key={j.jugadorId} className="row-between">
                <span>
                  {j.posicion}. {j.nombre} {j.confirmado ? "✅" : "⏳"}
                </span>
                {currentUser?.id === j.jugadorId ? (
                  <button
                    className="btn btn-sm"
                    onClick={() => onConfirmar(p.id, j.jugadorId, !j.confirmado)}
                  >
                    {j.confirmado ? "Desconfirmar" : "Confirmar"}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {isCoord ? (
            <div className="stack">
              <input
                type="time"
                value={p.hora || ""}
                onChange={(e) => onHora(p.id, e.target.value)}
              />
              <label className="privacy-row">
                <input type="checkbox" checked={Boolean(p.indoor)} onChange={() => onIndoor(p.id)} />
                <span>Indoor</span>
              </label>
              {partidos
                .filter((other) => other.id !== p.id)
                .map((other) => (
                  <button
                    key={other.id}
                    className="btn btn-sm"
                    onClick={() => onMover(p.id, other.id, p.jugadores[0]?.jugadorId)}
                  >
                    Mover {p.jugadores[0]?.nombre ?? "jugador"} a pista #{other.id.slice(0, 6)}
                  </button>
                ))}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
