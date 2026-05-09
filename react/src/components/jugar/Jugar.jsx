import { useEffect, useMemo, useState } from "react";
import DetalleSlot from "./DetalleSlot";
import { sameDiaSemanaSlot } from "../../utils/slots";

/** Recibe `slots` desde App (hook useSlots); no importa useSlots aquí. */
export default function Jugar({ slots, currentUser, onApuntar, onBaja, backendNotice, message }) {
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id ?? "");
  const [showLista, setShowLista] = useState(false);

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
      slots.find((s) => s.id !== selectedSlot.id && sameDiaSemanaSlot(s, selectedSlot) && s.apuntado) ?? null
    );
  }, [slots, selectedSlot]);

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
          {slots.map((slot) => {
            const rival = slots.find(
              (s) => s.id !== slot.id && sameDiaSemanaSlot(s, slot) && s.apuntado
            );
            const dot = slot.apuntado
              ? "✓ Apuntado"
              : rival
                ? `Apuntado en ${rival.club}`
                : slot.abierto
                  ? `${slot.jugadores.length} apuntados`
                  : "Cerrada 🔒";
            const dotColor = slot.apuntado ? "#27500A" : rival ? "#BA7517" : slot.abierto ? "var(--navy)" : "var(--text3)";
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
                    {slot.label} <span style={{ fontWeight: 400, color: "var(--text2)" }}>— {slot.club}</span>
                  </div>
                  <div className="radio-option-sub" style={{ color: dotColor }}>
                    {dot}
                  </div>
                </div>
                {!slot.abierto ? <span>🔒</span> : slot.apuntado ? <span>✅</span> : null}
              </label>
            );
          })}
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
