import { useState } from "react";
import { getFechaPartido, parejasPorSet } from "../../hooks/useResultados";

function emptySets() {
  return [
    { p1: 0, p2: 0 },
    { p1: 0, p2: 0 },
    { p1: 0, p2: 0 },
  ];
}

const STATUS = {
  vacio: {
    label: "Sin resultado",
    style: { color: "#6b7280", fontWeight: 500 },
    cardStyle: {},
  },
  pendiente: {
    label: "Introducido · pendiente de validacion",
    style: { color: "#d97706", fontWeight: 500 },
    cardStyle: { borderLeft: "3px solid #d97706" },
  },
  validado: {
    label: "✓ Validado",
    style: { color: "#16a34a", fontWeight: 700 },
    cardStyle: { borderLeft: "3px solid #16a34a" },
  },
};

function getStatus(yaIntroducido, validado) {
  if (validado) return STATUS.validado;
  if (yaIntroducido) return STATUS.pendiente;
  return STATUS.vacio;
}

export default function Resultados({
  partidos,
  onGuardar,
  onValidar,
  currentUser,
  isCoord,
  getResultado,
  mapSetsFromResultado,
}) {
  const [setsDraft, setSetsDraft] = useState({});

  function updateSet(pistaId, setIndex, side, value) {
    const base = setsDraft[pistaId] ?? emptySets();
    const next = base.map((s, i) => (i === setIndex ? { ...s, [side]: Number(value) || 0 } : s));
    setSetsDraft((prev) => ({ ...prev, [pistaId]: next }));
  }

  const userId = currentUser?.id;

  const partidosVisibles = partidos.filter((partido) => {
    if (isCoord) return true;
    const esJugador = partido.jugadores.some((j) => j.jugadorId === userId);
    if (esJugador) return true;
    const fecha = getFechaPartido(partido.semana, partido.diaSemana);
    const resultado = getResultado?.(partido.id, fecha);
    return Boolean(resultado?.validado_por);
  });

  if (partidosVisibles.length === 0) {
    return (
      <div>
        <h2 className="section-title">Resultados</h2>
        <p className="slot-meta">No hay partidos disponibles.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="section-title">Resultados</h2>
      {partidosVisibles.map((partido) => {
        const fecha = getFechaPartido(partido.semana, partido.diaSemana);
        const resultado = getResultado?.(partido.id, fecha);
        const parejas = parejasPorSet(partido.jugadores);

        const esJugador = partido.jugadores.some((j) => j.jugadorId === userId);
        const yaIntroducido = Boolean(resultado?.introducido_por);
        const validado = Boolean(resultado?.validado_por);

        const status = getStatus(yaIntroducido, validado);

        // Jugador puede editar solo si es del partido y aún no hay resultado.
        // El coord siempre puede editar.
        const puedeEditar = isCoord || (esJugador && !yaIntroducido);

        const baseSets =
          setsDraft[partido.id] ??
          (resultado ? mapSetsFromResultado(resultado) : emptySets());

        return (
          <article className="card" key={partido.id} style={status.cardStyle}>
            <p>
              <strong>
                {partido.slotLabel} · {partido.club}
              </strong>
              {partido.numeroPista ? ` — Pista ${partido.numeroPista}` : ""}
            </p>
            <p className="slot-meta">
              {fecha || "Fecha pendiente"} · Semana {partido.semana}
            </p>

            <p style={{ margin: "6px 0 10px", fontSize: "0.875rem", ...status.style }}>
              {status.label}
            </p>

            {parejas ? (
              <div className="sets-container">
                {parejas.map((par, idx) => (
                  <div key={idx} className="set-box">
                    <div className="set-header">
                      <span className="set-label">{par.label}</span>
                    </div>
                    <div className="set-row">
                      <span className="set-pareja">
                        {par.p1.map((j) => j.nombre).join(" + ")}
                      </span>
                      {puedeEditar ? (
                        <div className="set-inputs">
                          <input
                            type="number"
                            min="0"
                            value={baseSets[idx].p1}
                            onChange={(e) => updateSet(partido.id, idx, "p1", e.target.value)}
                          />
                          <span className="set-vs">—</span>
                          <input
                            type="number"
                            min="0"
                            value={baseSets[idx].p2}
                            onChange={(e) => updateSet(partido.id, idx, "p2", e.target.value)}
                          />
                        </div>
                      ) : resultado ? (
                        <span
                          className="set-score"
                          style={validado ? { color: "#16a34a", fontWeight: 600 } : undefined}
                        >
                          {baseSets[idx].p1} — {baseSets[idx].p2}
                        </span>
                      ) : (
                        <span className="slot-meta">—</span>
                      )}
                      <span className="set-pareja">
                        {par.p2.map((j) => j.nombre).join(" + ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="slot-meta">Faltan jugadores para calcular parejas.</p>
            )}

            {puedeEditar && (
              <div className="slot-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onGuardar(partido.id, fecha, baseSets)}
                >
                  {yaIntroducido ? "Modificar resultado" : "Guardar resultado"}
                </button>
              </div>
            )}

            {isCoord && resultado && !validado && (
              <div className="slot-actions">
                <button
                  className="btn btn-sm"
                  onClick={() => onValidar(partido.id, fecha)}
                >
                  Validar resultado
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
