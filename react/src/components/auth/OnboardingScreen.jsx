import { useState } from "react";
import { t } from "../../i18n";
import {
  buildFechaNacimiento,
  DIAS_NACIMIENTO,
  MESES_NACIMIENTO
} from "../../utils/fechaNacimientoDm";
import "./onboarding.css";

const PRONOMBRES = ["Ell", "Ella", "Elle", "Altre", "Prefereixo no dir-ho"];

function emptyForm(email = "") {
  return {
    pronombre: "",
    nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    birth_day: "",
    birth_month: "",
    nickname: "",
    numero_socio: "",
    id_app_antigua: "",
    email_contacto: email,
    telefono: "",
    acepto_privacidad: false
  };
}

export default function OnboardingScreen({ auth }) {
  const [form, setForm] = useState(() => emptyForm(auth.currentUser?.email ?? ""));

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    if (!form.acepto_privacidad) {
      return;
    }
    const fecha_nacimiento = buildFechaNacimiento(form.birth_day, form.birth_month);
    if (!fecha_nacimiento) return;
    const { birth_day: _d, birth_month: _m, ...rest } = form;
    await auth.completeOnboarding({ ...rest, fecha_nacimiento });
  }

  const birthDateValid = Boolean(buildFechaNacimiento(form.birth_day, form.birth_month));

  return (
    <section className="screen active">
      <div className="onboarding-screen">
        <div className="onboarding-card onboarding-card--form">
          <div className="onboarding-title">{t("auth.onboarding.title")}</div>
          <div className="onboarding-sub">{t("auth.onboarding.subtitle")}</div>

          <form className="onboarding-form" onSubmit={(ev) => void handleSubmit(ev)}>
            <div className="form-group">
              <label className="onboarding-label" htmlFor="onb-pronombre">
                {t("auth.onboarding.pronoun")} *
              </label>
              <select
                id="onb-pronombre"
                required
                value={form.pronombre}
                onChange={(e) => updateField("pronombre", e.target.value)}
              >
                <option value="">{t("common.selectPlaceholder")}</option>
                {PRONOMBRES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {[
              ["nombre", t("admin.fields.name"), "text"],
              ["primer_apellido", t("admin.fields.firstSurname"), "text"],
              ["segundo_apellido", t("admin.fields.secondSurname"), "text"]
            ].map(([key, label, type]) => (
              <div key={key} className="form-group">
                <label className="onboarding-label" htmlFor={`onb-${key}`}>
                  {label} *
                </label>
                <input
                  id={`onb-${key}`}
                  type={type}
                  required
                  value={form[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                />
              </div>
            ))}

            <div className="form-group">
              <span className="onboarding-label">{t("auth.onboarding.birthDate")} *</span>
              <div className="onboarding-birth-row">
                <select
                  id="onb-birth_day"
                  required
                  aria-label={t("auth.onboarding.birthDay")}
                  value={form.birth_day}
                  onChange={(e) => updateField("birth_day", e.target.value)}
                >
                  <option value="">{t("auth.onboarding.birthDay")}</option>
                  {DIAS_NACIMIENTO.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  id="onb-birth_month"
                  required
                  aria-label={t("auth.onboarding.birthMonth")}
                  value={form.birth_month}
                  onChange={(e) => updateField("birth_month", e.target.value)}
                >
                  <option value="">{t("auth.onboarding.birthMonth")}</option>
                  {MESES_NACIMIENTO.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="onboarding-label" htmlFor="onb-nickname">
                {t("admin.fields.nickname")} *
              </label>
              <p className="onboarding-hint">{t("auth.onboarding.nicknameHint")}</p>
              <input
                id="onb-nickname"
                type="text"
                required
                value={form.nickname}
                onChange={(e) => updateField("nickname", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="onboarding-label" htmlFor="onb-numero_socio">
                {t("auth.onboarding.memberNumber")} *
              </label>
              <input
                id="onb-numero_socio"
                type="text"
                required
                value={form.numero_socio}
                onChange={(e) => updateField("numero_socio", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="onboarding-label" htmlFor="onb-id_app_antigua">
                {t("auth.onboarding.legacyId")} *
              </label>
              <p className="onboarding-hint">{t("auth.onboarding.legacyIdHint")}</p>
              <input
                id="onb-id_app_antigua"
                type="text"
                required
                value={form.id_app_antigua}
                onChange={(e) => updateField("id_app_antigua", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="onboarding-label" htmlFor="onb-email_contacto">
                {t("auth.onboarding.contactEmail")} *
              </label>
              <input
                id="onb-email_contacto"
                type="email"
                required
                value={form.email_contacto}
                onChange={(e) => updateField("email_contacto", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="onboarding-label" htmlFor="onb-telefono">
                {t("auth.onboarding.contactPhone")} *
              </label>
              <input
                id="onb-telefono"
                type="tel"
                required
                value={form.telefono}
                onChange={(e) => updateField("telefono", e.target.value)}
              />
            </div>

            <label className="privacy-row onboarding-privacy-row">
              <input
                className="onboarding-privacy-check"
                type="checkbox"
                required
                checked={form.acepto_privacidad}
                onChange={(e) => updateField("acepto_privacidad", e.target.checked)}
              />
              <span className="onboarding-privacy-text">
                {t("auth.privacyAcceptBefore")}
                <a
                  href="/privacitat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="onboarding-privacy-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("auth.privacyPolicyLink")}
                </a>
              </span>
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-block onboarding-submit"
              disabled={auth.loading || !form.acepto_privacidad || !birthDateValid}
            >
              {auth.loading ? t("common.saving") : t("auth.onboarding.submit")}
            </button>
          </form>

          {auth.error ? <p className="error-box">{auth.error}</p> : null}
        </div>
      </div>
    </section>
  );
}
