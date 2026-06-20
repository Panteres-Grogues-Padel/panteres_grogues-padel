import { t } from "../../i18n";
import "./onboarding.css";

export default function PendingApprovalScreen({ auth }) {
  return (
    <section className="screen active">
      <div className="onboarding-screen">
        <div className="onboarding-card onboarding-card--pending">
          <div className="onboarding-pending-icon" aria-hidden>
            ⏳
          </div>
          <div className="onboarding-title">{t("auth.pending.title")}</div>
          <div className="onboarding-sub">{t("auth.pending.subtitle")}</div>
          <button type="button" className="btn btn-block mt-8" onClick={() => void auth.logout()} disabled={auth.loading}>
            {t("auth.pending.logout")}
          </button>
        </div>
      </div>
    </section>
  );
}
