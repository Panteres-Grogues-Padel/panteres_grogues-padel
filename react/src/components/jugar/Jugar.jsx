export default function Jugar({ slots, onApuntar, onBaja, message }) {
  return (
    <div>
      <h2 className="section-title">Jugar</h2>
      {slots.map((slot) => (
        <article className="card" key={slot.id}>
          <div className="slot-head">
            <strong>
              {slot.label} · {slot.club}
            </strong>
            <span className={`badge ${slot.abierto ? "badge-open" : "badge-closed"}`}>
              {slot.abierto ? "Abierto" : "Cerrado"}
            </span>
          </div>
          <p className="slot-meta">
            {slot.jugadores.length} jugadores · {slot.pistas} pistas
          </p>
          <div className="slot-actions">
            {!slot.apuntado ? (
              <button className="btn btn-primary" onClick={() => onApuntar(slot.id)}>
                Apuntarme
              </button>
            ) : (
              <button className="btn btn-danger" onClick={() => onBaja(slot.id)}>
                Darme de baja
              </button>
            )}
          </div>
        </article>
      ))}
      {message ? <p className="info-box">{message}</p> : null}
    </div>
  );
}
