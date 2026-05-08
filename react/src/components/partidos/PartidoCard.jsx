import { useMemo, useState } from "react";

const AVATAR_CLASSES = ["av-teal", "av-purple", "av-coral", "av-blue", "av-amber", "av-pink", "av-green", "av-gray"];

function initials(nombre = "") {
  return nombre
    .split(/[\s_]/)
    .map((w) => w?.[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarClass(nombre = "") {
  return AVATAR_CLASSES[(nombre.charCodeAt(0) || 0) % AVATAR_CLASSES.length];
}

export default function PartidoCard({
  partido,
  index,
  isCoord,
  currentUser,
  onConfirmar,
  onHora,
  onIndoor,
  onOpenMover,
  rankingPosByJugador
}) {
  const [expanded, setExpanded] = useState(false);
  const allConfirmed = useMemo(() => partido.jugadores.every((j) => j.confirmado), [partido.jugadores]);
  const names = useMemo(() => partido.jugadores.map((j) => j.nombre).join(", "), [partido.jugadores]);

  return (
    <div style={{ border: "0.5px solid var(--border)", borderRadius: "var(--radius)", marginBottom: "6px", overflow: "hidden" }}>
      <div
        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "9px 12px", background: "var(--bg2)", cursor: "pointer" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", minWidth: "68px" }}>Partido {index + 1}</span>
        {partido.indoor ? (
          <span style={{ fontSize: "10px", background: "var(--bg3)", color: "var(--navy)", padding: "1px 5px", borderRadius: "4px", fontWeight: 600 }}>
            🏠
          </span>
        ) : null}
        {partido.hora ? (
          <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--navy)" }}>🕐 {partido.hora}</span>
        ) : (
          <span style={{ fontSize: "11px", color: "var(--text3)" }}>Sin hora</span>
        )}
        {allConfirmed ? <span style={{ fontSize: "11px", color: "#27500A", fontWeight: 600 }}>✅</span> : null}
        <span style={{ fontSize: "11px", color: "var(--text2)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {names}
        </span>
        <span style={{ fontSize: "12px", color: "var(--text2)", transition: "transform .2s", transform: expanded ? "rotate(90deg)" : "none" }}>▶</span>
      </div>

      {expanded ? (
        <div style={{ padding: "10px 12px", background: "var(--bg)" }}>
          {partido.jugadores.map((j) => {
            const isSelf = currentUser && j.nombre === currentUser.nombre;
            const rkPos = rankingPosByJugador[j.jugadorId];
            return (
              <div key={j.jugadorId} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 0", borderBottom: "0.5px solid var(--border)" }}>
                <div className={`avatar ${avatarClass(j.nombre)}`} style={{ width: "22px", height: "22px", fontSize: "9px" }}>
                  {initials(j.nombre)}
                </div>
                <span style={{ fontSize: "13px", flex: 1 }}>
                  {j.nombre}
                  <span style={{ fontSize: "10px", color: "var(--text2)", marginLeft: "4px" }}>#{rkPos || "-"}</span>
                </span>
                {j.confirmado ? (
                  <span style={{ fontSize: "11px", color: "#27500A", fontWeight: 600 }}>✓</span>
                ) : isSelf ? (
                  <button className="btn btn-sm" style={{ fontSize: "11px", padding: "2px 8px" }} onClick={() => onConfirmar(partido.id, j.jugadorId, true)}>
                    Confirmar
                  </button>
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--text3)" }}>—</span>
                )}
                {isCoord ? (
                  <button
                    className="btn btn-sm"
                    style={{ fontSize: "10px", padding: "2px 6px", color: "var(--text2)" }}
                    onClick={() => onOpenMover(partido, j)}
                  >
                    ↕️
                  </button>
                ) : null}
              </div>
            );
          })}

          {isCoord ? (
            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "8px", flexWrap: "wrap" }}>
              <input
                type="time"
                value={partido.hora || ""}
                onChange={(e) => onHora(partido.id, e.target.value)}
                style={{ fontSize: "12px", height: "30px", padding: "2px 8px", border: "0.5px solid var(--border2)", borderRadius: "var(--radius)", background: "var(--bg)", width: "100px" }}
              />
              <button className="btn btn-sm" style={{ fontSize: "11px", padding: "3px 9px" }} onClick={() => onIndoor(partido.id)}>
                {partido.indoor ? "🏠 Quitar indoor" : "Marcar indoor"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
