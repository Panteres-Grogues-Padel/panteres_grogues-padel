import { useState } from "react";
import { t } from "../../i18n";
import "./onboarding.css";

const PRONOMBRES = ["Ell", "Ella", "Elle"];

function emptyForm(email = "") {
  return {
    pronombre: "",
    nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    nickname: "",
    numero_socio: "",
    id_app_antigua: "",
    documento_identidad: "",
    email_contacto: email,
    telefono: ""
  };
}

export default function OnboardingScreen({ auth }) {
  const [form, setForm] = useState(() => emptyForm(auth.currentUser?.email ?? ""));

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    await auth.completeOnboarding(form);
  }

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
              <label className="onboarding-label" htmlFor="onb-documento_identidad">
                {t("auth.onboarding.idDocument")} *
              </label>
              <input
                id="onb-documento_identidad"
                type="text"
                required
                autoComplete="off"
                value={form.documento_identidad}
                onChange={(e) => updateField("documento_identidad", e.target.value)}
                placeholder={t("auth.onboarding.idDocumentPlaceholder")}
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

            <button type="submit" className="btn btn-primary btn-block onboarding-submit" disabled={auth.loading}>
              {auth.loading ? t("common.saving") : t("auth.onboarding.submit")}
            </button>
          </form>

          {auth.error ? <p className="error-box">{auth.error}</p> : null}
        </div>
      </div>
    </section>
  );
}
