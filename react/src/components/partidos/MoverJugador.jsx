import { getNombre } from "../../utils/nombres";

export default function MoverJugador({ open, origenPartido, jugador, destinos, onClose, onMove }) {
  if (!open || !origenPartido || !jugador) return null;

  return (
    <div className="overlay open">
      <div className="overlay-sheet open">
        <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>↕️ Mover jugador</div>
        <div style={{ fontSize: "13px", color: "var(--text2)", marginBottom: "1rem" }}>
          Mover a <strong>{getNombre(jugador)}</strong> desde Partido {origenPartido.numeroPista || "-"} a:
        </div>

        {destinos.map((d) => {
          const count = d.jugadores.length;
          return (
            <div
              key={d.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "0.5px solid var(--border)" }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}>
                  Partido {d.numeroPista || "-"}
                  {d.hora ? ` · 🕐 ${d.hora}` : ""}{" "}
                  <span style={{ fontSize: "11px", fontWeight: 600, ...{ color: count < 4 ? "#27500A" : count === 4 ? "var(--text2)" : "#BA7517" } }}>
                    ({count} jugadores)
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text2)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.jugadores.map((j) => getNombre(j)).join(", ")}
                </div>
              </div>
              <button className="btn btn-sm btn-primary" style={{ fontSize: "12px", flexShrink: 0, marginLeft: "10px" }} onClick={() => onMove(d.id)}>
                Mover
              </button>
            </div>
          );
        })}

        <button className="close-btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
