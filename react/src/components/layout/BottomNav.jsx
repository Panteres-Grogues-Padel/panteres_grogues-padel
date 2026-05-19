/** Orden: Jugar, Partidos, Resultados, Ranking, Agenda, Coordinación (misma barra en landing y resto de la app). Iconos SVG como en index.html. */
const TABS = [
  {
    id: "jugar",
    label: "Jugar",
    svg: (
      <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  },
  {
    id: "partidos",
    label: "Partidos",
    svg: (
      <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    )
  },
  {
    id: "resultados",
    label: "Resultados",
    svg: (
      <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    )
  },
  {
    id: "ranking",
    label: "Ranking",
    svg: (
      <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  },
  {
    id: "agenda",
    label: "Agenda",
    svg: (
      <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="14" x2="8.01" y2="14" />
        <line x1="12" y1="14" x2="12.01" y2="14" />
        <line x1="16" y1="14" x2="16.01" y2="14" />
      </svg>
    )
  },
  {
    id: "seccion",
    label: "Coordinación",
    svg: (
      <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  }
];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, svg }) => (
        <button
          key={id}
          type="button"
          className={`nav-item ${activeTab === id ? "active" : ""}`}
          onClick={() => setActiveTab(id)}
        >
          {svg}
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
