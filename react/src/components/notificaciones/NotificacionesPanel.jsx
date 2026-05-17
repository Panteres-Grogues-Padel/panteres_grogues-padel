import {
  formatNotificacionTs,
  iconoNotificacionTipo,
  tabFromNotificacionTipo
} from "../../hooks/useNotificaciones";

export default function NotificacionesPanel({
  open,
  onClose,
  notificaciones,
  loading,
  error,
  onMarcarLeida,
  onMarcarTodasLeidas,
  onNavigate
}) {
  if (!open) return null;

  async function handleClick(notif) {
    if (!notif.leida) await onMarcarLeida(notif.id);
    const tab = tabFromNotificacionTipo(notif.tipo);
    onClose();
    if (tab) onNavigate(tab);
  }

  return (
    <div
      className="profile-overlay open"
      role="dialog"
      aria-modal="true"
      aria-label="Notificaciones"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="profile-sheet notif-sheet">
        <div className="profile-handle" />
        <div className="notif-header">
          <h2 className="notif-title">Notificaciones</h2>
          {notificaciones.some((n) => !n.leida) ? (
            <button type="button" className="btn btn-sm notif-mark-all" onClick={() => onMarcarTodasLeidas()}>
              Marcar todas leídas
            </button>
          ) : null}
        </div>

        {loading ? <p className="notif-empty">Cargando...</p> : null}
        {error ? <p className="error-box">{error}</p> : null}

        {!loading && !error && notificaciones.length === 0 ? (
          <p className="notif-empty">Sin notificaciones</p>
        ) : null}

        <div className="notif-list">
          {notificaciones.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`notif-item ${n.leida ? "" : "notif-item--unread"}`}
              onClick={() => handleClick(n)}
            >
              <span className="notif-item-icon" aria-hidden>
                {iconoNotificacionTipo(n.tipo)}
              </span>
              <span className="notif-item-body">
                <span className="notif-item-title">{n.titulo}</span>
                {n.texto ? <span className="notif-item-text">{n.texto}</span> : null}
                <span className="notif-item-ts">{formatNotificacionTs(n.createdAt)}</span>
              </span>
              {!n.leida ? <span className="notif-item-dot" aria-hidden /> : null}
            </button>
          ))}
        </div>

        <button type="button" className="close-btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
