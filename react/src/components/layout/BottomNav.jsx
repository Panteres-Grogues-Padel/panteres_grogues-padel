const TABS = ["bienvenida", "ranking", "jugar", "partidos", "resultados", "agenda"];

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab}
          className={`nav-item ${activeTab === tab ? "active" : ""}`}
          onClick={() => setActiveTab(tab)}
        >
          <span className="nav-label">{tab}</span>
        </button>
      ))}
    </nav>
  );
}
