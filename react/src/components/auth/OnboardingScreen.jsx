import { useState } from "react";
import { t } from "../../i18n";
import "./onboarding.css";

export default function OnboardingScreen({ auth }) {
  const [form, setForm] = useState({
    nombre: "",
    primer_apellido: "",
    segundo_apellido: "",
    nickname: "",
    telefono: ""
  });
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  async function handleSubmit(ev) {
    ev.preventDefault();
    await auth.completeOnboarding({ ...form, privacyAccepted });
  }

  return (
    <section className="screen active">
      <div className="onboarding-screen">
        <div className="onboarding-card">
          <div className="onboarding-title">{t("auth.onboarding.title")}</div>
          <div className="onboarding-sub">{t("auth.onboarding.subtitle")}</div>

          <form className="onboarding-form" onSubmit={(ev) => void handleSubmit(ev)}>
            {[
              ["nombre", t("admin.fields.name"), true],
              ["primer_apellido", t("admin.fields.firstSurname"), false],
              ["segundo_apellido", t("admin.fields.secondSurname"), false],
              ["nickname", t("admin.fields.nickname"), false],
              ["telefono", t("auth.onboarding.phone"), false]
            ].map(([key, label, required]) => (
              <div key={key} className="form-group">
                <label className="onboarding-label">
                  {label}
                  {required ? " *" : ""}
                </label>
                <input
                  type={key === "telefono" ? "tel" : "text"}
                  required={required}
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}

            <label className="privacy-row login-privacy-row">
              <input
                className="login-privacy-check"
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
              />
              <span className="login-privacy-text">{t("auth.privacyAccept")}</span>
            </label>

            <button type="submit" className="btn btn-primary btn-block" disabled={auth.loading}>
              {auth.loading ? t("common.saving") : t("auth.onboarding.submit")}
            </button>
          </form>

          {auth.error ? <p className="error-box">{auth.error}</p> : null}
        </div>
      </div>
    </section>
  );
}
