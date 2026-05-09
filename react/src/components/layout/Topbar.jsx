/** Igual que en index.html (`nombreCorto`): "Jose García Blanco" → "Jose G. B." */
function nombreCorto(nombreCompleto) {
  const parts = (nombreCompleto ?? "").trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const nombre = parts[0];
  const aps = [parts[1], parts[2]]
    .filter(Boolean)
    .map((a) => a[0].toUpperCase())
    .join("");
  return nombre + (aps ? ` ${aps}` : "");
}

export default function Topbar({ currentUser, setActiveTab, onLogout }) {
  const irBienvenida = () => setActiveTab("bienvenida");

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-logo" onClick={irBienvenida} aria-label="Volver a la bienvenida">
          <img src="/icons/landing-logo.png" alt="" width={28} height={28} />
        </button>
        <div>
          <button type="button" className="app-name topbar-brand-btn" onClick={irBienvenida}>
            Panteres Grogues
          </button>
          <div className="topbar-name-sub">{nombreCorto(currentUser?.nombreCompleto)}</div>
        </div>
      </div>
      <div className="row-gap">
        <button
          type="button"
          className="logout-btn"
          onClick={(e) => {
            e.preventDefault();
            onLogout();
          }}
        >
          Salir
        </button>
      </div>
    </header>
  );
}
