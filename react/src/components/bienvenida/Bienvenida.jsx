import { useEffect, useMemo, useState } from "react";
import {
  IconBallTennis,
  IconBrandInstagram,
  IconBrandWhatsapp,
  IconCalendarEvent,
  IconChartBar,
  IconClipboardList,
  IconMap2,
  IconUsers
} from "@tabler/icons-react";
import Padrinos from "../padrinos/Padrinos";
import { useMananaJuegas } from "../../hooks/useMananaJuegas";
import { supabase } from "../../lib/supabase";
import { DATE_LOCALE } from "../../utils/dates";
import { t } from "../../i18n";

const LANDING_TABLER_ICON_SIZE = 34;

const INSURANCE_PROTOCOL_URL =
  "https://fulqczmbmmakdxylejgw.supabase.co/storage/v1/object/public/documents/Protocol%20expres%20d'accidents%20Panteres.pdf";

function LandingTablerIcon({ Icon }) {
  return (
    <span className="landing-tabler-icon-box" aria-hidden>
      <Icon size={LANDING_TABLER_ICON_SIZE} color="#fde047" stroke={1.75} />
    </span>
  );
}

function horaMadrid(now = new Date()) {
  const h = new Intl.DateTimeFormat(DATE_LOCALE, {
    timeZone: "Europe/Madrid",
    hour: "numeric",
    hour12: false
  }).format(now);
  return Number(h);
}

function saludoPorHora() {
  const h = horaMadrid();
  if (h >= 6 && h <= 13) return t("bienvenida.greetingMorning");
  if (h >= 14 && h <= 20) return t("bienvenida.greetingAfternoon");
  return t("bienvenida.greetingEvening");
}

function formatActivityTs(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(DATE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function mapActivityRow(row) {
  const jugador = row.jugadores ?? {};
  const nombreJugador = jugador.nombre_completo ?? jugador.nombre ?? t("common.player");
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
  const nombre = currentUser?.nombreCompleto?.split(" ")[0] || currentUser?.nombre || t("common.playerFallback");
  const pos = Math.max(1, ranking.findIndex((j) => j.id === currentUser?.id) + 1);
  const rk = ranking.find((j) => j.id === currentUser?.id);
  const eficacia = rk ? `${(rk.eficacia * 100).toFixed(1)}%` : "-";
  const pj = rk?.pj ?? 0;
  const isCoord = Boolean(currentUser?.es_coordinador || currentUser?.isCoord);
  const mananaJuegas = useMananaJuegas(currentUser);
  const entradasLog = isCoord && logFiltro ? activityLog.filter((e) => e.jugadorId === logFiltro) : activityLog;
  const jugadoresLog = useMemo(() => {
    const jugadores = new Map();
    ranking.forEach((j) => {
      if (j.id) jugadores.set(String(j.id), j.nombreCompleto ?? j.nombre ?? t("common.player"));
    });
    activityLog.forEach((e) => {
      if (e.jugadorId) jugadores.set(String(e.jugadorId), e.jugador);
    });
    return Array.from(jugadores, ([id, label]) => ({ id, label })).sort((a, b) =>
      a.label.localeCompare(b.label, DATE_LOCALE)
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
      <div className={`hero-pride${mananaJuegas ? " hero-pride--manana" : ""}`}>
        <div className="hero-title">
          {saludoPorHora()}
          {t("bienvenida.greetingSuffix", { name: nombre })}
        </div>
        <div className="hero-sub">{t("bienvenida.welcomeSubtitle")}</div>
        {mananaJuegas ? <div className="hero-manana">{t("bienvenida.playTomorrow")}</div> : null}
      </div>

      <button className="bienvenida-cta" onClick={onGoToJugar}>
        <span className="cta-emoji">🏓</span>
        <span className="cta-copy">
          <span className="cta-title">{t("bienvenida.ctaTitle")}</span>
          <span className="cta-sub">{t("bienvenida.ctaSubtitle")}</span>
        </span>
        <span className="cta-arrow">→</span>
      </button>

      <div className="quick-grid">
        <button className="quick-card" onClick={onGoToAgenda}>
          <LandingTablerIcon Icon={IconCalendarEvent} />
          <div className="quick-label">{t("nav.agenda")}</div>
        </button>
        <button className="quick-card" onClick={onGoToPartidos}>
          <LandingTablerIcon Icon={IconBallTennis} />
          <div className="quick-label">{t("nav.partidos")}</div>
        </button>
        <button className="quick-card" onClick={onGoToResultados}>
          <LandingTablerIcon Icon={IconClipboardList} />
          <div className="quick-label">{t("nav.resultados")}</div>
        </button>
        <button type="button" className="quick-card" onClick={() => setActivityOpen(true)}>
          <LandingTablerIcon Icon={IconChartBar} />
          <div className="quick-label">{t("bienvenida.activity")}</div>
        </button>
      </div>

      <button className="ranking-pill" onClick={onGoToRanking}>
        <span className="ranking-pos">{t("common.positionOrdinal", { pos })}</span>
        <span>
          <span className="ranking-title">{t("bienvenida.rankingPillTitle")}</span>
          <span className="ranking-sub">{t("bienvenida.rankingPillSub", { eficacia, pj })}</span>
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
        <a
          className="quick-card"
          href="https://chat.whatsapp.com/IrHK6sBegxg639n48Px5qY?mode=gi_t"
          target="_blank"
          rel="noreferrer"
        >
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
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{t("bienvenida.utilities")}</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>{t("bienvenida.utilitiesSub")}</div>
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
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{t("bienvenida.godparents")}</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>{t("bienvenida.godparentsSub")}</div>
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
            {t("bienvenida.history")}
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
              <span>{isCoord ? t("bienvenida.activityRecent") : t("bienvenida.myActivity")}</span>
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
                  <option value="">{t("common.all")}</option>
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
                  {t("bienvenida.loadingActivity")}
                </div>
              ) : null}
              {!activityLoading && activityError ? (
                <div style={{ fontSize: 12, color: "var(--danger)", padding: ".5rem 0", textAlign: "center" }}>
                  {activityError}
                </div>
              ) : null}
              {!activityLoading && !activityError && !entradasLog.length ? (
                <div style={{ fontSize: 12, color: "var(--text2)", padding: ".5rem 0", textAlign: "center" }}>
                  {t("bienvenida.noActivity")}
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
            {t("common.close")}
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
            {t("bienvenida.utilitiesSheetTitle")}
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
              {t("bienvenida.orgTitle")}
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
            {t("bienvenida.clubsSection")}
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
                📍 {t("common.howToGetThere")}
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
                📍 {t("common.howToGetThere")}
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
            {t("bienvenida.insuranceSection")}
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
            <a
              href={INSURANCE_PROTOCOL_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm"
              style={{ fontSize: 13, textDecoration: "none", marginBottom: 10, display: "inline-block" }}
            >
              🏥 {t("bienvenida.insuranceProtocolBtn")}
            </a>
            <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 4 }}>
              {t("bienvenida.insurancePolicy")}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)" }}>
              {t("bienvenida.insuranceContact")}
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
            {t("bienvenida.urgenciesSection")}
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
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{t("bienvenida.urgency112")}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>{t("common.emergencies")}</div>
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
            {t("common.close")}
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
            {t("bienvenida.godparentsSheetTitle")}
          </div>
          <Padrinos currentUser={currentUser} isCoord={isCoord} />
          <button type="button" className="close-btn" onClick={() => setPadrinosOpen(false)}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
