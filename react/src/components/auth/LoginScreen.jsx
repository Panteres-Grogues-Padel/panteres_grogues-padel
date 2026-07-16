import { useState } from "react";
import { t } from "../../i18n";

export default function LoginScreen({ auth }) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section className="screen active">
      <div className="login-screen">
        <div className="login-card">
          <div className="login-title">{t("auth.appTitle")}</div>
          <div className="login-sub">{t("auth.subtitle")}</div>

          <div className="form-group">
            <label className="login-label">{t("common.email")}</label>
            <input
              type="text"
              value={auth.email}
              onChange={(e) => auth.setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
            />
          </div>

          <div className="form-group">
            <label className="login-label">{t("auth.passwordLabel")}</label>
            <input
              type="password"
              value={auth.password}
              onChange={(e) => auth.setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="btn btn-primary btn-block" onClick={auth.loginEmail} disabled={auth.loading}>
            {auth.loading ? t("auth.entering") : t("auth.enter")}
          </button>

          <button className="btn btn-block mt-8" onClick={auth.loginGoogle} disabled={auth.loading}>
            {t("auth.enterGoogle")}
          </button>

          <button type="button" className="login-help-link" onClick={() => setHelpOpen(true)}>
            {t("auth.howToAccess.link")}
          </button>

          {auth.error ? <p className="error-box">{auth.error}</p> : null}
        </div>
      </div>

      {helpOpen ? (
        <div
          className="login-help-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-help-title"
          onClick={() => setHelpOpen(false)}
        >
          <div className="login-help-modal" onClick={(e) => e.stopPropagation()}>
            <h2 id="login-help-title" className="login-help-title">
              {t("auth.howToAccess.title")}
            </h2>
            <p className="login-help-intro">{t("auth.howToAccess.intro")}</p>
            <ol className="login-help-steps">
              <li>{t("auth.howToAccess.step1")}</li>
              <li>
                {t("auth.howToAccess.step2")}
                <ul className="login-help-fields">
                  <li>{t("auth.howToAccess.fields.identity")}</li>
                  <li>{t("auth.howToAccess.fields.birthDate")}</li>
                  <li>{t("auth.howToAccess.fields.nickname")}</li>
                  <li>{t("auth.howToAccess.fields.memberNumber")}</li>
                  <li>{t("auth.howToAccess.fields.legacyId")}</li>
                  <li>{t("auth.howToAccess.fields.contact")}</li>
                </ul>
              </li>
              <li>{t("auth.howToAccess.step3")}</li>
              <li>{t("auth.howToAccess.step4")}</li>
            </ol>
            <button type="button" className="btn btn-primary btn-block" onClick={() => setHelpOpen(false)}>
              {t("common.close")}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
