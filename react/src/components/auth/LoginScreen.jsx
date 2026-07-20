import { useState } from "react";
import { t } from "../../i18n";

const emailLoginEnabled = import.meta.env.VITE_EMAIL_LOGIN === "true";

function GoogleGIcon() {
  return (
    <svg className="login-google-icon" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

export default function LoginScreen({ auth }) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section className="screen active">
      <div className="login-screen">
        <div className="login-card">
          <header className="login-brand">
            <div className="login-logo-wrap">
              <img src="/icons/landing-logo.png" alt="" width={56} height={56} className="login-logo" />
            </div>
            <p className="login-brand-name">{t("auth.brandName")}</p>
            <h1 className="login-brand-sport">{t("auth.brandSport")}</h1>
            <p className="login-sub">{t("auth.subtitle")}</p>
          </header>

          {emailLoginEnabled ? (
            <>
              <div className="form-group login-field">
                <label className="login-label" htmlFor="login-email">
                  {t("common.email")}
                </label>
                <input
                  id="login-email"
                  className="login-input"
                  type="text"
                  value={auth.email}
                  onChange={(e) => auth.setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  autoComplete="email"
                />
              </div>

              <div className="form-group login-field">
                <label className="login-label" htmlFor="login-password">
                  {t("auth.passwordLabel")}
                </label>
                <input
                  id="login-password"
                  className="login-input"
                  type="password"
                  value={auth.password}
                  onChange={(e) => auth.setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block login-email-btn"
                onClick={auth.loginEmail}
                disabled={auth.loading}
              >
                {auth.loading ? t("auth.entering") : t("auth.enter")}
              </button>

              <div className="login-divider" role="separator">
                <span>{t("auth.orDivider")}</span>
              </div>
            </>
          ) : null}

          <button
            type="button"
            className="login-google-btn"
            onClick={auth.loginGoogle}
            disabled={auth.loading}
          >
            <GoogleGIcon />
            <span>{t("auth.enterGoogle")}</span>
          </button>

          <div className="login-footer-links">
            <button type="button" className="login-help-link" onClick={() => setHelpOpen(true)}>
              {t("auth.howToAccess.link")}
            </button>
            <a href="/privacitat" className="login-help-link">
              {t("auth.privacyPolicyLink")}
            </a>
          </div>

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
