import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { jugadoresCoinciden } from "../../utils/jugador";
import { getNombre, nombreCorto } from "../../utils/nombres";
import { avatarClassFromNombre, initialsFromNombre } from "../../utils/avatar";
import { numeroSocioPanteres } from "../../utils/socio";

function igUrl(igRaw) {
  const h = (igRaw ?? "").replace(/^@/, "").trim();
  if (!h) return null;
  return `https://instagram.com/${encodeURIComponent(h)}`;
}

function IconPhone() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.6 3.35 2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.64a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16a2 2 0 0 1 .5.92z" />
    </svg>
  );
}

function IconInsta() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconLockPhone() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function PerfilJugador({ jugador, currentUser, open, onClose, onJugadorUpdated }) {
  const [local, setLocal] = useState(null);

  useEffect(() => {
    if (jugador && open) {
      setLocal({
        mostrar_telefono: Boolean(jugador.mostrar_telefono),
        autoriza_instagram: Boolean(jugador.autoriza_instagram)
      });
    }
  }, [jugador, open]);

  const isOwn = useMemo(
    () => Boolean(currentUser && jugador && jugadoresCoinciden(jugador.id, currentUser.id)),
    [currentUser, jugador]
  );

  const corto = jugador?.nombreCompleto ? nombreCorto(jugador.nombreCompleto) : "";

  const penStr = useMemo(() => {
    if (!jugador) return null;
    const p = jugador.penalizacion ?? 0;
    if (p > 0) {
      return (
        <div style={{ fontSize: 12, color: "#BA7517" }}>
          Penalización -{Math.round(p * 100)}% (pocos partidos)
        </div>
      );
    }
    return <div style={{ fontSize: 12, color: "#27500A" }}>Sin penalización</div>;
  }, [jugador]);

  const showTel = isOwn || jugador?.mostrar_telefono;
  const showIg = isOwn || jugador?.autoriza_instagram;
  const tel = jugador?.telefono ?? "";
  const ig = jugador?.instagram ?? "";

  const persistPrivacy = useCallback(
    async (field, checked) => {
      if (!isOwn || !jugador?.id || !supabase) return;
      const payload = field === "mostrar_telefono" ? { mostrar_telefono: checked } : { autoriza_instagram: checked };
      const { error } = await supabase.from("jugadores").update(payload).eq("id", jugador.id);
      if (error) {
        console.warn("[PerfilJugador]", error.message);
        return;
      }
      setLocal((prev) => ({ ...prev, [field]: checked }));
      onJugadorUpdated?.({ id: jugador.id, ...payload });
    },
    [isOwn, jugador, onJugadorUpdated]
  );

  if (!open || !jugador) return null;

  const foto = jugador.foto_url;
  const displayName = getNombre(jugador) || jugador.nombre || "";
  const initials = initialsFromNombre(displayName);
  const avClass = avatarClassFromNombre(displayName);

  return (
    <div
      className="profile-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="profile-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="profile-handle" />
        <div className="profile-header">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            {foto ? (
              <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                <img src={foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ) : (
              <div
                className={`profile-av ${avClass}`}
                style={{ width: 72, height: 72, fontSize: 24, position: "relative" }}
              >
                {initials}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div className="profile-name">
                {isOwn ? jugador.nombreCompleto || jugador.nombre : corto || getNombre(jugador)}
              </div>
              {isOwn ? <span className="own-badge">Tú</span> : null}
            </div>
            {isOwn && jugador.nickname ? (
              <div className="profile-nickname">@{jugador.nickname}</div>
            ) : null}
            <div className="profile-sub">
              {isOwn
                ? jugador.nickname
                  ? `Nombre en app: ${jugador.nombre}`
                  : jugador.nombre
                : getNombre(jugador)}
            </div>
            <div className="profile-socio-line">
              <span className="profile-socio-label">N.º socio Panteres</span>
              <span className="profile-socio-val">{numeroSocioPanteres(jugador.id)}</span>
            </div>
            <div className="profile-links" style={{ marginTop: 5 }}>
              {showIg && ig ? (
                <a className="profile-link" href={igUrl(ig) ?? "#"} target="_blank" rel="noreferrer">
                  <IconInsta />
                  {ig.startsWith("@") ? ig : `@${ig}`}
                </a>
              ) : showIg ? (
                <span className="profile-link hidden">
                  <IconInsta />
                  Sin cuenta indicada
                </span>
              ) : (
                <span className="profile-link hidden">
                  <IconInsta />
                  Instagram no visible
                </span>
              )}
              {showTel && tel ? (
                <a className="profile-link" href={`tel:${tel.replace(/\s/g, "")}`}>
                  <IconPhone />
                  {tel}
                </a>
              ) : (
                <span className="profile-link hidden">
                  <IconLockPhone />
                  Teléfono oculto
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="profile-stats-grid">
          <div className="profile-stat-cell">
            <div className="profile-stat-label">Partidos jugados</div>
            <div className="profile-stat-val">{jugador.pj ?? 0}</div>
          </div>
          <div className="profile-stat-cell">
            <div className="profile-stat-label">Partidos ganados</div>
            <div className="profile-stat-val">{jugador.pg ?? 0}</div>
          </div>
          <div className="profile-stat-cell">
            <div className="profile-stat-label">Juegos jugados</div>
            <div className="profile-stat-val">{jugador.jj ?? 0}</div>
          </div>
          <div className="profile-stat-cell">
            <div className="profile-stat-label">Juegos ganados</div>
            <div className="profile-stat-val">{jugador.jg ?? 0}</div>
          </div>
          <div className="profile-stat-cell profile-stat-wide">
            <div className="profile-stat-label">Eficacia</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
              <div className="profile-stat-val">{((jugador.eficacia ?? 0) * 100).toFixed(1)}%</div>
              {penStr}
            </div>
          </div>
          <div className="profile-stat-cell profile-stat-wide">
            <div className="profile-stat-label">Score ranking</div>
            <div className="profile-stat-val" style={{ marginTop: 2 }}>
              {(jugador.score ?? 0).toFixed(4)}
            </div>
          </div>
        </div>

        {isOwn && local ? (
          <>
            <div className="sheet-divider" />
            <div className="privacy-section">
              <div className="privacy-title">⚙️ Privacidad</div>
              <div className="privacy-row profile-privacy-row">
                <input
                  type="checkbox"
                  id="priv-tel"
                  checked={local.mostrar_telefono}
                  onChange={(e) => void persistPrivacy("mostrar_telefono", e.target.checked)}
                />
                <div>
                  <div className="privacy-row-label">Mostrar mi teléfono</div>
                  <div className="privacy-row-sub">Visible para otros jugadores</div>
                </div>
              </div>
              <div className="privacy-row profile-privacy-row">
                <input
                  type="checkbox"
                  id="priv-ig"
                  checked={local.autoriza_instagram}
                  onChange={(e) => void persistPrivacy("autoriza_instagram", e.target.checked)}
                />
                <div>
                  <div className="privacy-row-label">Autorizo etiquetas en Instagram</div>
                  <div className="privacy-row-sub">La sección puede etiquetarme en el perfil oficial</div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        <button type="button" className="close-btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
