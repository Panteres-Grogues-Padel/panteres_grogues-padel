import { useEffect, useMemo, useState } from "react";
import { usePadrinos } from "../../hooks/usePadrinos";
import { jugadoresCoinciden } from "../../utils/jugador";
import { getNombre } from "../../utils/nombres";
import { DATE_LOCALE } from "../../utils/dates";
import { t } from "../../i18n";

function displayNombre(j) {
  return getNombre(j) || j?.nombreCompleto || j?.nombre || t("common.player");
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
        displayNombre(a).localeCompare(displayNombre(b), DATE_LOCALE)
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
      setMsg(t("padrinos.selectBoth"));
      return;
    }
    setMsg("");
    setGuardando(true);
    const res = await asignarPadrino(ahijadoSel, padrinoSel);
    setGuardando(false);
    if (!res.ok) setMsg(res.error ?? t("padrinos.assignFailed"));
    else setMsg(t("padrinos.assignSuccess"));
  }

  async function handleQuitar() {
    if (!ahijadoSel) return;
    setMsg("");
    setGuardando(true);
    const res = await desasignarPadrino(ahijadoSel);
    setGuardando(false);
    if (!res.ok) setMsg(res.error ?? t("padrinos.removeFailed"));
    else {
      setPadrinoSel("");
      setMsg(t("padrinos.removeSuccess"));
    }
  }

  return (
    <div className="padrinos-page">
      {loading ? <p className="info-box">{t("padrinos.loadingPlayers")}</p> : null}
      {error ? <p className="error-box">{error}</p> : null}
      {msg ? <p className="info-box">{msg}</p> : null}

      <PadrinosCard title={t("padrinos.yourGodparent")}>
        {miPadrino ? (
          <p className="padrinos-nombre">{displayNombre(miPadrino)}</p>
        ) : (
          <p className="padrinos-muted">{t("padrinos.noGodparent")}</p>
        )}
      </PadrinosCard>

      <PadrinosCard title={t("padrinos.yourGodchildren")}>
        {misAhijados.length > 0 ? (
          <ul className="padrinos-lista">
            {misAhijados.map((a) => (
              <li key={a.id}>{displayNombre(a)}</li>
            ))}
          </ul>
        ) : (
          <p className="padrinos-muted">{t("padrinos.noGodchildren")}</p>
        )}
      </PadrinosCard>

      {isCoord ? (
        <>
          <div className="padrinos-section-label">{t("padrinos.manageAssignments")}</div>
          <div className="padrinos-gestion-form card">
            <label className="padrinos-field">
              <span className="padrinos-field__label">{t("padrinos.selectGodchild")}</span>
              <select
                className="padrinos-select"
                value={ahijadoSel}
                disabled={guardando || loading}
                onChange={(ev) => setAhijadoSel(ev.target.value)}
              >
                <option value="">{t("common.choosePlayer")}</option>
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
                  <span className="padrinos-field__label">{t("padrinos.selectGodparent")}</span>
                  <select
                    className="padrinos-select"
                    value={padrinoSel}
                    disabled={guardando}
                    onChange={(ev) => setPadrinoSel(ev.target.value)}
                  >
                    <option value="">{t("common.chooseGodparent")}</option>
                    {candidatos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {displayNombre(c)}
                      </option>
                    ))}
                  </select>
                </label>

                {ahijado?.padrinoId ? (
                  <p className="padrinos-muted padrinos-gestion-actual">
                    {t("common.current", { name: ahijado.padrinoNombre ?? t("common.assigned") })}
                  </p>
                ) : null}

                <div className="padrinos-gestion-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    disabled={guardando || !padrinoSel}
                    onClick={() => void handleAsignar()}
                  >
                    {t("padrinos.assign")}
                  </button>
                  {ahijado?.padrinoId ? (
                    <button
                      type="button"
                      className="btn btn-block"
                      disabled={guardando}
                      onClick={() => void handleQuitar()}
                    >
                      {t("padrinos.removeGodparent")}
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
