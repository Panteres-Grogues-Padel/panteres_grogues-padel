import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getDiasDisponiblesResultados, hoyLocalStr } from "../../utils/dates";
import { descargarResultadosHistoricoExcel } from "../../utils/descargarResultadosExcel";
import {
  getEstadoLabel,
  getPermisosResultado,
  getRotacionesAmericano
} from "../../utils/resultadosUtils";
import ResultadosCalendario from "./ResultadosCalendario";
import { getNombreVisible } from "../../utils/nombres";
import { t } from "../../i18n";

const DIES = {
  Lunes: "Dilluns",
  Martes: "Dimarts",
  Miércoles: "Dimecres",
  Jueves: "Dijous",
  Viernes: "Divendres",
  Sábado: "Dissabte",
  Domingo: "Diumenge"
};

function diaSlotCa(label) {
  if (!label) return "";
  return DIES[String(label).trim()] ?? label;
}

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
  onRequestGuardar,
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
            {diaSlotCa(partido.slotLabel)} · {partido.club}
          </strong>
          <p className="slot-meta">
            {t("common.courtNumber", { num: partido.numeroPista })}
            {partido.hora ? ` · ${partido.hora}` : ""}
            {partido.indoor ? ` · ${t("common.indoor")}` : ""}
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
              <span className="res-pos">{j.posicion}º</span> {getNombreVisible(j) || t("common.player")}
            </span>
          ))}
      </div>

      {permisos.puedeEditar ? (
        <div className="res-sets-edit">
          {rotaciones.map((rot, idx) => (
            <div key={idx} className="score-card">
              <div className="score-card-title">{t("common.setNumber", { num: idx + 1 })}</div>
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
          <button
            type="button"
            className="btn btn-primary btn-sm btn-block"
            onClick={() => onRequestGuardar(partido.id, sets)}
          >
            {resultado ? t("resultados.saveChanges") : t("resultados.saveResult")}
          </button>
        </div>
      ) : (
        <div className="res-sets-view">
          {resultado ? (
            rotaciones.map((rot, idx) => {
              const s = sets[idx];
              const [izq, der] = rot.label.split(" vs ");
              return (
                <div key={idx} className="rot-row">
                  <span className="rot-lbl">{t("common.setNumber", { num: idx + 1 })}</span>
                  <span className="rot-side">{izq}</span>
                  <span className="rot-score">
                    {s.p1} – {s.p2}
                  </span>
                  <span className="rot-side rot-side-r">{der}</span>
                </div>
              );
            })
          ) : (
            <p className="slot-meta res-sin-resultado">{t("resultados.noResultYet")}</p>
          )}
        </div>
      )}

      {permisos.puedeModificar ? (
        <button type="button" className="btn btn-sm btn-block res-modificar-btn" onClick={() => onModificar(partido.id)}>
          {t("resultados.modifyResult")}
        </button>
      ) : null}
    </article>
  );
}

export default function Resultados({
  partidos,
  onGuardar,
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
  const [confirmGuardar, setConfirmGuardar] = useState(null);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [descargandoHistorico, setDescargandoHistorico] = useState(false);
  const [descargandoDia, setDescargandoDia] = useState(false);

  const puedeDescarregarHistorico = isCoord || esSuperAdmin;

  useEffect(() => {
    if (!supabase) {
      setEsSuperAdmin(false);
      return undefined;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.rpc("es_super_admin");
      if (!cancelled) setEsSuperAdmin(data === true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDescarregarHistorico() {
    if (!supabase || !puedeDescarregarHistorico || descargandoHistorico) return;
    setDescargandoHistorico(true);
    try {
      const { data, error } = await supabase.rpc("get_resultados_historico", { p_fecha: null });
      if (error) return;
      descargarResultadosHistoricoExcel(data, `resultats_panteres_${hoyLocalStr()}.xlsx`);
    } finally {
      setDescargandoHistorico(false);
    }
  }

  async function handleDescarregarDia() {
    if (!supabase || !puedeDescarregarHistorico || descargandoDia || !fechaSel) return;
    setDescargandoDia(true);
    try {
      const { data, error } = await supabase.rpc("get_resultados_historico", { p_fecha: fechaSel });
      if (error) return;
      descargarResultadosHistoricoExcel(data, `resultats_panteres_${fechaSel}.xlsx`);
    } finally {
      setDescargandoDia(false);
    }
  }

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

  async function handleGuardar(partidoId, sets) {
    const partido = partidos.find((p) => p.id === partidoId);
    const res = await onGuardar(partidoId, partido?.fechaPartido ?? fechaSel, sets);
    if (res?.ok) {
      setSetsDraft((prev) => {
        const next = { ...prev };
        delete next[partidoId];
        return next;
      });
    }
    return res;
  }

  function requestGuardar(partidoId, sets) {
    setConfirmGuardar({ partidoId, sets });
  }

  async function confirmGuardarResultado() {
    if (!confirmGuardar) return;
    const { partidoId, sets } = confirmGuardar;
    setConfirmGuardar(null);
    await handleGuardar(partidoId, sets);
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
      <h2 className="section-title">{t("resultados.title")}</h2>

      {isCoord ? (
        <p className="slot-meta res-ventana-hint">{t("resultados.coordHint")}</p>
      ) : (
        <p className="slot-meta res-ventana-hint">{t("resultados.playerHint")}</p>
      )}

      {puedeDescarregarHistorico ? (
        <button
          type="button"
          className="btn btn-sm btn-block"
          style={{ marginBottom: "0.75rem" }}
          disabled={descargandoHistorico}
          onClick={() => void handleDescarregarHistorico()}
        >
          {descargandoHistorico ? t("common.loading") : "Descarregar resultats"}
        </button>
      ) : null}

      <div id="resultados-days">
        {diasDisponibles.length ? (
          <ResultadosCalendario
            fechasConPartidos={diasDisponibles}
            fechaSel={fechaSel}
            onSelectFecha={setFechaSel}
          />
        ) : (
          <p className="slot-meta">{t("resultados.noMatchesWindow")}</p>
        )}
      </div>

      {!diasDisponibles.length ? (
        <div className="card">
          <div className="empty-state">{t("resultados.noMatchesGenerate")}</div>
        </div>
      ) : !partidosDia.length ? (
        <div className="card">
          <div className="empty-state">{t("resultados.noMatchesDay")}</div>
        </div>
      ) : (
        <>
          {puedeDescarregarHistorico ? (
            <button
              type="button"
              className="btn btn-sm btn-block"
              style={{ marginBottom: "0.75rem" }}
              disabled={descargandoDia}
              onClick={() => void handleDescarregarDia()}
            >
              {descargandoDia ? t("common.loading") : "Descarregar dia"}
            </button>
          ) : null}
          {partidosDia.map((p) => {
          const resultado = getResultado?.(p.id, p.fechaPartido);
          return (
            <PartidoResultadoCard
              key={p.id}
              partido={p}
              resultado={resultado}
              setsDraft={setsDraft[p.id]}
              onUpdateSet={updateSet}
              onRequestGuardar={requestGuardar}
              onModificar={handleModificar}
              currentUser={currentUser}
              isCoord={isCoord}
              mapSetsFromResultado={mapSetsFromResultado}
            />
          );
        })}
        </>
      )}

      {confirmGuardar ? (
        <div className="overlay open" onClick={() => setConfirmGuardar(null)}>
          <div className="overlay-sheet open" onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: "14px", color: "var(--text)", marginBottom: "1rem", lineHeight: 1.5 }}>
              Confirmes el resultat? Un cop confirmat s&apos;actualitzarà el rànquing automàticament.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => void confirmGuardarResultado()}>
                Confirmar
              </button>
              <button type="button" className="btn btn-sm" style={{ flex: 1 }} onClick={() => setConfirmGuardar(null)}>
                Cancel·lar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
