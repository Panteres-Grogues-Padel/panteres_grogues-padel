import { useMemo, useRef, useState } from "react";
import LoginScreen from "./components/auth/LoginScreen";
import Bienvenida from "./components/bienvenida/Bienvenida";
import Ranking from "./components/ranking/Ranking";
import Jugar from "./components/jugar/Jugar";
import Partidos from "./components/partidos/Partidos";
import Resultados from "./components/resultados/Resultados";
import Agenda from "./components/agenda/Agenda";
import Seccion from "./components/seccion/Seccion";
import BottomNav from "./components/layout/BottomNav";
import Topbar from "./components/layout/Topbar";
import { useAuth } from "./hooks/useAuth";
import { useSlots } from "./hooks/useSlots";
import { useRanking } from "./hooks/useRanking";
import { usePartidos } from "./hooks/usePartidos";
import { useEventos } from "./hooks/useEventos";
import { useResultados } from "./hooks/useResultados";
import { isJugadorUuid, jugadoresCoinciden } from "./utils/jugador";
import PerfilJugador from "./components/ranking/PerfilJugador";

export default function App() {
  const auth = useAuth();
  const apuntarInFlightRef = useRef(false);
  const [activeTab, setActiveTab] = useState("bienvenida");
  const [flashMessage, setFlashMessage] = useState("");
  const [perfilJugador, setPerfilJugador] = useState(null);
  // useSlots corre al montar App (tras login), no al entrar en la pestaña Jugar; Jugar solo recibe props.
  const { slots, slotsJugar, rawSlots, slotsNotice, apuntarEnSlot, bajaEnSlot } = useSlots(
    auth.currentUser,
    auth.authEpoch
  );
  const { ranking, loading: rankingLoading, error: rankingError } = useRanking();
  const { partidos, generarPartidos, loadPartidosForSlot, asignarHora, toggleIndoor, moverJugador, confirmarAsistencia } =
    usePartidos(auth.currentUser);
  const isCoord = useMemo(
    () => Boolean(auth.currentUser?.es_coordinador),
    [auth.currentUser]
  );
  const {
    guardarResultado,
    modificarResultado,
    validarResultado,
    getResultado,
    mapSetsFromResultado,
    loading: resultadosLoading,
    error: resultadosError
  } = useResultados(partidos, auth.currentUser, isCoord);
  const {
    eventos,
    apuntarseEvento,
    setParejaTorneo,
    bajaEvento,
    validarPago,
    loading: eventosLoading,
    error: eventosError
  } = useEventos(auth.currentUser, isCoord);

  if (!auth.currentUser) return <LoginScreen auth={auth} />;

  function showMessage(msg) {
    setFlashMessage(msg);
    window.setTimeout(() => setFlashMessage(""), 2500);
  }

  async function handleApuntar(slotId, options = {}) {
    if (apuntarInFlightRef.current) return;
    apuntarInFlightRef.current = true;
    try {
      const res = await apuntarEnSlot(slotId, options);
      if (!res.ok) showMessage(res.error);
    } finally {
      apuntarInFlightRef.current = false;
    }
  }

  async function handleBaja(slotId) {
    const res = await bajaEnSlot(slotId);
    if (!res.ok) showMessage(res.error);
    if (res.warning) showMessage(res.warning);
  }

  function perfilDesdeUsuarioSesion(u) {
    const rk = ranking.find((j) => jugadoresCoinciden(j.id, u.id));
    return {
      id: u.id,
      nombre: u.nombre,
      nombreCompleto: u.nombreCompleto ?? u.nombre,
      telefono: u.telefono ?? u.tel ?? "",
      instagram: u.instagram ?? u.ig ?? "",
      foto_url: u.foto_url ?? u.foto ?? null,
      mostrar_telefono: Boolean(u.mostrar_telefono ?? u.mostrarTel),
      autoriza_instagram: Boolean(u.autoriza_instagram ?? u.autorizaIG),
      pj: rk?.pj ?? 0,
      pg: rk?.pg ?? 0,
      jj: rk?.jj ?? 0,
      jg: rk?.jg ?? 0,
      eficacia: rk?.eficacia ?? 0,
      penalizacion: rk?.penalizacion ?? 0,
      score: rk?.score ?? 0
    };
  }

  async function handleGenerar(slotId, semana, options = {}) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return showMessage("Slot no encontrado");
    if (!isJugadorUuid(auth.currentUser?.id)) {
      return showMessage("Tu perfil no tiene un id de jugador válido para generar partidos en Supabase.");
    }
    const res = await generarPartidos({
      jugadoresRanking: ranking,
      slotId,
      semana: semana || slot.semanaObjetivo,
      currentUserId: auth.currentUser.id,
      numPistas: options.numPistas,
      numIndoor: options.numIndoor,
      slotMeta: { label: slot.label, club: slot.club, diaSemana: slot.diaSemana }
    });
    if (!res.ok) return showMessage(res.error);
    showMessage(`Partidos generados: ${res.cantidad}`);
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        <Topbar
          currentUser={auth.currentUser}
          setActiveTab={setActiveTab}
          onLogout={async () => {
            await auth.logout();
            window.location.reload();
          }}
        />

        <main className="content">
          {activeTab === "bienvenida" ? (
            <Bienvenida
              currentUser={auth.currentUser}
              ranking={ranking}
              onOpenPerfil={() => setPerfilJugador(perfilDesdeUsuarioSesion(auth.currentUser))}
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
              <Ranking ranking={ranking} currentUser={auth.currentUser} onSelect={(j) => setPerfilJugador(j)} />
            </>
          ) : null}
          {activeTab === "jugar" ? (
            <Jugar
              slots={slotsJugar}
              currentUser={auth.currentUser}
              onApuntar={handleApuntar}
              onBaja={handleBaja}
              backendNotice={slotsNotice}
              message={flashMessage}
            />
          ) : null}
          {activeTab === "partidos" ? (
            <Partidos
              partidos={partidos}
              slotsCatalog={rawSlots}
              slotsJugar={slotsJugar}
              onGenerar={handleGenerar}
              onLoadSlot={loadPartidosForSlot}
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
                return ok;
              }}
              onConfirmar={async (partidoId, jugadorId, confirmado) => {
                const res = await confirmarAsistencia(partidoId, jugadorId, confirmado);
                if (!res.ok) showMessage(res.error);
              }}
              isCoord={isCoord}
              ranking={ranking}
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
                onModificar={async (id, fecha) => {
                  const res = await modificarResultado(id, fecha);
                  if (!res.ok) return showMessage(res.error);
                  showMessage("Resultado desbloqueado para edición");
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
                currentUser={auth.currentUser}
                isCoord={isCoord}
                onApuntarse={async (id) => {
                  const res = await apuntarseEvento(id);
                  if (!res.ok) return showMessage(res.error);
                  showMessage("Inscripcion realizada");
                }}
                onSeleccionarPareja={async (eventoId, parejaJugadorId) => {
                  const res = await setParejaTorneo(eventoId, parejaJugadorId);
                  if (!res.ok) return showMessage(res.error);
                  showMessage("Pareja guardada");
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
              />
            </>
          ) : null}
          {activeTab === "seccion" ? <Seccion /> : null}
        </main>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      {flashMessage ? <div className="toast">{flashMessage}</div> : null}
      <PerfilJugador
        jugador={perfilJugador}
        currentUser={auth.currentUser}
        open={Boolean(perfilJugador)}
        onClose={() => setPerfilJugador(null)}
        onJugadorUpdated={(patch) => {
          setPerfilJugador((prev) => (prev && jugadoresCoinciden(prev.id, patch.id) ? { ...prev, ...patch } : prev));
          if (auth.currentUser && jugadoresCoinciden(auth.currentUser.id, patch.id)) {
            auth.patchCurrentUser(patch);
          }
        }}
      />

    </div>
  );
}
