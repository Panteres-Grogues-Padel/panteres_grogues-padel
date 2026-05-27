import { useCurrentJugador } from "../../context/CurrentJugadorContext";
import { getNombre } from "../../utils/nombres";
import { t } from "../../i18n";

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

export default function Topbar({ setActiveTab, onLogout, noLeidas = 0, onOpenNotificaciones }) {
  const { jugador: currentUser } = useCurrentJugador();
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
            Pàdel PG
          </button>
          <div className="topbar-name-sub">{getNombre(currentUser)}</div>
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
