import { t } from "../../i18n";

function nombreFix(jugador) {
  return jugador?.nombre ?? t("common.player");
}

export default function MoverJugador({ open, origenPartido, jugador, destinos, onClose, onMove }) {
  if (!open || !origenPartido || !jugador) return null;

  return (
    <div className="overlay open">
      <div className="overlay-sheet open">
        <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", marginBottom: "4px" }}>
          {t("partidos.move.title")}
        </div>
        <div style={{ fontSize: "13px", color: "var(--text2)", marginBottom: "1rem" }}>
          {t("partidos.move.subtitle", {
            name: nombreFix(jugador),
            from: origenPartido.numeroPista || "-"
          })}
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
                  {t("partidos.move.option", {
                    num: d.numeroPista || "-",
                    hora: d.hora ? ` · 🕐 ${d.hora}` : "",
                    count
                  })}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text2)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {d.jugadores.map((j) => nombreFix(j)).join(", ")}
                </div>
              </div>
              <button className="btn btn-sm btn-primary" style={{ fontSize: "12px", flexShrink: 0, marginLeft: "10px" }} onClick={() => onMove(d.id)}>
                {t("common.move")}
              </button>
            </div>
          );
        })}

        <button className="close-btn" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
