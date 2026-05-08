import { useMemo, useState } from "react";
import LoginScreen from "./components/auth/LoginScreen";
import Bienvenida from "./components/bienvenida/Bienvenida";
import Ranking from "./components/ranking/Ranking";
import Jugar from "./components/jugar/Jugar";
import Partidos from "./components/partidos/Partidos";
import Resultados from "./components/resultados/Resultados";
import Agenda from "./components/agenda/Agenda";
import BottomNav from "./components/layout/BottomNav";
import { useAuth } from "./hooks/useAuth";
import { useSlots } from "./hooks/useSlots";
import { useRanking } from "./hooks/useRanking";
import { usePartidos } from "./hooks/usePartidos";
import { useEventos } from "./hooks/useEventos";
import { useResultados } from "./hooks/useResultados";

export default function App() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState("bienvenida");
  const [flashMessage, setFlashMessage] = useState("");
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState(null);
  const { slots, apuntarEnSlot, bajaEnSlot } = useSlots(auth.currentUser);
  const { ranking, loading: rankingLoading, error: rankingError } = useRanking();
  const { partidos, generarPartidos, asignarHora, toggleIndoor, moverJugador, confirmarAsistencia } =
    usePartidos(auth.currentUser);
  const isCoord = useMemo(
    () => Boolean(auth.currentUser?.es_coordinador),
    [auth.currentUser]
  );
  const {
    guardarResultado,
    validarResultado,
    getResultado,
    mapSetsFromResultado,
    loading: resultadosLoading,
    error: resultadosError
  } = useResultados(partidos, auth.currentUser, isCoord);
  const { eventos, apuntarseEvento, bajaEvento, validarPago, loading: eventosLoading, error: eventosError } =
    useEventos(auth.currentUser, isCoord);

  if (!auth.currentUser) return <LoginScreen auth={auth} />;

  function showMessage(msg) {
    setFlashMessage(msg);
    window.setTimeout(() => setFlashMessage(""), 2500);
  }

  async function handleApuntar(slotId, options = {}) {
    const res = await apuntarEnSlot(slotId, options);
    if (!res.ok) showMessage(res.error);
  }

  async function handleBaja(slotId) {
    const res = await bajaEnSlot(slotId);
    if (!res.ok) showMessage(res.error);
    if (res.warning) showMessage(res.warning);
  }

  async function handleGenerar(slotId, semana) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return showMessage("Slot no encontrado");
    const res = await generarPartidos({
      jugadoresRanking: ranking,
      slotId,
      semana: semana || slot.semanaObjetivo,
      currentUserId: auth.currentUser.id
    });
    if (!res.ok) return showMessage(res.error);
    showMessage(`Partidos generados: ${res.cantidad}`);
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        <header className="topbar">
          <strong>Panteres Grogues</strong>
          <div className="row-gap">
            <span>{auth.currentUser.nombre}</span>
            <button className="logout-btn" onClick={auth.logout}>
              Salir
            </button>
          </div>
        </header>

        <main className="content">
          {activeTab === "bienvenida" ? (
            <Bienvenida
              currentUser={auth.currentUser}
              ranking={ranking}
              onGoToJugar={() => setActiveTab("jugar")}
              onGoToPartidos={() => setActiveTab("partidos")}
              onGoToAgenda={() => setActiveTab("agenda")}
              onGoToResultados={() => setActiveTab("resultados")}
              onGoToRanking={() => setActiveTab("ranking")}
            />
          ) : null}
          {activeTab === "ranking" ? (
            <>
              {rankingLoading ? <p className="info-box">Cargando ranking...</p> : null}
              {rankingError ? <p className="error-box">Error ranking: {rankingError}</p> : null}
              <Ranking ranking={ranking} currentUser={auth.currentUser} onSelect={setJugadorSeleccionado} />
            </>
          ) : null}
          {activeTab === "jugar" ? (
            <Jugar
              slots={slots}
              currentUser={auth.currentUser}
              onApuntar={handleApuntar}
              onBaja={handleBaja}
              message={flashMessage}
            />
          ) : null}
          {activeTab === "partidos" ? (
            <Partidos
              partidos={partidos}
              onGenerar={handleGenerar}
              onHora={async (id, hora) => {
                const res = await asignarHora(id, hora);
                if (!res.ok) showMessage(res.error);
              }}
              onIndoor={async (id) => {
                const res = await toggleIndoor(id);
                if (!res.ok) showMessage(res.error);
              }}
              onMover={async (origenId, destinoId, jugadorId) => {
                const ok = await moverJugador(origenId, destinoId, jugadorId);
                if (!ok) showMessage("No se pudo mover el jugador");
              }}
              onConfirmar={async (partidoId, jugadorId, confirmado) => {
                const res = await confirmarAsistencia(partidoId, jugadorId, confirmado);
                if (!res.ok) showMessage(res.error);
              }}
              isCoord={isCoord}
              slots={slots}
              currentUser={auth.currentUser}
            />
          ) : null}
          {activeTab === "resultados" ? (
            <>
              {resultadosLoading ? <p className="info-box">Cargando resultados...</p> : null}
              {resultadosError ? <p className="error-box">Error resultados: {resultadosError}</p> : null}
              <Resultados
                partidos={partidos}
                onGuardar={async (id, fecha, sets) => {
                  const res = await guardarResultado(id, fecha, sets);
                  if (!res.ok) return showMessage(res.error);
                  showMessage("Resultado guardado");
                }}
                onValidar={async (id, fecha) => {
                  const res = await validarResultado(id, fecha);
                  if (!res.ok) return showMessage(res.error);
                  showMessage("Resultado validado");
                }}
                currentUser={auth.currentUser}
                isCoord={isCoord}
                getResultado={getResultado}
                mapSetsFromResultado={mapSetsFromResultado}
              />
            </>
          ) : null}
          {activeTab === "agenda" ? (
            <>
              {eventosLoading ? <p className="info-box">Cargando agenda...</p> : null}
              {eventosError ? <p className="error-box">Error agenda: {eventosError}</p> : null}
              <Agenda
                eventos={eventos}
                onApuntarse={async (id, pareja) => {
                  const res = await apuntarseEvento(id, pareja);
                  if (!res.ok) return showMessage(res.error);
                  showMessage("Inscripcion realizada");
                }}
                onBaja={async (id) => {
                  const res = await bajaEvento(id);
                  if (!res.ok) return showMessage(res.error);
                  showMessage("Baja realizada");
                }}
                onValidarPago={async (eventoId, inscripcionId) => {
                  const res = await validarPago(eventoId, inscripcionId);
                  if (!res.ok) return showMessage(res.error);
                  showMessage("Pago validado");
                }}
                isCoord={isCoord}
                currentUser={auth.currentUser}
              />
            </>
          ) : null}
        </main>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      {flashMessage ? <div className="toast">{flashMessage}</div> : null}
      {jugadorSeleccionado ? (
        <div className="toast" onClick={() => setJugadorSeleccionado(null)}>
          {jugadorSeleccionado.nombreCompleto}
        </div>
      ) : null}
    </div>
  );
}
