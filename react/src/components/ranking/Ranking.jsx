import { jugadoresCoinciden } from "../../utils/jugador";
import { getNombreVisible } from "../../utils/nombres";
import { t } from "../../i18n";

function pct(value, decimals = 1) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return `${(safe * 100).toFixed(decimals)}%`;
}

export default function Ranking({ ranking = [], currentUser, onSelect }) {
  const filas = Array.isArray(ranking) ? ranking : [];

  return (
    <div>
      <h2 className="section-title">{t("ranking.title")}</h2>
      <article className="card">
        <div className="rank-wrap">
          <table className="rank-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t("ranking.columns.player")}</th>
                <th>{t("ranking.columns.pj")}</th>
                <th>{t("ranking.columns.pg")}</th>
                <th>{t("ranking.columns.jj")}</th>
                <th>{t("ranking.columns.jg")}</th>
                <th>{t("ranking.columns.efficiency")}</th>
                <th>{t("ranking.columns.penalty")}</th>
                <th>{t("ranking.columns.score")}</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((jugador, index) => {
                const pos = index + 1;
                const isMe = currentUser && jugadoresCoinciden(currentUser.id, jugador.id);
                const rowClass = [
                  index % 2 === 0 ? "rank-row--even" : "rank-row--odd",
                  isMe ? "rank-row--me" : ""
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr
                    key={jugador.id ?? index}
                    className={rowClass}
                    onClick={() => onSelect?.(jugador)}
                  >
                    <td className="rank-pos">{pos}</td>
                    <td className="rank-name">{getNombreVisible(jugador) || "—"}</td>
                    <td className="rank-stat">{jugador.pj}</td>
                    <td className="rank-stat">{jugador.pg}</td>
                    <td className="rank-stat">{jugador.jj}</td>
                    <td className="rank-stat">{jugador.jg}</td>
                    <td className="rank-stat">{pct(jugador.eficacia, 1)}</td>
                    <td className="rank-stat">{pct(jugador.penalizacion, 0)}</td>
                    <td className="rank-stat">{pct(jugador.score, 1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="formula-note">{t("ranking.formulaNote")}</p>
      </article>
    </div>
  );
}
