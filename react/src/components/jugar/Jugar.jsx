import { useEffect, useMemo, useState } from "react";
import DetalleSlot from "./DetalleSlot";

export default function Jugar({ slots, onApuntar, onBaja, message }) {
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
      slots.find((s) => s.id !== selectedSlot.id && s.diaSemana === selectedSlot.diaSemana && s.apuntado) ?? null
    );
  }, [slots, selectedSlot]);

  return (
    <div>
      <h2 className="section-title">Jugar</h2>
      {!showLista ? (
        <div className="card">
          {slots.map((slot) => {
            const rival = slots.find(
              (s) => s.id !== slot.id && s.diaSemana === slot.diaSemana && s.apuntado
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
          <button className="btn btn-primary btn-block mt-8" onClick={() => setShowLista(true)}>
            {selectedEnrolled ? "Ver lista" : "Apuntarme"}
          </button>
        </div>
      ) : (
        <DetalleSlot
          slot={selectedSlot}
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
