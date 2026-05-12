import { useState } from "react";

function emptySets() {
  return [
    { p1: 0, p2: 0 },
    { p1: 0, p2: 0 },
    { p1: 0, p2: 0 }
  ];
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Resultados({
  partidos,
  onGuardar,
  onValidar,
  currentUser,
  isCoord,
  getResultado,
  mapSetsFromResultado
}) {
  const [setsDraft, setSetsDraft] = useState({});
  const [fecha, setFecha] = useState(todayStr());

  function updateSet(partidoId, setIndex, side, value) {
    const base = setsDraft[partidoId] ?? emptySets();
    const next = base.map((s, i) => (i === setIndex ? { ...s, [side]: Number(value) || 0 } : s));
    setSetsDraft((prev) => ({ ...prev, [partidoId]: next }));
  }

  const partidosFiltrados = isCoord
    ? partidos
    : partidos.filter((p) => p.jugadores.some((j) => j.jugadorId === currentUser?.id));

  return (
    <div>
      <h2 className="section-title">Resultados</h2>
      <div className="card">
        {isCoord ? (
          <label className="stack">
            <span>Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        ) : (
          <p className="slot-meta">Solo puedes introducir resultados de hoy: {todayStr()}</p>
        )}
      </div>
      {partidosFiltrados.map((p) => {
        const resultado = getResultado?.(p.id, fecha);
        const prefill = resultado ? mapSetsFromResultado(resultado) : null;
        const baseSets = setsDraft[p.id] ?? prefill ?? emptySets();
        const canValidate =
          currentUser &&
          resultado &&
          resultado.introducido_por !== currentUser.id &&
          !resultado.validado_por &&
          (isCoord || p.jugadores.some((j) => j.jugadorId === currentUser.id));
        return (
          <article className="card" key={p.id}>
            <p>
              <strong>
                {p.slotLabel} · {p.club}
              </strong>
            </p>
            <p className="slot-meta">Fecha resultado: {fecha}</p>
            <p className="slot-meta">{p.jugadores.map((j) => j.nombre).join(", ")}</p>
            <div className="grid-sets">
              {[0, 1, 2].map((idx) => (
                <div key={idx} className="set-box">
                  <span>Set {idx + 1}</span>
                  <input
                    type="number"
                    min="0"
                    value={baseSets[idx].p1}
                    onChange={(e) => updateSet(p.id, idx, "p1", e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    value={baseSets[idx].p2}
                    onChange={(e) => updateSet(p.id, idx, "p2", e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="slot-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onGuardar(p.id, fecha, baseSets)}
              >
                Guardar resultado
              </button>
              {canValidate ? (
                <button className="btn btn-sm" onClick={() => onValidar(p.id, fecha)}>
                  Validar resultado
                </button>
              ) : null}
            </div>
            {resultado?.validado_por ? (
              <p className="info-box">Resultado validado</p>
            ) : resultado ? (
              <p className="slot-meta">Pendiente de validacion</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
