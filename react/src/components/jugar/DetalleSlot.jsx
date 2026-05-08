function dayOpenLabel(slot) {
  const ds = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const dow = slot?.diaSemana ?? 0;
  const prev = (dow - 1 + 7) % 7;
  return `Abre el ${ds[prev]} a las 19:00`;
}

export default function DetalleSlot({
  slot,
  enrolled,
  rivalSlot,
  warning,
  onBack,
  onApuntar,
  onBaja
}) {
  if (!slot) return null;

  const maxTit = (slot.pistas ?? 0) * 4;
  const titulares = slot.jugadores.slice(0, maxTit);
  const reserva = slot.jugadores.slice(maxTit);
  const badge = enrolled ? "Apuntado" : slot.abierto ? "Abierta" : "Cerrada";

  return (
    <article className="card">
      <button className="back-lnk" onClick={onBack}>
        ← Volver
      </button>

      <div className="slot-head">
        <div>
          <div className="radio-option-title">
            {slot.label} — {slot.club}
          </div>
          <div className="slot-meta">{slot.abierto ? "Lista abierta" : dayOpenLabel(slot)}</div>
        </div>
        <span className={`badge ${enrolled ? "badge-enrolled" : slot.abierto ? "badge-open" : "badge-closed"}`}>
          {badge}
        </span>
      </div>

      <div className="slot-meta mt-8">
        {slot.pistas === 0 ? "Lista abierta · partidos por confirmar" : `${slot.pistas} pistas · ${maxTit} titulares máx.`}
      </div>

      {!enrolled && slot.abierto && rivalSlot ? (
        <div className="baja-locked">
          Ya estás apuntado en <strong>{rivalSlot.label} — {rivalSlot.club}</strong>. Date de baja primero y luego
          apúntate aquí.
        </div>
      ) : null}

      {!enrolled && slot.abierto && !rivalSlot ? (
        <div className="enroll-box">
          <div className="checkbox-row">
            <input type="checkbox" id="sc-slot" />
            <label htmlFor="sc-slot">Soy socio del Club Cornellà Up</label>
          </div>
          <div className="checkbox-sub">Márcalo si eres socio del Up</div>
          <button className="btn btn-primary btn-sm btn-block" onClick={() => onApuntar(slot.id)}>
            Confirmar inscripción
          </button>
        </div>
      ) : null}

      {enrolled ? (
        <>
          {warning ? (
            <div className="baja-locked">
              ⚠️ Si te das de baja hoy, por favor busca un@sustitut@ para el partido antes de confirmar la baja.
            </div>
          ) : null}
          <button className="btn btn-danger btn-sm btn-block mt-8" onClick={() => onBaja(slot.id)}>
            Darme de baja
          </button>
        </>
      ) : null}

      <div className="players-list">
        <div className="players-label">
          <span>Apuntados ({slot.jugadores.length})</span>
          <span>{slot.sociosCount ?? 0} socios Up</span>
        </div>

        {slot.jugadores.length === 0 ? <div className="slot-meta">Nadie apuntado todavía</div> : null}

        {titulares.map((n, idx) => (
          <div className="player-row" key={`t-${slot.id}-${n}-${idx}`}>
            <span className="ppos">{idx + 1}</span>
            <span className="pname">{n}</span>
          </div>
        ))}

        {reserva.length ? <div className="reserva-sep">Reserva ({reserva.length})</div> : null}
        {reserva.map((n, idx) => (
          <div className="player-row" key={`r-${slot.id}-${n}-${idx}`}>
            <span className="ppos">R{idx + 1}</span>
            <span className="pname">{n}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
