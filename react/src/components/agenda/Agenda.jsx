import { useState } from "react";

export default function Agenda({ eventos, onApuntarse, onBaja, onValidarPago, isCoord, currentUser }) {
  const [parejas, setParejas] = useState({});

  return (
    <div>
      <h2 className="section-title">Agenda</h2>
      {eventos.map((e) => {
        const miInscripcion = e.miInscripcion ?? null;
        return (
          <article className="card" key={e.id}>
            <p>
              <strong>{e.titulo}</strong>
            </p>
            <p className="slot-meta">
              {e.fecha} · {e.tipo} · {e.precio ? `${e.precio}€` : "Gratis"}
            </p>
            <p>{e.desc}</p>

            <p className="slot-meta">
              Inscritos: {e.totalInscritos ?? e.inscritos.length} · Pagos validados:{" "}
              {e.totalPagados ?? e.inscritos.filter((i) => i.pagoConfirmado).length}
            </p>

            {!miInscripcion ? (
              <div className="stack mt-8">
                {e.tipo === "torneo" ? (
                  <input
                    placeholder="Nombre de tu pareja"
                    value={parejas[e.id] ?? ""}
                    onChange={(ev) => setParejas((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                  />
                ) : null}
                <button className="btn btn-primary btn-sm" onClick={() => onApuntarse(e.id, parejas[e.id] ?? "")}>
                  Apuntarme
                </button>
              </div>
            ) : (
              <div className="stack mt-8">
                <p className="info-box">
                  Ya estas inscrito
                  {miInscripcion.pareja ? ` · Pareja: ${miInscripcion.pareja}` : ""}
                  {miInscripcion.pagoConfirmado ? " · Pago validado ✅" : ""}
                </p>
                <button className="btn btn-danger btn-sm" onClick={() => onBaja(e.id)}>
                  Darme de baja
                </button>
              </div>
            )}

            {isCoord && e.inscritos.length ? (
              <div className="stack mt-8">
                {e.inscritos.map((ins) => (
                  <div key={ins.id} className="row-between">
                    <span>
                      {ins.nombre}
                      {ins.pareja ? ` (pareja: ${ins.pareja})` : ""}
                      {ins.pagoConfirmado ? " ✅" : ""}
                    </span>
                    {!ins.pagoConfirmado ? (
                      <button className="btn btn-sm" onClick={() => onValidarPago(e.id, ins.id)}>
                        Validar pago
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
