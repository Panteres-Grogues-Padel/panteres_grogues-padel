import { useEffect, useMemo, useState } from "react";
import { getDiasDisponiblesResultados, hoyLocalStr } from "../../utils/dates";
import {
  getEstadoLabel,
  getPermisosResultado,
  getRotacionesAmericano
} from "../../utils/resultadosUtils";
import ResultadosCalendario from "./ResultadosCalendario";
import { getNombre } from "../../utils/nombres";

function emptySets() {
  return [
    { p1: 0, p2: 0 },
    { p1: 0, p2: 0 },
    { p1: 0, p2: 0 }
  ];
}

function PartidoResultadoCard({
  partido,
  resultado,
  setsDraft,
  onUpdateSet,
  onGuardar,
  onValidar,
  onModificar,
  currentUser,
  isCoord,
  mapSetsFromResultado
}) {
  const fecha = partido.fechaPartido;
  const permisos = getPermisosResultado({ partido, resultado, currentUser, isCoord });
  const rotaciones = getRotacionesAmericano(partido.jugadores);
  const prefill = resultado ? mapSetsFromResultado(resultado) : null;
  const sets = setsDraft ?? prefill ?? emptySets();
  const estadoClass = `res-card res-card--${permisos.estado}`;

  return (
    <article className={estadoClass}>
      <div className="res-card-head">
        <div>
          <strong>
            {partido.slotLabel} · {partido.club}
          </strong>
          <p className="slot-meta">
            Pista {partido.numeroPista}
            {partido.hora ? ` · ${partido.hora}` : ""}
            {partido.indoor ? " · Indoor" : ""}
          </p>
        </div>
        <span className={`res-estado-badge res-estado-badge--${permisos.estado}`}>
          {getEstadoLabel(permisos.estado)}
        </span>
      </div>

      <div className="res-jugadores-chips">
        {[...partido.jugadores]
          .sort((a, b) => a.posicion - b.posicion)
          .map((j) => (
            <span
              key={j.id}
              className={`chip${String(j.jugadorId) === String(currentUser?.id) ? " res-chip-me" : ""}`}
            >
              <span className="res-pos">{j.posicion}º</span> {getNombre(j)}
            </span>
          ))}
      </div>

      {permisos.puedeEditar ? (
        <div className="res-sets-edit">
          {rotaciones.map((rot, idx) => (
            <div key={idx} className="score-card">
              <div className="score-card-title">Set {idx + 1}</div>
              <p className="res-rot-label">{rot.label}</p>
              <div className="score-row-ctrl">
                <div className="score-side">
                  <div className="score-ctrl">
                    <button
                      type="button"
                      className="sc-btn"
                      onClick={() => onUpdateSet(partido.id, idx, "p1", Math.max(0, sets[idx].p1 - 1))}
                    >
                      −
                    </button>
                    <div className="sc-num">{sets[idx].p1}</div>
                    <button
                      type="button"
                      className="sc-btn"
                      onClick={() => onUpdateSet(partido.id, idx, "p1", Math.min(7, sets[idx].p1 + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="sc-vs">vs</div>
                <div className="score-side">
                  <div className="score-ctrl">
                    <button
                      type="button"
                      className="sc-btn"
                      onClick={() => onUpdateSet(partido.id, idx, "p2", Math.max(0, sets[idx].p2 - 1))}
                    >
                      −
                    </button>
                    <div className="sc-num">{sets[idx].p2}</div>
                    <button
                      type="button"
                      className="sc-btn"
                      onClick={() => onUpdateSet(partido.id, idx, "p2", Math.min(7, sets[idx].p2 + 1))}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-primary btn-sm btn-block" onClick={() => onGuardar(partido.id, sets)}>
            {resultado ? "Guardar cambios" : "Guardar resultado"}
          </button>
          {!isCoord && !resultado ? (
            <p className="slot-meta res-hint">El coordinador deberá validarlo</p>
          ) : null}
        </div>
      ) : (
        <div className="res-sets-view">
          {resultado ? (
            rotaciones.map((rot, idx) => {
              const s = sets[idx];
              const [izq, der] = rot.label.split(" vs ");
              return (
                <div key={idx} className="rot-row">
                  <span className="rot-lbl">Set {idx + 1}</span>
                  <span className="rot-side">{izq}</span>
                  <span className="rot-score">
                    {s.p1} – {s.p2}
                  </span>
                  <span className="rot-side rot-side-r">{der}</span>
                </div>
              );
            })
          ) : (
            <p className="slot-meta res-sin-resultado">Aún no hay resultado registrado</p>
          )}
        </div>
      )}

      {permisos.puedeModificar ? (
        <button type="button" className="btn btn-sm btn-block res-modificar-btn" onClick={() => onModificar(partido.id)}>
          Modificar resultado
        </button>
      ) : null}

      {isCoord && permisos.puedeValidar ? (
        <button type="button" className="btn btn-primary btn-sm btn-block res-validar-btn" onClick={() => onValidar(partido.id)}>
          Validar resultado
        </button>
      ) : null}

      {!isCoord && permisos.estado === "pendiente" ? (
        <p className="slot-meta res-hint">Pendiente de validación por el coordinador</p>
      ) : null}
    </article>
  );
}

export default function Resultados({
  partidos,
  onGuardar,
  onValidar,
  onModificar,
  currentUser,
  isCoord,
  getResultado,
  mapSetsFromResultado
}) {
  const hoy = hoyLocalStr();
  const diasDisponibles = useMemo(() => getDiasDisponiblesResultados(partidos, isCoord), [partidos, isCoord]);
  const [fechaSel, setFechaSel] = useState("");
  const [setsDraft, setSetsDraft] = useState({});

  useEffect(() => {
    if (!diasDisponibles.length) {
      setFechaSel("");
      return;
    }
    if (!fechaSel || !diasDisponibles.includes(fechaSel)) {
      const preferido = diasDisponibles.includes(hoy) ? hoy : diasDisponibles[diasDisponibles.length - 1];
      setFechaSel(preferido);
    }
  }, [diasDisponibles, fechaSel, hoy]);

  const partidosDia = useMemo(
    () =>
      partidos
        .filter((p) => p.fechaPartido === fechaSel)
        .sort((a, b) => (a.numeroPista ?? 0) - (b.numeroPista ?? 0)),
    [partidos, fechaSel]
  );

  function updateSet(partidoId, setIndex, side, value) {
    const partido = partidos.find((p) => p.id === partidoId);
    const resultado = getResultado?.(partidoId, partido?.fechaPartido);
    const prefill = resultado ? mapSetsFromResultado(resultado) : null;
    const base = setsDraft[partidoId] ?? prefill ?? emptySets();
    const next = base.map((s, i) => (i === setIndex ? { ...s, [side]: value } : s));
    setSetsDraft((prev) => ({ ...prev, [partidoId]: next }));
  }

  function handleGuardar(partidoId, sets) {
    const partido = partidos.find((p) => p.id === partidoId);
    onGuardar(partidoId, partido?.fechaPartido ?? fechaSel, sets);
  }

  function handleValidar(partidoId) {
    const partido = partidos.find((p) => p.id === partidoId);
    onValidar(partidoId, partido?.fechaPartido ?? fechaSel);
  }

  function handleModificar(partidoId) {
    const partido = partidos.find((p) => p.id === partidoId);
    const resultado = getResultado?.(partidoId, partido?.fechaPartido);
    if (resultado) {
      setSetsDraft((prev) => ({
        ...prev,
        [partidoId]: mapSetsFromResultado(resultado)
      }));
    }
    onModificar(partidoId, partido?.fechaPartido ?? fechaSel);
  }

  return (
    <div className="resultados-page">
      <h2 className="section-title">Resultados</h2>

      {isCoord ? (
        <p className="slot-meta res-ventana-hint">Semana pasada y hoy · sin partidos futuros</p>
      ) : (
        <p className="slot-meta res-ventana-hint">
          Puedes introducir resultados solo en tus partidos de hoy o ayer. Consulta cualquier día.
        </p>
      )}

      <div id="resultados-days">
        {diasDisponibles.length ? (
          <ResultadosCalendario
            fechasConPartidos={diasDisponibles}
            fechaSel={fechaSel}
            onSelectFecha={setFechaSel}
          />
        ) : (
          <p className="slot-meta">No hay partidos con resultados en esta ventana</p>
        )}
      </div>

      {!diasDisponibles.length ? (
        <div className="card">
          <div className="empty-state">Genera partidos en la pestaña Partidos para poder registrar resultados</div>
        </div>
      ) : !partidosDia.length ? (
        <div className="card">
          <div className="empty-state">No hay partidos este día</div>
        </div>
      ) : (
        partidosDia.map((p) => {
          const resultado = getResultado?.(p.id, p.fechaPartido);
          return (
            <PartidoResultadoCard
              key={p.id}
              partido={p}
              resultado={resultado}
              setsDraft={setsDraft[p.id]}
              onUpdateSet={updateSet}
              onGuardar={handleGuardar}
              onValidar={handleValidar}
              onModificar={handleModificar}
              currentUser={currentUser}
              isCoord={isCoord}
              mapSetsFromResultado={mapSetsFromResultado}
            />
          );
        })
      )}
    </div>
  );
}
