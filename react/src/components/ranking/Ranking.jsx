import { jugadoresCoinciden } from "../../utils/jugador";
import { getNombre } from "../../utils/nombres";

function pct(value, decimals = 1) {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return `${(safe * 100).toFixed(decimals)}%`;
}

export default function Ranking({ ranking = [], currentUser, onSelect }) {
  const filas = Array.isArray(ranking) ? ranking : [];

  return (
    <div>
      <h2 className="section-title">Ranking</h2>
      <article className="card">
        <div className="rank-wrap">
          <table className="rank-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>PJ</th>
                <th>PG</th>
                <th>JJ</th>
                <th>JG</th>
                <th>Efic.</th>
                <th>Pen.</th>
                <th>Score</th>
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
                    <td className="rank-name">{getNombre(jugador) || "—"}</td>
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
        <p className="formula-note">Ordenado por score · Eficacia, penalización y score en %</p>
      </article>
    </div>
  );
}
