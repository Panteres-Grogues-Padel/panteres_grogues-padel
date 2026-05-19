import { useEffect, useMemo, useState } from "react";
import { usePadrinos } from "../../hooks/usePadrinos";
import { jugadoresCoinciden } from "../../utils/jugador";
import { getNombre } from "../../utils/nombres";

function displayNombre(j) {
  return getNombre(j) || j?.nombreCompleto || j?.nombre || "Jugador";
}

function PadrinosCard({ title, children }) {
  return (
    <div className="padrinos-card">
      <div className="padrinos-card__title">{title}</div>
      <div className="padrinos-card__body">{children}</div>
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

  const [ahijadoSel, setAhijadoSel] = useState("");
  const [padrinoSel, setPadrinoSel] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const listaGestion = useMemo(
    () =>
      [...jugadores].sort((a, b) =>
        displayNombre(a).localeCompare(displayNombre(b), "es")
      ),
    [jugadores]
  );

  const ahijado = useMemo(
    () => jugadores.find((j) => jugadoresCoinciden(j.id, ahijadoSel)) ?? null,
    [jugadores, ahijadoSel]
  );

  const candidatos = useMemo(
    () => (ahijadoSel ? candidatosPadrino(ahijadoSel) : []),
    [ahijadoSel, candidatosPadrino]
  );

  useEffect(() => {
    setPadrinoSel(ahijado?.padrinoId ?? "");
  }, [ahijado?.id, ahijado?.padrinoId]);

  async function handleAsignar() {
    if (!ahijadoSel || !padrinoSel) {
      setMsg("Selecciona un ahijado/a y un padrino/madrina.");
      return;
    }
    setMsg("");
    setGuardando(true);
    const res = await asignarPadrino(ahijadoSel, padrinoSel);
    setGuardando(false);
    if (!res.ok) setMsg(res.error ?? "No se pudo asignar.");
    else setMsg("Padrino/madrina asignado correctamente.");
  }

  async function handleQuitar() {
    if (!ahijadoSel) return;
    setMsg("");
    setGuardando(true);
    const res = await desasignarPadrino(ahijadoSel);
    setGuardando(false);
    if (!res.ok) setMsg(res.error ?? "No se pudo quitar el padrino/madrina.");
    else {
      setPadrinoSel("");
      setMsg("Padrino/madrina desasignado.");
    }
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
          <div className="padrinos-gestion-form card">
            <label className="padrinos-field">
              <span className="padrinos-field__label">Selecciona un ahijado/a</span>
              <select
                className="padrinos-select"
                value={ahijadoSel}
                disabled={guardando || loading}
                onChange={(ev) => setAhijadoSel(ev.target.value)}
              >
                <option value="">— Elige un jugador —</option>
                {listaGestion.map((j) => (
                  <option key={j.id} value={j.id}>
                    {displayNombre(j)}
                  </option>
                ))}
              </select>
            </label>

            {ahijadoSel ? (
              <>
                <label className="padrinos-field">
                  <span className="padrinos-field__label">Selecciona su padrino/madrina</span>
                  <select
                    className="padrinos-select"
                    value={padrinoSel}
                    disabled={guardando}
                    onChange={(ev) => setPadrinoSel(ev.target.value)}
                  >
                    <option value="">— Elige padrino/madrina —</option>
                    {candidatos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {displayNombre(c)}
                      </option>
                    ))}
                  </select>
                </label>

                {ahijado?.padrinoId ? (
                  <p className="padrinos-muted padrinos-gestion-actual">
                    Actual: {ahijado.padrinoNombre ?? "Asignado"}
                  </p>
                ) : null}

                <div className="padrinos-gestion-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    disabled={guardando || !padrinoSel}
                    onClick={() => void handleAsignar()}
                  >
                    Asignar
                  </button>
                  {ahijado?.padrinoId ? (
                    <button
                      type="button"
                      className="btn btn-block"
                      disabled={guardando}
                      onClick={() => void handleQuitar()}
                    >
                      Quitar padrino/madrina
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
