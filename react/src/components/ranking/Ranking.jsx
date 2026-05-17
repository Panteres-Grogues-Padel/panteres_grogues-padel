import { jugadoresCoinciden } from "../../utils/jugador";

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
              {filas.map((jugador, index) => (
                <tr
                  key={jugador.id ?? index}
                  className={currentUser && jugadoresCoinciden(currentUser.id, jugador.id) ? "me" : ""}
                  onClick={() => onSelect?.(jugador)}
                >
                  <td>{index + 1}</td>
                  <td>{jugador.nombre || "—"}</td>
                  <td>{jugador.pj}</td>
                  <td>{jugador.pg}</td>
                  <td>{jugador.jj}</td>
                  <td>{jugador.jg}</td>
                  <td>{pct(jugador.eficacia, 1)}</td>
                  <td>{pct(jugador.penalizacion, 0)}</td>
                  <td>{pct(jugador.score, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="formula-note">Ordenado por score · Eficacia, penalización y score en %</p>
      </article>
    </div>
  );
}
