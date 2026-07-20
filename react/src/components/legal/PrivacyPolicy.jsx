import { t } from "../../i18n";

export default function PrivacyPolicy() {
  return (
    <section className="screen active">
      <div className="legal-page">
        <article className="legal-card">
          <p className="legal-brand">{t("auth.brandName")}</p>
          <h1 className="legal-title">Política de Privacitat — Panteres Grogues Pàdel</h1>
          <p className="legal-updated">Última actualització: 20 de juliol de 2026</p>

          <section className="legal-section">
            <h2>1. Responsable del tractament</h2>
            <p>
              Panteres Grogues Pàdel, secció de pàdel de l&apos;associació Panteres Grogues.
            </p>
            <p>
              Contacte:{" "}
              <a href="mailto:padel@panteresgrogues.org">padel@panteresgrogues.org</a>
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Dades que recollim</h2>
            <p>A través de l&apos;aplicació recollim les dades següents:</p>
            <ul>
              <li>Dades d&apos;identificació: nom, cognoms, pronom, nickname, número de soci</li>
              <li>Dades de contacte: correu electrònic, telèfon (opcional, ocultable)</li>
              <li>Xarxes socials: usuari d&apos;Instagram (opcional)</li>
              <li>Data de naixement (dia i mes, per a notificacions d&apos;aniversari)</li>
              <li>Fotografia de perfil (opcional)</li>
              <li>
                Dades esportives: resultats de partits, rànquing, historial d&apos;inscripcions i
                assistència
              </li>
              <li>
                Dades tècniques: identificador de compte de Google (si accedeixes amb Google)
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Finalitat del tractament</h2>
            <p>Les dades es fan servir per:</p>
            <ul>
              <li>
                Gestionar la teva inscripció i participació en partits i activitats del club
              </li>
              <li>Calcular el rànquing i mostrar estadístiques</li>
              <li>
                Enviar notificacions rellevants (obertura d&apos;inscripcions, partits generats,
                resultats, aniversaris)
              </li>
              <li>Gestionar el pagament de quotes i activitats</li>
              <li>Facilitar la comunicació entre jugadors i coordinadors</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Base legal</h2>
            <p>
              El tractament es basa en el consentiment de l&apos;usuari, atorgat en registrar-se a
              l&apos;aplicació, i en l&apos;execució de la relació associativa amb el club.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Conservació de les dades</h2>
            <p>
              Les dades es conserven mentre l&apos;usuari mantingui la seva condició de soci actiu,
              i es poden eliminar a petició de l&apos;usuari.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Compartició de dades</h2>
            <p>
              Les dades no es cedeixen a tercers, excepte als proveïdors tecnològics necessaris per
              al funcionament de l&apos;aplicació (Supabase per a l&apos;emmagatzematge de dades i
              Google per a l&apos;autenticació), que actuen com a encarregats del tractament.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Drets de l&apos;usuari</h2>
            <p>
              Pots exercir els teus drets d&apos;accés, rectificació, supressió, oposició i
              portabilitat de les teves dades escrivint a{" "}
              <a href="mailto:padel@panteresgrogues.org">padel@panteresgrogues.org</a>.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Seguretat</h2>
            <p>
              Apliquem mesures tècniques i organitzatives per protegir les teves dades, incloent
              l&apos;ús de connexions xifrades i control d&apos;accés basat en rols.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Canvis en aquesta política</h2>
            <p>
              Aquesta política pot actualitzar-se periòdicament. Es notificaran els canvis
              rellevants a través de l&apos;aplicació.
            </p>
          </section>

          <a href="/" className="btn btn-primary btn-block legal-back">
            {t("common.back")}
          </a>
        </article>
      </div>
    </section>
  );
}
