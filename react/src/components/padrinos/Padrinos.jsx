import { useEffect, useMemo, useState } from "react";
import { usePadrinos } from "../../hooks/usePadrinos";
import { jugadoresCoinciden } from "../../utils/jugador";

function displayNombre(j) {
  return j?.nombreCompleto ?? j?.nombre ?? "Jugador";
}

function PadrinosCard({ title, children }) {
  return (
    <div className="padrinos-card">
      <div className="padrinos-card__title">{title}</div>
      <div className="padrinos-card__body">{children}</div>
    </div>
  );
}

function GestionFila({ jugador, candidatos, onGuardar, onDesasignar, guardando }) {
  const [padrinoSel, setPadrinoSel] = useState(jugador.padrinoId ?? "");

  useEffect(() => {
    setPadrinoSel(jugador.padrinoId ?? "");
  }, [jugador.padrinoId]);

  return (
    <div className="padrinos-gestion-row">
      <div className="padrinos-gestion-row__nombre">{displayNombre(jugador)}</div>
      <div className="padrinos-gestion-row__actual">
        {jugador.padrinoId ? (
          <span>{jugador.padrinoNombre ?? "Asignado"}</span>
        ) : (
          <span className="padrinos-muted">Sin asignar</span>
        )}
      </div>
      <select
        className="padrinos-select"
        value={padrinoSel}
        disabled={guardando}
        onChange={(ev) => setPadrinoSel(ev.target.value)}
      >
        <option value="">Sin asignar</option>
        {candidatos.map((c) => (
          <option key={c.id} value={c.id}>
            {displayNombre(c)}
          </option>
        ))}
      </select>
      <div className="padrinos-gestion-row__actions">
        <button
          type="button"
          className="btn btn-sm btn-primary"
          disabled={guardando}
          onClick={() => onGuardar(jugador.id, padrinoSel || null)}
        >
          Guardar
        </button>
        {jugador.padrinoId ? (
          <button
            type="button"
            className="btn btn-sm"
            disabled={guardando}
            onClick={() => onDesasignar(jugador.id)}
          >
            Desasignar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function Padrinos({ currentUser, isCoord }) {
  const {
    jugadores,
    loading,
    error,
    miPadrino,
    misAhijados,
    candidatosPadrino,
    asignarPadrino,
    desasignarPadrino
  } = usePadrinos(currentUser);

  const [guardandoId, setGuardandoId] = useState(null);
  const [msg, setMsg] = useState("");

  const listaGestion = useMemo(
    () =>
      [...jugadores].sort((a, b) =>
        displayNombre(a).localeCompare(displayNombre(b), "es")
      ),
    [jugadores]
  );

  async function handleGuardar(ahijadoId, padrinoId) {
    setMsg("");
    setGuardandoId(ahijadoId);
    const res = padrinoId
      ? await asignarPadrino(ahijadoId, padrinoId)
      : await desasignarPadrino(ahijadoId);
    setGuardandoId(null);
    if (!res.ok) setMsg(res.error ?? "No se pudo guardar.");
    else setMsg("Asignación guardada.");
  }

  async function handleDesasignar(ahijadoId) {
    setMsg("");
    setGuardandoId(ahijadoId);
    const res = await desasignarPadrino(ahijadoId);
    setGuardandoId(null);
    if (!res.ok) setMsg(res.error ?? "No se pudo desasignar.");
    else setMsg("Padrino/madrina desasignado.");
  }

  return (
    <div className="padrinos-page">
      {loading ? <p className="info-box">Cargando jugadores…</p> : null}
      {error ? <p className="error-box">{error}</p> : null}
      {msg ? <p className="info-box">{msg}</p> : null}

      <PadrinosCard title="Tu padrino/madrina">
        {miPadrino ? (
          <p className="padrinos-nombre">{displayNombre(miPadrino)}</p>
        ) : (
          <p className="padrinos-muted">De momento no tienes padrino/madrina asignado 🏳️‍🌈</p>
        )}
      </PadrinosCard>

      <PadrinosCard title="Tus ahijados/as">
        {misAhijados.length > 0 ? (
          <ul className="padrinos-lista">
            {misAhijados.map((a) => (
              <li key={a.id}>{displayNombre(a)}</li>
            ))}
          </ul>
        ) : (
          <p className="padrinos-muted">De momento no tienes ahijados/as asignados</p>
        )}
      </PadrinosCard>

      {isCoord ? (
        <>
          <div className="padrinos-section-label">Gestionar asignaciones</div>
          <div className="padrinos-gestion">
            {listaGestion.map((j) => (
              <GestionFila
                key={j.id}
                jugador={j}
                candidatos={candidatosPadrino(j.id)}
                guardando={guardandoId != null && jugadoresCoinciden(guardandoId, j.id)}
                onGuardar={handleGuardar}
                onDesasignar={handleDesasignar}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
