import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { isJugadorUuid, jugadoresCoinciden } from "../../utils/jugador";
import { getNombreVisible } from "../../utils/nombres";
import { useCurrentJugador } from "../../context/CurrentJugadorContext";
import {
  actualizarPerfilJugadorRpc,
  fetchPerfilJugadorRpc,
  mergePerfilView
} from "../../utils/perfilJugador";
import { uploadProfilePhoto } from "../../utils/profilePhoto";
import { numeroSocioPanteres } from "../../utils/socio";
import { DATE_LOCALE, hoyLocalStr } from "../../utils/dates";
import PlayerAvatar from "../common/PlayerAvatar";
import { t } from "../../i18n";

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

function formatProfileDate(value) {
  if (!value) return "";
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(DATE_LOCALE);
}

export default function PerfilJugador({ jugador, open, onClose, onJugadorUpdated }) {
  const { jugador: yo, refreshJugador } = useCurrentJugador();
  const [view, setView] = useState(null);
  const [contactForm, setContactForm] = useState({
    telefono: "",
    instagram: "",
    ocultar_telefon: false
  });
  const [nicknameForm, setNicknameForm] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState("");
  const [contactSaving, setContactSaving] = useState(false);
  const [contactError, setContactError] = useState("");
  const [sancioLocal, setSancioLocal] = useState({ sancionat: false, sancio_fins: "" });
  const [sancioSaving, setSancioSaving] = useState(false);
  const [sancioError, setSancioError] = useState("");
  const [fotoError, setFotoError] = useState("");
  const [fotoUploading, setFotoUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (jugador && open) {
      const esPropi =
        yo && jugadoresCoinciden(jugador.id, yo.id) ? mergePerfilView(jugador, yo) : jugador;
      setView(esPropi);
      setContactForm({
        telefono: esPropi.telefono ?? "",
        instagram: (esPropi.instagram ?? "").replace(/^@/, "").trim(),
        ocultar_telefon: Boolean(esPropi.ocultar_telefon)
      });
      setNicknameForm(esPropi.nickname ?? "");
      setNicknameError("");
      setContactError("");
      setSancioLocal({
        sancionat: Boolean(esPropi.sancionat),
        sancio_fins: esPropi.sancio_fins ?? ""
      });
      setSancioError("");
      setFotoError("");
    }
  }, [jugador, open, yo]);

  useEffect(() => {
    if (!open || !jugador?.id || !supabase || !isJugadorUuid(jugador.id)) return undefined;

    let cancelled = false;
    void (async () => {
      const { ok, perfil } = await fetchPerfilJugadorRpc(supabase, jugador.id);
      if (cancelled || !ok || !perfil) return;
      setView((prev) => mergePerfilView(prev, perfil));
      if (yo && jugadoresCoinciden(jugador.id, yo.id)) {
        setContactForm({
          telefono: perfil.telefono ?? "",
          instagram: (perfil.instagram ?? "").replace(/^@/, "").trim(),
          ocultar_telefon: Boolean(perfil.ocultar_telefon)
        });
      }
      setNicknameForm(perfil.nickname ?? "");
      setSancioLocal({
        sancionat: Boolean(perfil.sancionat),
        sancio_fins: perfil.sancio_fins ?? ""
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, jugador?.id, yo]);

  const isOwn = useMemo(
    () => Boolean(yo && view && jugadoresCoinciden(view.id, yo.id)),
    [yo, view]
  );

  const avatarJugador = isOwn && yo ? { ...view, foto_url: yo.foto_url } : view;
  const isCoord = Boolean(yo?.es_coordinador || yo?.isCoord);
  const sancioVigent = Boolean(view?.sancionat && view?.sancio_fins && view.sancio_fins >= hoyLocalStr());
  const showSancioSection = isCoord || sancioVigent;

  const penStr = useMemo(() => {
    if (!view) return null;
    const p = view.penalizacion ?? 0;
    if (p > 0) {
      return (
        <div style={{ fontSize: 12, color: "#BA7517" }}>
          {t("ranking.profile.penaltyFewMatches", { pct: Math.round(p * 100) })}
        </div>
      );
    }
    return <div style={{ fontSize: 12, color: "#27500A" }}>{t("ranking.profile.noPenalty")}</div>;
  }, [view]);

  const ocultarTel = Boolean(view?.ocultar_telefon);
  const tel = (view?.telefono ?? "").trim();
  const ig = (view?.instagram ?? "").replace(/^@/, "").trim();
  const showIgPublic = Boolean(ig);
  const showTelPublic = Boolean(tel) && !ocultarTel;

  const handleSaveContact = useCallback(async () => {
    if (!isOwn || !view?.id || !supabase) return;
    setContactError("");
    setContactSaving(true);
    const { ok, perfil, error } = await actualizarPerfilJugadorRpc(supabase, view.id, {
      ...contactForm,
      nickname: view.nickname ?? ""
    });
    setContactSaving(false);
    if (!ok || !perfil) {
      setContactError(error ?? t("ranking.profile.contactSaveError"));
      return;
    }
    setView((prev) => mergePerfilView(prev, perfil));
    setContactForm({
      telefono: perfil.telefono ?? "",
      instagram: (perfil.instagram ?? "").replace(/^@/, "").trim(),
      ocultar_telefon: Boolean(perfil.ocultar_telefon)
    });
    onJugadorUpdated?.({ id: view.id, ...perfil });
    void refreshJugador();
  }, [isOwn, view, contactForm, onJugadorUpdated, refreshJugador]);

  const handleSaveNickname = useCallback(async () => {
    if (!isCoord || !view?.id || !supabase) return;
    setNicknameError("");
    setNicknameSaving(true);
    const nicknameTrim = nicknameForm.trim();
    const { error } = await supabase
      .from("jugadores")
      .update({ nickname: nicknameTrim || null })
      .eq("id", view.id);
    if (error) {
      setNicknameSaving(false);
      setNicknameError(error.message);
      return;
    }
    const { ok, perfil, error: reloadError } = await fetchPerfilJugadorRpc(supabase, view.id);
    setNicknameSaving(false);
    if (!ok || !perfil) {
      setNicknameError(reloadError ?? t("ranking.profile.contactSaveError"));
      return;
    }
    setView((prev) => mergePerfilView(prev, perfil));
    setNicknameForm(perfil.nickname ?? "");
    onJugadorUpdated?.({ id: view.id, ...perfil });
    if (isOwn) void refreshJugador();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("perfil-actualizado"));
    }
  }, [isCoord, isOwn, nicknameForm, onJugadorUpdated, refreshJugador, view]);

  const canChangePhoto = isOwn && supabase && isJugadorUuid(view?.id) && !yo?.fromFallback;

  const handlePhotoSelect = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file || !canChangePhoto || !view?.id) return;

      setFotoError("");
      setFotoUploading(true);
      const result = await uploadProfilePhoto(supabase, view.id, file);
      if (!result.ok) {
        setFotoUploading(false);
        setFotoError(result.error ?? t("ranking.profile.photoErrors.uploadFailed"));
        return;
      }

      const refresh = await refreshJugador();
      setFotoUploading(false);

      if (!refresh.ok) {
        setFotoError(t("ranking.profile.photoErrors.updateFailed"));
        return;
      }

      const perfil = refresh.perfil ?? { foto_url: result.foto_url };
      setView((prev) => mergePerfilView(prev, perfil));
      onJugadorUpdated?.({ id: view.id, ...perfil });
    },
    [canChangePhoto, view, onJugadorUpdated, refreshJugador]
  );

  const handleSaveSancio = useCallback(async () => {
    if (!isCoord || !view?.id || !supabase) return;
    setSancioError("");

    if (sancioLocal.sancionat && !sancioLocal.sancio_fins) {
      setSancioError(t("ranking.profile.sanctions.dateRequired"));
      return;
    }

    setSancioSaving(true);
    const rpcName = sancioLocal.sancionat ? "sancionar_jugador" : "desancionar_jugador";
    const params = sancioLocal.sancionat
      ? { p_jugador_id: view.id, p_fins: sancioLocal.sancio_fins }
      : { p_jugador_id: view.id };
    const { error } = await supabase.rpc(rpcName, params);

    if (error) {
      setSancioSaving(false);
      setSancioError(error.message);
      return;
    }

    const { ok, perfil, error: reloadError } = await fetchPerfilJugadorRpc(supabase, view.id);
    setSancioSaving(false);

    if (!ok || !perfil) {
      setSancioError(reloadError ?? t("ranking.profile.sanctions.saveError"));
      return;
    }

    setView((prev) => mergePerfilView(prev, perfil));
    setSancioLocal({
      sancionat: Boolean(perfil.sancionat),
      sancio_fins: perfil.sancio_fins ?? ""
    });
    onJugadorUpdated?.({ id: view.id, ...perfil });
    if (isOwn) void refreshJugador();
  }, [isCoord, isOwn, onJugadorUpdated, refreshJugador, sancioLocal, view]);

  if (!open || !view) return null;

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
            <PlayerAvatar jugador={avatarJugador} size={72} />
            {canChangePhoto ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => void handlePhotoSelect(e)}
                />
                <button
                  type="button"
                  className="profile-photo-btn"
                  disabled={fotoUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {fotoUploading ? t("ranking.profile.photoUploading") : t("ranking.profile.changePhoto")}
                </button>
                {fotoError ? <p className="profile-photo-error">{fotoError}</p> : null}
              </>
            ) : null}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div className="profile-name">{getNombreVisible(view)}</div>
              {isOwn ? <span className="own-badge">{t("ranking.profile.you")}</span> : null}
            </div>
            {isOwn && view.nickname && (view.nombreCompleto || view.nombre) ? (
              <div className="profile-sub">
                {t("ranking.profile.fullName", {
                  name: view.nombreCompleto || view.nombre
                })}
              </div>
            ) : null}
            <div className="profile-socio-line">
              <span className="profile-socio-label">{t("ranking.profile.memberNumber")}</span>
              <span className="profile-socio-val">{numeroSocioPanteres(view.id)}</span>
            </div>
            {sancioVigent ? (
              <div className="profile-sanction-badge">
                {t("ranking.profile.sanctionedUntil", { date: formatProfileDate(view.sancio_fins) })}
              </div>
            ) : null}
            {!isOwn && (showIgPublic || showTelPublic) ? (
              <div className="profile-links" style={{ marginTop: 5 }}>
                {showIgPublic ? (
                  <a className="profile-link" href={igUrl(ig) ?? "#"} target="_blank" rel="noreferrer">
                    <IconInsta />
                    @{ig}
                  </a>
                ) : null}
                {showTelPublic ? (
                  <a className="profile-link" href={`tel:${tel.replace(/\s/g, "")}`}>
                    <IconPhone />
                    {tel}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="profile-stats-grid">
          <div className="profile-stat-cell">
            <div className="profile-stat-label">{t("ranking.profile.matchesPlayed")}</div>
            <div className="profile-stat-val">{view.pj ?? 0}</div>
          </div>
          <div className="profile-stat-cell">
            <div className="profile-stat-label">{t("ranking.profile.matchesWon")}</div>
            <div className="profile-stat-val">{view.pg ?? 0}</div>
          </div>
          <div className="profile-stat-cell">
            <div className="profile-stat-label">{t("ranking.profile.gamesPlayed")}</div>
            <div className="profile-stat-val">{view.jj ?? 0}</div>
          </div>
          <div className="profile-stat-cell">
            <div className="profile-stat-label">{t("ranking.profile.gamesWon")}</div>
            <div className="profile-stat-val">{view.jg ?? 0}</div>
          </div>
          <div className="profile-stat-cell profile-stat-wide">
            <div className="profile-stat-label">{t("ranking.profile.efficiency")}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
              <div className="profile-stat-val">{((view.eficacia ?? 0) * 100).toFixed(1)}%</div>
              {penStr}
            </div>
          </div>
          <div className="profile-stat-cell profile-stat-wide">
            <div className="profile-stat-label">{t("ranking.profile.scoreRanking")}</div>
            <div className="profile-stat-val" style={{ marginTop: 2 }}>
              {(view.score ?? 0).toFixed(4)}
            </div>
          </div>
        </div>

        {isOwn ? (
          <>
            <div className="sheet-divider" />
            <div className="privacy-section">
              <div className="privacy-title">{t("ranking.profile.contact")}</div>
              <label className="profile-contact-field">
                <span className="privacy-row-label">{t("ranking.profile.phone")}</span>
                <input
                  type="tel"
                  className="profile-contact-input"
                  value={contactForm.telefono}
                  placeholder={t("ranking.profile.phonePlaceholder")}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, telefono: e.target.value }))}
                />
              </label>
              <label className="privacy-row profile-privacy-row">
                <input
                  type="checkbox"
                  checked={contactForm.ocultar_telefon}
                  onChange={(e) =>
                    setContactForm((prev) => ({ ...prev, ocultar_telefon: e.target.checked }))
                  }
                />
                <div>
                  <div className="privacy-row-label">{t("ranking.profile.hidePhone")}</div>
                </div>
              </label>
              <label className="profile-contact-field">
                <span className="privacy-row-label">{t("ranking.profile.instagram")}</span>
                <div className="profile-contact-ig">
                  <span className="profile-contact-ig-prefix">@</span>
                  <input
                    type="text"
                    className="profile-contact-input"
                    value={contactForm.instagram}
                    placeholder={t("ranking.profile.instagramPlaceholder")}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        instagram: e.target.value.replace(/^@+/, "")
                      }))
                    }
                  />
                </div>
              </label>
              {contactError ? <p className="profile-photo-error">{contactError}</p> : null}
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={contactSaving}
                onClick={() => void handleSaveContact()}
              >
                {contactSaving ? t("common.saving") : t("ranking.profile.saveContact")}
              </button>
            </div>
          </>
        ) : null}

        {isCoord ? (
          <>
            <div className="sheet-divider" />
            <div className="privacy-section">
              <div className="privacy-title">{t("ranking.profile.visibleName")}</div>
              <label className="profile-contact-field">
                <span className="privacy-row-label">{t("ranking.profile.visibleName")}</span>
                <input
                  type="text"
                  className="profile-contact-input"
                  value={nicknameForm}
                  placeholder={t("ranking.profile.visibleNamePlaceholder")}
                  onChange={(e) => setNicknameForm(e.target.value)}
                />
                <span className="privacy-row-sub">{t("ranking.profile.visibleNameHint")}</span>
              </label>
              {nicknameError ? <p className="profile-photo-error">{nicknameError}</p> : null}
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={nicknameSaving}
                onClick={() => void handleSaveNickname()}
              >
                {nicknameSaving ? t("common.saving") : t("ranking.profile.saveContact")}
              </button>
            </div>
          </>
        ) : null}

        {showSancioSection ? (
          <>
            <div className="sheet-divider" />
            <div className="privacy-section">
              <div className="privacy-title">{t("ranking.profile.sanctions.title")}</div>
              <label className="privacy-row profile-privacy-row">
                <input
                  type="checkbox"
                  checked={sancioLocal.sancionat}
                  disabled={!isCoord || sancioSaving}
                  onChange={(e) =>
                    setSancioLocal((prev) => ({
                      ...prev,
                      sancionat: e.target.checked
                    }))
                  }
                />
                <div>
                  <div className="privacy-row-label">{t("ranking.profile.sanctions.checkbox")}</div>
                  <div className="privacy-row-sub">{t("ranking.profile.sanctions.readOnlyHint")}</div>
                </div>
              </label>

              {sancioLocal.sancionat ? (
                <label className="profile-sanction-date">
                  <span className="privacy-row-label">{t("ranking.profile.sanctions.until")}</span>
                  <input
                    type="date"
                    value={sancioLocal.sancio_fins}
                    disabled={!isCoord || sancioSaving}
                    onChange={(e) =>
                      setSancioLocal((prev) => ({
                        ...prev,
                        sancio_fins: e.target.value
                      }))
                    }
                  />
                </label>
              ) : null}

              {sancioError ? <p className="profile-photo-error">{sancioError}</p> : null}
              {isCoord ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={sancioSaving}
                  onClick={() => void handleSaveSancio()}
                >
                  {sancioSaving ? t("common.saving") : t("ranking.profile.sanctions.save")}
                </button>
              ) : null}
            </div>
          </>
        ) : null}

        <button type="button" className="close-btn" onClick={onClose}>
          {t("common.close")}
        </button>
      </div>
    </div>
  );
}
