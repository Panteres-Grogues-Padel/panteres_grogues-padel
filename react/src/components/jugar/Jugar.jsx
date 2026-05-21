import { useEffect, useMemo, useState } from "react";
import DetalleSlot from "./DetalleSlot";
import { getDiaSemanaActual, sameDiaSemanaSlot } from "../../utils/slots";
import { monthShortName } from "../../utils/dates";
import { t } from "../../i18n";
import { slotDayLabel } from "../../utils/dates";

function slotFechaLabel(slot) {
  if (!slot.semanaObjetivo || slot.diaSemana === undefined) return "";
  const lun = new Date(slot.semanaObjetivo + "T00:00:00Z");
  lun.setUTCDate(lun.getUTCDate() + slot.diaSemana);
  return `${lun.getUTCDate()} ${monthShortName(lun.getUTCMonth())}`;
}

function weekRangeLabel(lunesDate) {
  if (!lunesDate) return "";
  const lun = new Date(lunesDate + "T00:00:00Z");
  const dom = new Date(lun);
  dom.setUTCDate(dom.getUTCDate() + 6);
  const lD = lun.getUTCDate(), dD = dom.getUTCDate();
  const lM = monthShortName(lun.getUTCMonth()), dM = monthShortName(dom.getUTCMonth());
  return lM === dM ? `${lD}–${dD} ${lM}` : `${lD} ${lM}–${dD} ${dM}`;
}

export default function Jugar({ slots, currentUser, onApuntar, onBaja, backendNotice, message }) {
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id ?? "");
  const [showLista, setShowLista] = useState(false);

  const diaActual = getDiaSemanaActual(new Date());

  const slotsActual = useMemo(
    () =>
      slots.filter(
        (s) => s.semana === "actual" && Number(s.diaSemana) >= diaActual
      ),
    [slots, diaActual]
  );
  const slotsProxima = useMemo(() => {
    return slots.filter((s) => s.semana === "proxima" && s.diaSemana <= diaActual + 1);
  }, [slots, diaActual]);

  const slotsVisibles = useMemo(
    () => [...slotsActual, ...slotsProxima],
    [slotsActual, slotsProxima]
  );
  const lunesActual = slotsActual[0]?.semanaObjetivo ?? "";
  const lunesProximo = slotsProxima[0]?.semanaObjetivo ?? "";

  useEffect(() => {
    if (!slotsVisibles.length) {
      setSelectedSlotId("");
      setShowLista(false);
      return;
    }
    if (!slotsVisibles.some((s) => s.id === selectedSlotId)) {
      setSelectedSlotId(slotsVisibles[0].id);
      setShowLista(false);
    }
  }, [slotsVisibles, selectedSlotId]);

  const selectedSlot = useMemo(
    () => slotsVisibles.find((s) => s.id === selectedSlotId) ?? slotsVisibles[0],
    [slotsVisibles, selectedSlotId]
  );
  const selectedEnrolled = Boolean(selectedSlot?.apuntado);
  const rivalSlot = useMemo(() => {
    if (!selectedSlot) return null;
    return (
      slotsVisibles.find(
        (s) =>
          s.id !== selectedSlot.id &&
          sameDiaSemanaSlot(s, selectedSlot) &&
          s.semanaObjetivo === selectedSlot.semanaObjetivo &&
          s.apuntado
      ) ?? null
    );
  }, [slotsVisibles, selectedSlot]);

  function renderSlotRow(slot) {
    const rival = slotsVisibles.find(
      (s) =>
        s.id !== slot.id &&
        sameDiaSemanaSlot(s, slot) &&
        s.semanaObjetivo === slot.semanaObjetivo &&
        s.apuntado
    );
    const dot = slot.apuntado
      ? t("jugar.enrolled")
      : rival
        ? t("jugar.enrolledAtClub", { club: rival.club })
        : slot.abierto
          ? t("jugar.enrolledCount", { count: slot.jugadores.length })
          : t("jugar.closed");
    const dotColor = slot.apuntado
      ? "#27500A"
      : rival
        ? "#BA7517"
        : slot.abierto
          ? "var(--navy)"
          : "var(--text3)";
    const fecha = slotFechaLabel(slot);
    return (
      <label
        className={`radio-option ${selectedSlotId === slot.id ? "selected" : ""}`}
        key={slot.id}
        onClick={() => setSelectedSlotId(slot.id)}
      >
        <input
          type="radio"
          name="slot"
          checked={selectedSlotId === slot.id}
          onChange={() => setSelectedSlotId(slot.id)}
        />
        <div style={{ flex: 1 }}>
          <div className="radio-option-title">
            {slotDayLabel(slot)}{fecha ? ` ${fecha}` : ""}{" "}
            <span style={{ fontWeight: 400, color: "var(--text2)" }}>— {slot.club}</span>
          </div>
          <div className="radio-option-sub" style={{ color: dotColor }}>
            {dot}
          </div>
        </div>
        {!slot.abierto ? <span>🔒</span> : slot.apuntado ? <span>✅</span> : null}
      </label>
    );
  }

  return (
    <div>
      <h2 className="section-title">{t("jugar.title")}</h2>
      {!slotsVisibles.length ? (
        <div className="card">
          <div className="slot-meta" style={{ textAlign: "center", padding: "1rem 0" }}>
            {t("jugar.noSlots")}
          </div>
        </div>
      ) : null}
      {backendNotice ? <p className="error-box">{backendNotice}</p> : null}
      {!showLista ? (
        <div className="card" style={{ display: slotsVisibles.length ? "block" : "none" }}>
          {slotsActual.length > 0 && (
            <>
              <div className="slot-week-header">{t("jugar.currentWeek", { range: weekRangeLabel(lunesActual) })}</div>
              {slotsActual.map(renderSlotRow)}
            </>
          )}
          {slotsProxima.length > 0 && (
            <>
              <div className="slot-week-header" style={{ marginTop: slotsActual.length ? "1rem" : 0 }}>
                {t("jugar.nextWeek", { range: weekRangeLabel(lunesProximo) })}
              </div>
              {slotsProxima.map(renderSlotRow)}
            </>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block mt-8"
            onClick={() => setShowLista(true)}
            disabled={!selectedSlot}
          >
            {selectedEnrolled ? t("jugar.viewList") : t("jugar.signUp")}
          </button>
        </div>
      ) : (
        <DetalleSlot
          slot={selectedSlot}
          currentUser={currentUser}
          enrolled={selectedEnrolled}
          rivalSlot={rivalSlot}
          warning={Boolean(selectedEnrolled && selectedSlot?.bajaWarning)}
          onBack={() => setShowLista(false)}
          onApuntar={onApuntar}
          onBaja={onBaja}
        />
      )}
      {message ? <p className="info-box">{message}</p> : null}
    </div>
  );
}
