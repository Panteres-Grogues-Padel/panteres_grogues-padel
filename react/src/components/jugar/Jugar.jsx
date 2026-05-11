import { useEffect, useMemo, useState } from "react";
import DetalleSlot from "./DetalleSlot";
import { getDiaSemanaActual, sameDiaSemanaSlot } from "../../utils/slots";

const MESES = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function slotFechaLabel(slot) {
  if (!slot.semanaObjetivo || slot.diaSemana === undefined) return "";
  const lun = new Date(slot.semanaObjetivo + "T00:00:00Z");
  lun.setUTCDate(lun.getUTCDate() + slot.diaSemana);
  return `${lun.getUTCDate()} ${MESES[lun.getUTCMonth()]}`;
}

function weekRangeLabel(lunesDate) {
  if (!lunesDate) return "";
  const lun = new Date(lunesDate + "T00:00:00Z");
  const dom = new Date(lun);
  dom.setUTCDate(dom.getUTCDate() + 6);
  const lD = lun.getUTCDate(), dD = dom.getUTCDate();
  const lM = MESES[lun.getUTCMonth()], dM = MESES[dom.getUTCMonth()];
  return lM === dM ? `${lD}–${dD} ${lM}` : `${lD} ${lM}–${dD} ${dM}`;
}

export default function Jugar({ slots, currentUser, onApuntar, onBaja, backendNotice, message }) {
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id ?? "");
  const [showLista, setShowLista] = useState(false);

  const slotsActual = useMemo(() => slots.filter((s) => s.semana === "actual"), [slots]);
  const slotsProxima = useMemo(() => {
    const diaActual = getDiaSemanaActual(new Date());
    return slots.filter((s) => s.semana === "proxima" && s.diaSemana <= diaActual + 1);
  }, [slots]);
  const lunesActual = slotsActual[0]?.semanaObjetivo ?? "";
  const lunesProximo = slotsProxima[0]?.semanaObjetivo ?? "";

  useEffect(() => {
    if (!slots.length) {
      setSelectedSlotId("");
      setShowLista(false);
      return;
    }
    if (!slots.some((s) => s.id === selectedSlotId)) {
      setSelectedSlotId(slots[0].id);
      setShowLista(false);
    }
  }, [slots, selectedSlotId]);

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) ?? slots[0],
    [slots, selectedSlotId]
  );
  const selectedEnrolled = Boolean(selectedSlot?.apuntado);
  const rivalSlot = useMemo(() => {
    if (!selectedSlot) return null;
    return (
      slots.find(
        (s) =>
          s.id !== selectedSlot.id &&
          sameDiaSemanaSlot(s, selectedSlot) &&
          s.semanaObjetivo === selectedSlot.semanaObjetivo &&
          s.apuntado
      ) ?? null
    );
  }, [slots, selectedSlot]);

  function renderSlotRow(slot) {
    const rival = slots.find(
      (s) =>
        s.id !== slot.id &&
        sameDiaSemanaSlot(s, slot) &&
        s.semanaObjetivo === slot.semanaObjetivo &&
        s.apuntado
    );
    const dot = slot.apuntado
      ? "✓ Apuntado"
      : rival
        ? `Apuntado en ${rival.club}`
        : slot.abierto
          ? `${slot.jugadores.length} apuntados`
          : "Cerrada 🔒";
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
            {slot.label}{fecha ? ` ${fecha}` : ""}{" "}
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
      <h2 className="section-title">Jugar</h2>
      {!slots.length ? (
        <div className="card">
          <div className="slot-meta" style={{ textAlign: "center", padding: "1rem 0" }}>
            No hay slots disponibles.
          </div>
        </div>
      ) : null}
      {backendNotice ? <p className="error-box">{backendNotice}</p> : null}
      {!showLista ? (
        <div className="card" style={{ display: slots.length ? "block" : "none" }}>
          {slotsActual.length > 0 && (
            <>
              <div className="slot-week-header">Semana actual · {weekRangeLabel(lunesActual)}</div>
              {slotsActual.map(renderSlotRow)}
            </>
          )}
          {slotsProxima.length > 0 && (
            <>
              <div className="slot-week-header" style={{ marginTop: slotsActual.length ? "1rem" : 0 }}>
                Semana próxima · {weekRangeLabel(lunesProximo)}
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
            {selectedEnrolled ? "Ver lista" : "Apuntarme"}
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
