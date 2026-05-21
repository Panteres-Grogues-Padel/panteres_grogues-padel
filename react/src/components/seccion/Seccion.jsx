import { t } from "../../i18n";

/** Contenido de `tab-seccion` en index.html (organigrama). */
export default function Seccion() {
  return (
    <>
      <div className="section-title">{t("seccion.title")}</div>
      <div className="org-area">{t("seccion.generalCoord")}</div>
      <div className="pcard feat">
        <div className="org-av av-blue">JG</div>
        <div className="pcard-info">
          <div className="pcard-name">Jaime García</div>
          <div className="pcard-role">Coordinador General · Presidente</div>
          <div className="pcard-contact">
            <a className="pcard-link" href="mailto:jaime@ejemplo.com">
              jaime@ejemplo.com
            </a>
          </div>
        </div>
      </div>
      <div className="org-area">{t("seccion.managementArea")}</div>
      <div className="pcard">
        <div className="org-av av-teal">MP</div>
        <div className="pcard-info">
          <div className="pcard-name">María Puig</div>
          <div className="pcard-role">Tesorería</div>
        </div>
      </div>
      <div className="pcard">
        <div className="org-av av-purple">CR</div>
        <div className="pcard-info">
          <div className="pcard-name">Carlos Ros</div>
          <div className="pcard-role">Soporte informático</div>
        </div>
      </div>
      <div className="org-area">{t("seccion.sportsArea")}</div>
      <div className="pcard">
        <div className="org-av av-purple">AL</div>
        <div className="pcard-info">
          <div className="pcard-name">Ana López</div>
          <div className="pcard-role">Coord. Liga Social</div>
        </div>
      </div>
      <div className="pcard">
        <div className="org-av av-coral">PT</div>
        <div className="pcard-info">
          <div className="pcard-name">Pedro Torres</div>
          <div className="pcard-role">Coord. Torneos</div>
        </div>
      </div>
      <div className="org-area">{t("seccion.commsArea")}</div>
      <div className="pcard">
        <div className="org-av av-pink">BM</div>
        <div className="pcard-info">
          <div className="pcard-name">Bea Martí</div>
          <div className="pcard-role">Coord. Activismo y Redes</div>
        </div>
      </div>
      <div className="pcard">
        <div className="org-av av-teal">OS</div>
        <div className="pcard-info">
          <div className="pcard-name">Oriol Serra</div>
          <div className="pcard-role">Coord. Entretenimiento</div>
        </div>
      </div>
    </>
  );
}
