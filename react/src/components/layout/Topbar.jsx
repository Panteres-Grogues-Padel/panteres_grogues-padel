import { t } from "../../i18n";

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

function IconBell() {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function Topbar({ currentUser, setActiveTab, onLogout, noLeidas = 0, onOpenNotificaciones }) {
  const irBienvenida = () => setActiveTab("bienvenida");
  const badgeLabel = noLeidas > 99 ? "99+" : String(noLeidas);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="topbar-logo" onClick={irBienvenida} aria-label={t("topbar.backToWelcome")}>
          <img src="/icons/landing-logo.png" alt="" width={28} height={28} />
        </button>
        <div>
          <button type="button" className="app-name topbar-brand-btn" onClick={irBienvenida}>
            Panteres Grogues
          </button>
          <div className="topbar-name-sub">{nombreCorto(currentUser?.nombreCompleto)}</div>
        </div>
      </div>
      <div className="row-gap topbar-actions">
        <button
          type="button"
          className="notif-btn"
          onClick={onOpenNotificaciones}
          aria-label={
            noLeidas ? t("topbar.notificationsUnread", { count: noLeidas }) : t("topbar.notifications")
          }
        >
          <IconBell />
          {noLeidas > 0 ? (
            <span className="notif-badge" aria-hidden>
              {badgeLabel}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          className="logout-btn"
          onClick={(e) => {
            e.preventDefault();
            onLogout();
          }}
        >
          {t("nav.logout")}
        </button>
      </div>
    </header>
  );
}
