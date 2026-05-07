import { nombreCorto } from "../../utils/nombres";

export default function Ranking({ ranking, currentUser, onSelect }) {
  return (
    <div>
      <h2 className="section-title">Ranking</h2>
      <article className="card">
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
            </tr>
          </thead>
          <tbody>
            {ranking.map((jugador, index) => (
              <tr
                key={jugador.id}
                className={currentUser?.nombre === jugador.nombre ? "me" : ""}
                onClick={() => onSelect(jugador)}
              >
                <td>{index + 1}</td>
                <td>{nombreCorto(jugador.nombreCompleto)}</td>
                <td>{jugador.pj}</td>
                <td>{jugador.pg}</td>
                <td>{jugador.jj}</td>
                <td>{jugador.jg}</td>
                <td>{(jugador.eficacia * 100).toFixed(1)}%</td>
                <td>{(jugador.penalizacion * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}
