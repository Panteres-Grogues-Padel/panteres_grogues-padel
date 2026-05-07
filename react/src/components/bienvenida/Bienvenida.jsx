export default function Bienvenida({ currentUser, onGoToJugar, onGoToPartidos }) {
  const nombre = currentUser?.nombreCompleto?.split(" ")[0] || currentUser?.nombre || "jugador";

  return (
    <div>
      <h2 className="section-title">Bienvenida</h2>
      <article className="card">
        <p>
          <strong>Hola, {nombre}</strong>
        </p>
        <p className="slot-meta">Panteres Grogues Pàdel · Área personal</p>
        <p className="mt-8">
          Desde aquí puedes apuntarte a jugar, revisar tus partidos y gestionar resultados.
        </p>
        <div className="slot-actions mt-8">
          <button className="btn btn-primary btn-sm" onClick={onGoToJugar}>
            Ir a Jugar
          </button>
          <button className="btn btn-sm" onClick={onGoToPartidos}>
            Ver Partidos
          </button>
        </div>
      </article>
    </div>
  );
}
