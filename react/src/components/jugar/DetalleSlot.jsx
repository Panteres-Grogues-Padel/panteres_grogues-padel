function dayOpenLabel(slot) {
  const ds = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const dow = slot?.diaSemana;
  if (dow === undefined) return "Abierta";
  const ahora = new Date();
  const jsNow = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1;
  const diff = (dow - jsNow + 7) % 7;
  if (diff === 0) return "Abierta · semana actual";
  if (jsNow > dow) return "Abierta · semana siguiente";
  if (jsNow === dow && ahora.getHours() >= 19) return "Abierta desde las 19:00";
  if (jsNow === dow && ahora.getHours() < 19) return "Abre hoy a las 19:00";
  return `Abre el ${ds[dow]} a las 19:00`;
}

const AVATAR_CLASSES = ["av-teal", "av-purple", "av-coral", "av-blue", "av-amber", "av-pink", "av-green", "av-gray"];

function initials(nombre = "") {
  return nombre
    .split(/[\s_]/)
    .map((w) => w?.[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarClass(nombre = "") {
  return AVATAR_CLASSES[(nombre.charCodeAt(0) || 0) % AVATAR_CLASSES.length];
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
  if (!slot) return null;

  const sorted = [...(slot.jugadores ?? [])].sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
  const esDom = slot.id === "dom";
  const esSinPistas = (slot.pistas ?? 0) === 0 && !esDom;
  const maxTit = (slot.pistas ?? 0) * 4;
  const titulares = sorted.slice(0, maxTit);
  const reserva = sorted.slice(maxTit);
  const badge = enrolled ? "Apuntado" : slot.abierto ? "Abierta" : "Cerrada";
  const sociosCount = sorted.filter((p) => p.socio).length;

  const labelPistas = esDom
    ? "📍 Ubicación por WhatsApp · Americana"
    : esSinPistas
      ? "Lista abierta · partidos por confirmar"
      : `${slot.pistas} pista${slot.pistas !== 1 ? "s" : ""} · ${maxTit} titulares máx.`;

  return (
    <article className="card">
      <button className="btn btn-sm" style={{ marginBottom: "1rem" }} onClick={onBack}>
        ← Volver
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
          <button
            className="btn btn-primary btn-sm btn-block"
            onClick={() => {
              const socio = Boolean(document.getElementById("sc-slot")?.checked);
              onApuntar(slot.id, { socio });
            }}
          >
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
          <span>Apuntados ({sorted.length})</span>
          <span>{slot.sociosCount ?? sociosCount} socios Up</span>
        </div>

        {sorted.length === 0 ? (
          <div style={{ fontSize: "13px", color: "var(--text2)", textAlign: "center", padding: "1.5rem 0" }}>
            Nadie apuntado todavía
          </div>
        ) : null}

        {(esDom || esSinPistas ? sorted : titulares).map((p, idx) => (
          <div className="player-row" key={`t-${slot.id}-${p.nombre}-${idx}`}>
            <span className="ppos">{idx + 1}</span>
            <div className={`avatar ${avatarClass(p.nombre)}`}>{initials(p.nombre)}</div>
            <span className="pname">
              {p.nombre}
              {currentUser?.nombre === p.nombre ? " ✓" : ""}
            </span>
            {p.socio ? <span className="badge badge-socio">Up</span> : null}
            <span className="player-time">{p.tsStr || ""}</span>
          </div>
        ))}

        {!esDom && !esSinPistas && reserva.length ? <div className="reserva-sep">Reserva ({reserva.length})</div> : null}
        {!esDom &&
          !esSinPistas &&
          reserva.map((p, idx) => (
          <div className="player-row" key={`r-${slot.id}-${p.nombre}-${idx}`}>
            <span className="ppos">R{idx + 1}</span>
            <div className={`avatar ${avatarClass(p.nombre)}`}>{initials(p.nombre)}</div>
            <span className="pname">
              {p.nombre}
              {currentUser?.nombre === p.nombre ? " ✓" : ""}
            </span>
            {p.socio ? <span className="badge badge-socio">Up</span> : null}
            <span className="player-time">{p.tsStr || ""}</span>
          </div>
          ))}
      </div>
    </article>
  );
}
