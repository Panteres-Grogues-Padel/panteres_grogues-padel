import { t } from "../../i18n";

export default function LoginScreen({ auth }) {
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

          <label className="privacy-row login-privacy-row">
            <input
              className="login-privacy-check"
              type="checkbox"
              checked={auth.privacyAccepted}
              onChange={(e) => auth.setPrivacyAccepted(e.target.checked)}
            />
            <span className="login-privacy-text">{t("auth.privacyAccept")}</span>
          </label>

          <button className="btn btn-primary btn-block" onClick={auth.loginEmail} disabled={auth.loading}>
            {auth.loading ? t("auth.entering") : t("auth.enter")}
          </button>

          <button className="btn btn-block mt-8" onClick={auth.loginGoogle} disabled={auth.loading}>
            {t("auth.enterGoogle")}
          </button>

          {auth.error ? <p className="error-box">{auth.error}</p> : null}
        </div>
      </div>
    </section>
  );
}
