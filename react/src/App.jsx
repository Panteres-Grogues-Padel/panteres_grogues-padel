import { useMemo, useRef, useState } from "react";
import NotificacionesPanel from "./components/notificaciones/NotificacionesPanel";
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
import { resolveNotificacionDeepLink, useNotificaciones } from "./hooks/useNotificaciones";
import { isJugadorUuid, jugadoresCoinciden } from "./utils/jugador";
import PerfilJugador from "./components/ranking/PerfilJugador";
import { CurrentJugadorProvider, useCurrentJugador } from "./context/CurrentJugadorContext";
import { t } from "./i18n";

export default function App() {
  const auth = useAuth();

  if (!auth.currentUser) return <LoginScreen auth={auth} />;

  return (
    <CurrentJugadorProvider
      jugador={auth.currentUser}
      avatarVersion={auth.avatarVersion}
      refreshJugador={auth.refreshCurrentJugador}
      patchJugador={auth.patchCurrentUser}
    >
      <AppAuthed auth={auth} />
    </CurrentJugadorProvider>
  );
}

function AppAuthed({ auth }) {
  const { jugador: yo } = useCurrentJugador();
  const apuntarInFlightRef = useRef(false);
  const [activeTab, setActiveTab] = useState("bienvenida");
  const [flashMessage, setFlashMessage] = useState("");
  const [perfilJugador, setPerfilJugador] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [partidosDeepLink, setPartidosDeepLink] = useState(null);
  const [jugarDeepLink, setJugarDeepLink] = useState(null);
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
    crearEvento,
    borrarEvento,
    loading: eventosLoading,
    error: eventosError
  } = useEventos(auth.currentUser, isCoord);
  const {
    notificaciones,
    loading: notifLoading,
    error: notifError,
    noLeidas,
    marcarLeida,
    marcarTodasLeidas
  } = useNotificaciones(auth.currentUser);

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

  function handleNotificacionNavigate(notif) {
    const { tab, partidosDeepLink: partidosLink, jugarDeepLink: jugarLink } =
      resolveNotificacionDeepLink(notif);
    if (tab) setActiveTab(tab);
    setPartidosDeepLink(partidosLink);
    setJugarDeepLink(jugarLink);
  }

  function perfilDesdeUsuarioSesion(u) {
    const rk = ranking.find((j) => jugadoresCoinciden(j.id, u.id));
    const fotoBase = auth.currentUser?.foto_url ?? u.foto_url ?? u.foto ?? null;
    return {
      id: u.id,
      nombre: u.nombre,
      nickname: u.nickname ?? rk?.nickname ?? null,
      nombreCompleto: u.nombreCompleto ?? u.nombre,
      telefono: u.telefono ?? u.tel ?? "",
      instagram: (u.instagram ?? u.ig ?? "").replace(/^@/, "").trim(),
      foto_url: fotoBase,
      ocultar_telefon: Boolean(
        u.ocultar_telefon ?? (u.mostrar_telefono != null ? !u.mostrar_telefono : !u.mostrarTel)
      ),
      mostrar_telefono: Boolean(u.mostrar_telefono ?? u.mostrarTel),
      autoriza_instagram: Boolean(u.autoriza_instagram ?? u.autorizaIG),
      sancionat: Boolean(u.sancionat),
      sancio_fins: u.sancio_fins ?? null,
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
    if (!slot) return showMessage(t("app.toasts.slotNotFound"));
    if (!isJugadorUuid(auth.currentUser?.id)) {
      return showMessage(t("app.toasts.invalidPlayerIdGenerate"));
    }
    const res = await generarPartidos({
      jugadoresRanking: ranking,
      slotId,
      semana: semana || slot.semanaObjetivo,
      currentUserId: auth.currentUser.id,
      franjas: options.franjas,
      slotMeta: { label: slot.label, club: slot.club, diaSemana: slot.diaSemana }
    });
    if (!res.ok) return showMessage(res.error);
    showMessage(t("app.toasts.matchesGenerated", { count: res.cantidad }));
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        <Topbar
          setActiveTab={setActiveTab}
          noLeidas={noLeidas}
          onOpenNotificaciones={() => setNotifOpen(true)}
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
              onOpenPerfil={() => setPerfilJugador(perfilDesdeUsuarioSesion(yo ?? auth.currentUser))}
              onGoToJugar={() => setActiveTab("jugar")}
              onGoToPartidos={() => setActiveTab("partidos")}
              onGoToAgenda={() => setActiveTab("agenda")}
              onGoToResultados={() => setActiveTab("resultados")}
              onGoToRanking={() => setActiveTab("ranking")}
            />
          ) : null}
          {activeTab === "ranking" ? (
            <>
              {rankingLoading ? <p className="info-box">{t("app.toasts.loadingRanking")}</p> : null}
              {rankingError ? <p className="error-box">{t("app.toasts.rankingError", { error: rankingError })}</p> : null}
              <Ranking ranking={ranking} currentUser={auth.currentUser} onSelect={(j) => setPerfilJugador(j)} />
            </>
          ) : null}
          {activeTab === "jugar" ? (
            <Jugar
              slots={slotsJugar}
              currentUser={auth.currentUser}
              isCoord={isCoord}
              deepLink={jugarDeepLink}
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
                if (!ok) showMessage(t("app.toasts.movePlayerFailed"));
                return ok;
              }}
              onConfirmar={async (partidoId, jugadorId, confirmado) => {
                const res = await confirmarAsistencia(partidoId, jugadorId, confirmado);
                if (!res.ok) showMessage(res.error);
              }}
              isCoord={isCoord}
              ranking={ranking}
              currentUser={auth.currentUser}
              deepLink={partidosDeepLink}
            />
          ) : null}
          {activeTab === "resultados" ? (
            <>
              {resultadosLoading ? <p className="info-box">{t("app.toasts.loadingResults")}</p> : null}
              {resultadosError ? <p className="error-box">{t("app.toasts.resultsError", { error: resultadosError })}</p> : null}
              <Resultados
                partidos={partidos}
                onGuardar={async (id, fecha, sets) => {
                  const res = await guardarResultado(id, fecha, sets);
                  if (!res.ok) {
                    showMessage(res.error);
                    return res;
                  }
                  showMessage(t("app.toasts.resultSaved"));
                  return res;
                }}
                onValidar={async (id, fecha) => {
                  const res = await validarResultado(id, fecha);
                  if (!res.ok) return showMessage(res.error);
                  showMessage(t("app.toasts.resultValidated"));
                }}
                onModificar={async (id, fecha) => {
                  const res = await modificarResultado(id, fecha);
                  if (!res.ok) return showMessage(res.error);
                  showMessage(t("app.toasts.resultUnlocked"));
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
              {eventosError ? <p className="error-box">{t("app.toasts.agendaError", { error: eventosError })}</p> : null}
              <Agenda
                loading={eventosLoading}
                eventos={eventos}
                currentUser={auth.currentUser}
                isCoord={isCoord}
                onApuntarse={async (id) => {
                  const res = await apuntarseEvento(id);
                  if (!res.ok) return showMessage(res.error);
                  showMessage(t("app.toasts.enrollmentDone"));
                }}
                onSeleccionarPareja={async (eventoId, parejaJugadorId) => {
                  const res = await setParejaTorneo(eventoId, parejaJugadorId);
                  if (!res.ok) return showMessage(res.error);
                  showMessage(t("app.toasts.partnerSaved"));
                }}
                onBaja={async (id) => {
                  const res = await bajaEvento(id);
                  if (!res.ok) return showMessage(res.error);
                  showMessage(t("app.toasts.unregisterDone"));
                }}
                onValidarPago={async (eventoId, inscripcionId, pagado) => {
                  const res = await validarPago(eventoId, inscripcionId, pagado);
                  if (!res.ok) {
                    showMessage(res.error);
                    return res;
                  }
                  showMessage(pagado ? t("app.toasts.paymentMarked") : t("app.toasts.paymentUnmarked"));
                  return res;
                }}
                onCrearEvento={async (form) => {
                  const res = await crearEvento(form);
                  if (res.ok) showMessage(t("app.toasts.eventCreated"));
                  return res;
                }}
                onBorrarEvento={async (eventoId) => {
                  const res = await borrarEvento(eventoId);
                  if (!res.ok) {
                    showMessage(res.error);
                    return res;
                  }
                  showMessage(t("app.toasts.eventDeleted"));
                  return res;
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
        open={Boolean(perfilJugador)}
        onClose={() => setPerfilJugador(null)}
        onJugadorUpdated={(patch) => {
          setPerfilJugador((prev) => (prev && jugadoresCoinciden(prev.id, patch.id) ? { ...prev, ...patch } : prev));
          if (auth.currentUser && jugadoresCoinciden(auth.currentUser.id, patch.id)) {
            auth.patchCurrentUser(patch);
          }
        }}
      />

      <NotificacionesPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        notificaciones={notificaciones}
        loading={notifLoading}
        error={notifError}
        onMarcarLeida={marcarLeida}
        onMarcarTodasLeidas={marcarTodasLeidas}
        onNavigate={handleNotificacionNavigate}
      />

    </div>
  );
}
