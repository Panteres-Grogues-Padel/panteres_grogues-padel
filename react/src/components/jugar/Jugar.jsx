import { useMemo, useState } from "react";

export default function Jugar({ slots, onApuntar, onBaja, message }) {
  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id ?? "");
  const [showLista, setShowLista] = useState(false);

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) ?? slots[0],
    [slots, selectedSlotId]
  );
  const selectedEnrolled = Boolean(selectedSlot?.apuntado);

  return (
    <div>
      <h2 className="section-title">Jugar</h2>
      <div className="card">
        {slots.map((slot) => {
          const dot = slot.apuntado
            ? "✓ Apuntado"
            : slot.abierto
              ? `${slot.jugadores.length} apuntados`
              : "Cerrada 🔒";
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
                <div className="radio-option-sub">{dot}</div>
              </div>
              {!slot.abierto ? <span>🔒</span> : slot.apuntado ? <span>✅</span> : null}
            </label>
          );
        })}
        <button className="btn btn-primary btn-block mt-8" onClick={() => setShowLista(true)}>
          {selectedEnrolled ? "Ver lista" : "Apuntarme"}
        </button>
      </div>

      {showLista && selectedSlot ? (
        <article className="card mt-8">
          <button className="btn btn-sm" onClick={() => setShowLista(false)}>
            ← Volver
          </button>
          <div className="mt-8">
            <strong>
              {selectedSlot.label} — {selectedSlot.club}
            </strong>
            <p className="slot-meta">
              {selectedSlot.abierto ? "Abierta" : "Cerrada"} · {selectedSlot.pistas} pistas
            </p>
          </div>
          {!selectedSlot.apuntado && selectedSlot.abierto ? (
            <button className="btn btn-primary btn-block mt-8" onClick={() => onApuntar(selectedSlot.id)}>
              Confirmar inscripción
            </button>
          ) : null}
          {selectedSlot.apuntado ? (
            <button className="btn btn-danger btn-block mt-8" onClick={() => onBaja(selectedSlot.id)}>
              Darme de baja
            </button>
          ) : null}
          <div className="players-list">
            <div className="players-label">
              <span>Apuntados ({selectedSlot.jugadores.length})</span>
            </div>
            {selectedSlot.jugadores.length ? (
              selectedSlot.jugadores.map((n, idx) => (
                <div className="player-row" key={`${selectedSlot.id}-${n}-${idx}`}>
                  <span className="ppos">{idx + 1}</span>
                  <span className="pname">{n}</span>
                </div>
              ))
            ) : (
              <div className="slot-meta mt-8">Nadie apuntado todavía</div>
            )}
          </div>
        </article>
      ) : null}
      {message ? <p className="info-box">{message}</p> : null}
    </div>
  );
}
