import { useEffect, useMemo, useState } from "react";
import {
  IconBallTennis,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconChartBar,
  IconClipboardList,
  IconMap2,
  IconTrophy,
  IconUsers
} from "@tabler/icons-react";
import Padrinos from "../padrinos/Padrinos";
import { supabase } from "../../lib/supabase";
import { avatarClassFromNombre, initialsFromNombre } from "../../utils/avatar";

const LANDING_TABLER_ICON_SIZE = 34;

function LandingTablerIcon({ Icon }) {
  return (
    <span className="landing-tabler-icon-box" aria-hidden>
      <Icon size={LANDING_TABLER_ICON_SIZE} color="#fff" stroke={1.75} />
    </span>
  );
}

function horaMadrid(now = new Date()) {
  const h = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "numeric",
    hour12: false
  }).format(now);
  return Number(h);
}

function saludoPorHora() {
  const h = horaMadrid();
  if (h >= 6 && h <= 13) return "¡Buenos días";
  if (h >= 14 && h <= 20) return "¡Buenas tardes";
  return "¡Buenas noches";
}

function formatActivityTs(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function mapActivityRow(row) {
  const jugador = row.jugadores ?? {};
  const nombreJugador = jugador.nombre_completo ?? jugador.nombre ?? "Jugador";
  return {
    id: row.id,
    jugadorId: row.jugador_id,
    jugador: nombreJugador,
    tipo: row.tipo,
    texto: row.texto,
    ts: formatActivityTs(row.created_at)
  };
}

function sanitizeActivityText(texto) {
  return String(texto ?? "")
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function activityDescription(entry, includeJugador) {
  const texto = sanitizeActivityText(entry.texto);
  return includeJugador ? `${entry.jugador}: ${texto}` : texto;
}

export default function Bienvenida({
  currentUser,
  ranking,
  onOpenPerfil,
  onGoToJugar,
  onGoToPartidos,
  onGoToAgenda,
  onGoToResultados,
  onGoToRanking
}) {
  const [utilOpen, setUtilOpen] = useState(false);
  const [padrinosOpen, setPadrinosOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");
  const [logFiltro, setLogFiltro] = useState("");
  const nombre = currentUser?.nombreCompleto?.split(" ")[0] || currentUser?.nombre || "jugador";
  const pos = Math.max(1, ranking.findIndex((j) => j.id === currentUser?.id) + 1);
  const rk = ranking.find((j) => j.id === currentUser?.id);
  const eficacia = rk ? `${(rk.eficacia * 100).toFixed(1)}%` : "-";
  const pj = rk?.pj ?? 0;
  const isCoord = Boolean(currentUser?.es_coordinador || currentUser?.isCoord);
  const entradasLog = isCoord && logFiltro ? activityLog.filter((e) => e.jugadorId === logFiltro) : activityLog;
  const jugadoresLog = useMemo(() => {
    const jugadores = new Map();
    ranking.forEach((j) => {
      if (j.id) jugadores.set(String(j.id), j.nombreCompleto ?? j.nombre ?? "Jugador");
    });
    activityLog.forEach((e) => {
      if (e.jugadorId) jugadores.set(String(e.jugadorId), e.jugador);
    });
    return Array.from(jugadores, ([id, label]) => ({ id, label })).sort((a, b) =>
      a.label.localeCompare(b.label, "es")
    );
  }, [activityLog, ranking]);

  useEffect(() => {
    if (!activityOpen) return undefined;
    let cancelled = false;

    async function loadActivityLog() {
      setActivityError("");
      setLogFiltro("");
      if (!supabase || currentUser?.fromFallback) {
        setActivityLog([]);
        return;
      }

      setActivityLoading(true);
      let query = supabase
        .from("activity_log")
        .select("id,jugador_id,tipo,texto,created_at,jugadores(nombre,nombre_completo)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!isCoord) query = query.eq("jugador_id", currentUser.id);

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setActivityError(error.message);
        setActivityLog([]);
      } else {
        setActivityLog((data ?? []).map(mapActivityRow));
      }
      setActivityLoading(false);
    }

    void loadActivityLog();
    return () => {
      cancelled = true;
    };
  }, [activityOpen, currentUser?.fromFallback, currentUser?.id, isCoord]);

  return (
    <div>
      <div className="hero-pride">
        <button
          type="button"
          className="hero-avatar-btn"
          onClick={() => onOpenPerfil?.()}
          aria-label="Abrir mi perfil"
        >
          {currentUser?.foto_url ? (
            <img
              src={currentUser.foto_url}
              alt=""
              className="hero-player-avatar"
              style={{ objectFit: "cover", display: "block" }}
            />
          ) : (
            <div className={`hero-player-avatar ${avatarClassFromNombre(currentUser?.nombre ?? "")}`}>
              {initialsFromNombre(currentUser?.nombre ?? "")}
            </div>
          )}
        </button>
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
          <LandingTablerIcon Icon={IconCalendarEvent} />
          <div className="quick-label">Agenda</div>
        </button>
        <button className="quick-card" onClick={onGoToPartidos}>
          <LandingTablerIcon Icon={IconBallTennis} />
          <div className="quick-label">Partidos</div>
        </button>
        <button className="quick-card" onClick={onGoToResultados}>
          <LandingTablerIcon Icon={IconClipboardList} />
          <div className="quick-label">Resultados</div>
        </button>
        <button className="quick-card" onClick={onGoToRanking}>
          <LandingTablerIcon Icon={IconTrophy} />
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
          href="https://www.instagram.com/padel.pg/"
          target="_blank"
          rel="noreferrer"
        >
          <LandingTablerIcon Icon={IconBrandInstagram} />
          <div className="quick-label">Instagram</div>
        </a>
        <a className="quick-card" href="https://wa.me/" target="_blank" rel="noreferrer">
          <LandingTablerIcon Icon={IconBrandWhatsapp} />
          <div className="quick-label">WhatsApp</div>
        </a>
      </div>

      <button
        type="button"
        className="btn btn-block bienvenida-utilidades-btn"
        onClick={() => setUtilOpen(true)}
      >
        <LandingTablerIcon Icon={IconMap2} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Utilidades</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>Clubs, seguro, hospitales, más...</div>
        </div>
        <span style={{ fontSize: 12, color: "var(--text2)" }}>→</span>
      </button>

      <button
        type="button"
        className="btn btn-block bienvenida-padrinos-btn"
        onClick={() => setPadrinosOpen(true)}
      >
        <LandingTablerIcon Icon={IconUsers} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Padrinos</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>Tu padrino/madrina y ahijados/as</div>
        </div>
        <span style={{ fontSize: 12, color: "var(--text2)" }}>→</span>
      </button>

      <button
        type="button"
        className="btn btn-block bienvenida-actividad-btn"
        onClick={() => setActivityOpen(true)}
      >
        <LandingTablerIcon Icon={IconChartBar} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Actividad</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>
            {isCoord ? "Historial de todos los jugadores" : "Mi historial de acciones"}
          </div>
        </div>
        <span style={{ fontSize: 12, color: "var(--text2)" }}>→</span>
      </button>

      <div
        className={`profile-overlay${activityOpen ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setActivityOpen(false);
        }}
      >
        <div className="profile-sheet">
          <div className="profile-handle" />
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: "1.25rem" }}>
            Historial
          </div>

          <div style={{ marginTop: ".75rem" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text2)",
                textTransform: "uppercase",
                letterSpacing: ".05em",
                marginBottom: ".5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <span>{isCoord ? "Actividad reciente" : "Mi actividad"}</span>
              {isCoord ? (
                <select
                  id="log-filtro"
                  value={logFiltro}
                  onChange={(e) => setLogFiltro(e.target.value)}
                  style={{
                    fontSize: 11,
                    height: 24,
                    padding: "0 6px",
                    border: "0.5px solid var(--border2)",
                    borderRadius: "var(--radius)",
                    background: "var(--bg)"
                  }}
                >
                  <option value="">Todos</option>
                  {jugadoresLog.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <div id="log-landing">
              {activityLoading ? (
                <div style={{ fontSize: 12, color: "var(--text2)", padding: ".5rem 0", textAlign: "center" }}>
                  Cargando actividad...
                </div>
              ) : null}
              {!activityLoading && activityError ? (
                <div style={{ fontSize: 12, color: "var(--danger)", padding: ".5rem 0", textAlign: "center" }}>
                  {activityError}
                </div>
              ) : null}
              {!activityLoading && !activityError && !entradasLog.length ? (
                <div style={{ fontSize: 12, color: "var(--text2)", padding: ".5rem 0", textAlign: "center" }}>
                  Sin actividad registrada todavía
                </div>
              ) : null}
              {!activityLoading && !activityError
                ? entradasLog.slice(0, 10).map((e) => (
                    <div
                      key={e.id}
                      style={{
                        padding: "6px 0",
                        borderBottom: "0.5px solid var(--border)"
                      }}
                    >
                      <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 1 }}>{e.ts}</div>
                      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>
                        {activityDescription(e, isCoord && !logFiltro)}
                      </div>
                    </div>
                  ))
                : null}
            </div>
          </div>

          <button type="button" className="close-btn" onClick={() => setActivityOpen(false)}>
            Cerrar
          </button>
        </div>
      </div>

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

          {/* Organización */}
          <div
            style={{
              background: "var(--bg2)",
              borderRadius: "var(--radius-lg)",
              padding: "1rem",
              marginBottom: "1rem",
              border: "0.5px solid var(--border)"
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
              Panteres Grogues
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <a
                href="https://www.panteresgrogues.org"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: "var(--text)",
                  textDecoration: "none"
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>
                  🌐
                </span>
                <span>panteresgrogues.org</span>
              </a>
              <a
                href="https://maps.google.com/?q=Carrer+Floridablanca+143+Barcelona"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontSize: 13,
                  color: "var(--text2)",
                  textDecoration: "none"
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1.3 }} aria-hidden>
                  📍
                </span>
                <span>Carrer Floridablanca, 143, Barcelona</span>
              </a>
              <a
                href="tel:+34936782254"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: "var(--text)",
                  textDecoration: "none"
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>
                  📞
                </span>
                <span>+34 936 782 254</span>
              </a>
            </div>
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

      <div
        className={`profile-overlay${padrinosOpen ? " open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setPadrinosOpen(false);
        }}
      >
        <div className="profile-sheet profile-sheet--scroll">
          <div className="profile-handle" />
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text)", marginBottom: "1rem" }}>
            🤝 Padrinos
          </div>
          <Padrinos currentUser={currentUser} isCoord={isCoord} />
          <button type="button" className="close-btn" onClick={() => setPadrinosOpen(false)}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
