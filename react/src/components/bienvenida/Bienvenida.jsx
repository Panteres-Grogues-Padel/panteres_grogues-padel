function saludoPorHora() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function Bienvenida({
  currentUser,
  ranking,
  onGoToJugar,
  onGoToPartidos,
  onGoToAgenda,
  onGoToResultados,
  onGoToRanking
}) {
  const nombre = currentUser?.nombreCompleto?.split(" ")[0] || currentUser?.nombre || "jugador";
  const pos = Math.max(1, ranking.findIndex((j) => j.id === currentUser?.id) + 1);
  const rk = ranking.find((j) => j.id === currentUser?.id);
  const eficacia = rk ? `${(rk.eficacia * 100).toFixed(1)}%` : "-";
  const pj = rk?.pj ?? 0;

  return (
    <div>
      <div className="hero-pride">
        <img src="/icons/icon-192.png" alt="Panteres Grogues Padel" className="hero-avatar" />
        <div className="hero-title">
          {saludoPorHora()}, {nombre}!
        </div>
        <div className="hero-sub">Bienvenide a Panteres Grogues Pàdel 🏳️‍🌈</div>
      </div>

      <button className="bienvenida-cta" onClick={onGoToJugar}>
        <span className="cta-emoji">🏓</span>
        <span className="cta-copy">
          <span className="cta-title">¡A Jugaaarrr !!!!</span>
          <span className="cta-sub">Apúntate a tu próximo partido</span>
        </span>
        <span className="cta-arrow">→</span>
      </button>

      <div className="quick-grid">
        <button className="quick-card" onClick={onGoToAgenda}>
          <div className="quick-emoji">📅</div>
          <div className="quick-label">Agenda</div>
        </button>
        <button className="quick-card" onClick={onGoToPartidos}>
          <div className="quick-emoji">🌐</div>
          <div className="quick-label">Partidos</div>
        </button>
        <button className="quick-card" onClick={onGoToResultados}>
          <div className="quick-emoji">📋</div>
          <div className="quick-label">Resultados</div>
        </button>
        <button className="quick-card" onClick={onGoToRanking}>
          <div className="quick-emoji">📈</div>
          <div className="quick-label">Ranking</div>
        </button>
      </div>

      <button className="ranking-pill" onClick={onGoToRanking}>
        <span className="ranking-pos">{pos}º</span>
        <span>
          <span className="ranking-title">Tu posición en el ranking</span>
          <span className="ranking-sub">
            Eficacia: {eficacia} · {pj} partidos
          </span>
        </span>
        <span className="cta-arrow">→</span>
      </button>

      <div className="quick-grid">
        <a className="quick-card" href="https://www.instagram.com/panteresgrogue" target="_blank" rel="noreferrer">
          <div className="quick-emoji">📸</div>
          <div className="quick-label">Instagram</div>
        </a>
        <a className="quick-card" href="https://wa.me/" target="_blank" rel="noreferrer">
          <div className="quick-emoji">💬</div>
          <div className="quick-label">WhatsApp</div>
        </a>
      </div>

      <div className="card mt-8">
        <div className="row-between">
          <strong>🗺️ Utilidades</strong>
          <span>→</span>
        </div>
        <p className="slot-meta">Clubs, seguro, hospitales y más</p>
      </div>
    </div>
  );
}
