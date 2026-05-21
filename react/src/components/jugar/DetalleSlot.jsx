import { useEffect, useRef, useState } from "react";
import { isJugadorUuid, jugadoresCoinciden } from "../../utils/jugador";
import { avatarClassFromNombre, initialsFromNombre } from "../../utils/avatar";
import { getNombre } from "../../utils/nombres";
import { monthShortName, weekdayName } from "../../utils/dates";
import { t, pluralSuffix } from "../../i18n";

function dayOpenLabel(slot) {
  if (!slot) return "";
  if (slot.semana === "actual") return t("jugar.detalle.openCurrentWeek");
  if (slot.abierto) return t("jugar.detalle.openNextWeek");
  const dow = slot.diaSemana;
  if (dow !== undefined && slot.semanaObjetivo) {
    const targetLun = new Date(slot.semanaObjetivo + "T00:00:00Z");
    const openDate = new Date(targetLun);
    openDate.setUTCDate(openDate.getUTCDate() - 7 + dow);
    return t("jugar.detalle.closedOpens", {
      day: weekdayName(dow),
      date: openDate.getUTCDate(),
      month: monthShortName(openDate.getUTCMonth())
    });
  }
  return t("jugar.detalle.closed");
}

function filaEsUsuarioActual(p, currentUser) {
  if (!currentUser) return false;
  if (isJugadorUuid(p.jugadorId) && isJugadorUuid(currentUser.id)) {
    return jugadoresCoinciden(p.jugadorId, currentUser.id);
  }
  if (p.jugadorId) return false;
  return currentUser.nombre === p.nombre;
}

export default function DetalleSlot({
  slot,
  currentUser,
  enrolled,
  rivalSlot,
  warning,
  onBack,
  onApuntar,
  onBaja
}) {
  const [procesando, setProcesando] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    setProcesando(false);
    inFlightRef.current = false;
  }, [slot?.id]);

  if (!slot) return null;

  const sorted = [...(slot.jugadores ?? [])].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  const esDom = slot.id === "dom";
  const esSinPistas = (slot.pistas ?? 0) === 0 && !esDom;
  const maxTit = Math.max(0, Number(slot.pistas ?? 0) * 4);
  const titulares = maxTit > 0 ? sorted.slice(0, maxTit) : [];
  const reserva = maxTit > 0 ? sorted.slice(maxTit) : sorted;
  const badge = enrolled
    ? t("jugar.detalle.enrolled")
    : slot.abierto
      ? t("jugar.detalle.open")
      : t("jugar.detalle.closed");
  const sociosCount = sorted.filter((p) => p.socio).length;

  const labelPistas = esDom
    ? t("jugar.detalle.locationAmericana")
    : esSinPistas
      ? t("jugar.detalle.listOpenConfirm")
      : t("jugar.detalle.courtsTitulars", {
          count: slot.pistas,
          plural: pluralSuffix(slot.pistas),
          max: maxTit
        });

  return (
    <article className="card">
      <button type="button" className="btn btn-sm" style={{ marginBottom: "1rem" }} onClick={onBack}>
        {t("jugar.detalle.back")}
      </button>

      <div className="slot-head">
        <div>
          <div className="radio-option-title">
            {slot.label} — {slot.club}
          </div>
          <div className="slot-meta">{dayOpenLabel(slot)}</div>
        </div>
        <span className={`badge ${enrolled ? "badge-enrolled" : slot.abierto ? "badge-open" : "badge-closed"}`}>
          {badge}
        </span>
      </div>

      <div className="slot-meta slot-info">{labelPistas}</div>

      {!enrolled && slot.abierto && rivalSlot ? (
        <div className="baja-locked">
          {t("jugar.detalle.alreadyEnrolledElsewhere", {
            label: rivalSlot.label,
            club: rivalSlot.club
          })}
        </div>
      ) : null}

      {!enrolled && slot.abierto && !rivalSlot ? (
        <div className="enroll-box">
          <div className="checkbox-row">
            <input type="checkbox" id="sc-slot" />
            <label htmlFor="sc-slot">{t("jugar.detalle.memberCheckbox")}</label>
          </div>
          <div className="checkbox-sub">{t("jugar.detalle.memberHint")}</div>
          <button
            type="button"
            className="btn btn-primary btn-sm btn-block"
            disabled={procesando}
            onClick={async () => {
              if (inFlightRef.current) return;
              inFlightRef.current = true;
              setProcesando(true);
              try {
                const socio = Boolean(document.getElementById("sc-slot")?.checked);
                await Promise.resolve(onApuntar(slot.id, { socio }));
              } finally {
                inFlightRef.current = false;
                setProcesando(false);
              }
            }}
          >
            {procesando ? t("common.sending") : t("jugar.detalle.confirmEnrollment")}
          </button>
        </div>
      ) : null}

      {enrolled ? (
        <>
          {warning ? <div className="baja-locked">{t("jugar.detalle.bajaWarning")}</div> : null}
          <button
            type="button"
            className="btn btn-danger btn-sm btn-block mt-8"
            onClick={() => onBaja(slot.id)}
          >
            {t("jugar.detalle.unregister")}
          </button>
        </>
      ) : null}

      <div className="players-list">
        <div className="players-label">
          <span>{t("jugar.detalle.enrolledList", { count: sorted.length })}</span>
          <span>{t("jugar.detalle.membersUp", { count: slot.sociosCount ?? sociosCount })}</span>
        </div>

        {sorted.length === 0 ? (
          <div style={{ fontSize: "13px", color: "var(--text2)", textAlign: "center", padding: "1.5rem 0" }}>
            {t("jugar.detalle.nobodyYet")}
          </div>
        ) : esDom || esSinPistas ? (
          sorted.map((p, idx) => (
            <div className="player-row" key={`${slot.id}-all-${idx}-${p.nombre}`}>
              <span className="ppos">{idx + 1}</span>
              <div className={`avatar ${avatarClassFromNombre(getNombre(p))}`}>{initialsFromNombre(getNombre(p))}</div>
              <span className="pname">
                {getNombre(p)}
                {filaEsUsuarioActual(p, currentUser) ? " ✓" : ""}
              </span>
              {p.socio ? <span className="badge badge-socio">Up</span> : null}
              <span className="player-time">{p.tsStr || ""}</span>
            </div>
          ))
        ) : (
          <>
            {maxTit > 0 ? (
              <div className="players-label" style={{ marginTop: "4px" }}>
                <span>{t("jugar.detalle.titulars", { max: maxTit })}</span>
                <span>
                  {titulares.length} / {sorted.length}
                </span>
              </div>
            ) : null}
            {titulares.map((p, idx) => (
              <div className="player-row" key={`${slot.id}-t-${idx}-${p.nombre}`}>
                <span className="ppos">{idx + 1}</span>
                <div className={`avatar ${avatarClassFromNombre(getNombre(p))}`}>{initialsFromNombre(getNombre(p))}</div>
                <span className="pname">
                  {getNombre(p)}
                  {filaEsUsuarioActual(p, currentUser) ? " ✓" : ""}
                </span>
                {p.socio ? <span className="badge badge-socio">Up</span> : null}
                <span className="player-time">{p.tsStr || ""}</span>
              </div>
            ))}
            {reserva.length > 0 ? (
              <>
                <div className="reserva-sep">{t("jugar.detalle.reserve", { count: reserva.length })}</div>
                {reserva.map((p, idx) => (
                  <div className="player-row" key={`${slot.id}-r-${idx}-${p.nombre}`}>
                    <span className="ppos">R{idx + 1}</span>
                    <div className={`avatar ${avatarClassFromNombre(getNombre(p))}`}>{initialsFromNombre(getNombre(p))}</div>
                    <span className="pname">
                      {getNombre(p)}
                      {filaEsUsuarioActual(p, currentUser) ? " ✓" : ""}
                    </span>
                    {p.socio ? <span className="badge badge-socio">Up</span> : null}
                    <span className="player-time">{p.tsStr || ""}</span>
                  </div>
                ))}
              </>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
