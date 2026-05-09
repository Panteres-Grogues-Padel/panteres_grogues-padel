import { useState } from "react";

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
  const [utilOpen, setUtilOpen] = useState(false);
  const nombre = currentUser?.nombreCompleto?.split(" ")[0] || currentUser?.nombre || "jugador";
  const pos = Math.max(1, ranking.findIndex((j) => j.id === currentUser?.id) + 1);
  const rk = ranking.find((j) => j.id === currentUser?.id);
  const eficacia = rk ? `${(rk.eficacia * 100).toFixed(1)}%` : "-";
  const pj = rk?.pj ?? 0;

  return (
    <div>
      <div className="hero-pride">
        <img src="/icons/landing-logo.png" alt="Panteres Grogues Padel" className="hero-avatar" />
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
        <a
          className="quick-card"
          href="https://www.instagram.com/panteresgrogues"
          target="_blank"
          rel="noreferrer"
        >
          <div className="quick-emoji">📸</div>
          <div className="quick-label">Instagram</div>
        </a>
        <a className="quick-card" href="https://wa.me/" target="_blank" rel="noreferrer">
          <div className="quick-emoji">💬</div>
          <div className="quick-label">WhatsApp</div>
        </a>
      </div>

      <button
        type="button"
        className="btn btn-block bienvenida-utilidades-btn"
        onClick={() => setUtilOpen(true)}
      >
        <span style={{ fontSize: 18 }}>🗺️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Utilidades</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>Clubs, seguro, hospitales, más...</div>
        </div>
        <span style={{ fontSize: 12, color: "var(--text2)" }}>→</span>
      </button>

      {/* Utilidades sheet (mismo contenido que index.html) */}
      <div
        className={`profile-overlay${utilOpen ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setUtilOpen(false);
        }}
      >
        <div className="profile-sheet">
          <div className="profile-handle" />
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: "1.25rem" }}>
            🗺️ Utilidades
          </div>

          {/* Clubs */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "0.625rem"
            }}
          >
            Clubs
          </div>

          <div
            style={{
              background: "var(--bg2)",
              borderRadius: "var(--radius-lg)",
              padding: "1rem",
              marginBottom: "0.75rem",
              border: "0.5px solid var(--border)"
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
              🎾 Club Cornellà Up
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8 }}>
              Carrer de la Verge de Montserrat, 08940 Cornellà de Llobregat
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href="tel:931575872" className="btn btn-sm" style={{ fontSize: 12, textDecoration: "none" }}>
                📞 931 575 872
              </a>
              <a
                href="https://maps.google.com/?q=Carrer+de+la+Verge+de+Montserrat+08940+Cornella"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm"
                style={{ fontSize: 12, textDecoration: "none" }}
              >
                📍 Cómo llegar
              </a>
            </div>
          </div>

          <div
            style={{
              background: "var(--bg2)",
              borderRadius: "var(--radius-lg)",
              padding: "1rem",
              marginBottom: "1rem",
              border: "0.5px solid var(--border)"
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
              🎾 Club Delfos
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8 }}>
              Carrer de la Verge de Montserrat, s/n, 08940 Cornellà de Llobregat
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a href="tel:934741686" className="btn btn-sm" style={{ fontSize: 12, textDecoration: "none" }}>
                📞 934 741 686
              </a>
              <a
                href="https://maps.google.com/?q=Club+Delfos+Cornella+de+Llobregat"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm"
                style={{ fontSize: 12, textDecoration: "none" }}
              >
                📍 Cómo llegar
              </a>
            </div>
          </div>

          {/* Seguro médico */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "0.625rem"
            }}
          >
            Seguro médico
          </div>
          <div
            style={{
              background: "var(--bg2)",
              borderRadius: "var(--radius-lg)",
              padding: "1rem",
              marginBottom: "1rem",
              border: "0.5px solid var(--border)"
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
              🏥 Seguro deportivo
            </div>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>
              Póliza federativa — Federació Catalana de Pàdel
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              Contacta con el coordinador para obtener los datos de tu póliza
            </div>
          </div>

          {/* Hospitales cercanos */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text2)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "0.625rem"
            }}
          >
            Urgencias cercanas
          </div>
          <div
            style={{
              background: "var(--bg2)",
              borderRadius: "var(--radius-lg)",
              padding: "1rem",
              marginBottom: "1rem",
              border: "0.5px solid var(--border)"
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Hospital de Bellvitge</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>~10 min · L&apos;Hospitalet de Llobregat</div>
                </div>
                <a
                  href="https://maps.google.com/?q=Hospital+de+Bellvitge"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{ fontSize: 11, textDecoration: "none" }}
                >
                  📍
                </a>
              </div>
              <div style={{ height: "0.5px", background: "var(--border)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>CAP Almeda</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>~5 min · Cornellà de Llobregat</div>
                </div>
                <a
                  href="https://maps.google.com/?q=CAP+Almeda+Cornella"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm"
                  style={{ fontSize: 11, textDecoration: "none" }}
                >
                  📍
                </a>
              </div>
              <div style={{ height: "0.5px", background: "var(--border)" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>Urgencias · 112</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>Emergencias generales</div>
                </div>
                <a
                  href="tel:112"
                  className="btn btn-sm"
                  style={{
                    fontSize: 11,
                    textDecoration: "none",
                    background: "var(--danger)",
                    color: "#fff",
                    borderColor: "transparent"
                  }}
                >
                  📞 112
                </a>
              </div>
            </div>
          </div>

          <button type="button" className="close-btn" onClick={() => setUtilOpen(false)}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
