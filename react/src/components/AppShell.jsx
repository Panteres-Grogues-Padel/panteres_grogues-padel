const tabs = ["Seccion", "Agenda", "Jugar", "Partidos", "Resultados", "Ranking"];

export default function AppShell() {
  return (
    <section className="screen app-screen">
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-left">
            <div className="app-name">Panteres Grogues</div>
          </div>
          <button className="logout-btn">Salir</button>
        </header>

        <main className="content">
          <div className="tab-content active">
            <h2 className="section-title">La seccion</h2>
            <article className="card">
              <p>Coordinacion general y equipo organizador.</p>
            </article>
          </div>
        </main>

        <nav className="bottom-nav">
          {tabs.map((tab) => (
            <button key={tab} className="nav-item">
              <span className="nav-label">{tab}</span>
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
