import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { isJugadorUuid, normalizeJugadorUuid } from "../utils/jugador";
import { DATE_LOCALE } from "../utils/dates";

function rowsFromRpc(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [];
}

function parseNotifData(raw) {
  if (raw == null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Normalitza tipus legacy (p. ex. cron `slot_abierto` → `slot_obert`). */
export function normalizeNotificacionTipo(tipo, titulo) {
  const t = String(tipo ?? "").trim().toLowerCase();
  if (t === "slot_abierto") return "slot_obert";
  if (tituloIndicaSlotObert(titulo)) return "slot_obert";
  return t;
}

function tituloIndicaSlotObert(titulo) {
  const s = String(titulo ?? "").toLowerCase();
  return (
    s.includes("pots inscriure") ||
    s.includes("puedes inscribir") ||
    s.includes("pots apuntar") ||
    s.includes("puedes apuntar") ||
    s.includes("llista oberta")
  );
}

function mapNotificacionRow(row) {
  if (!row?.id) return null;
  const titulo = row.titulo ?? "";
  return {
    id: row.id,
    jugadorId: row.jugador_id,
    tipo: normalizeNotificacionTipo(row.tipo, titulo),
    titulo,
    texto: row.texto ?? "",
    leida: Boolean(row.leida),
    createdAt: row.created_at,
    data: parseNotifData(row.data ?? row.data_json)
  };
}

const NOTIF_RETENCION_DIAS = 14;

function sortNotificaciones(list) {
  return [...list].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

function cutoffNotificacionesAntiguas(dias = NOTIF_RETENCION_DIAS) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString();
}

/** Pestaña BottomNav asociada a cada tipo de notificación. */
export function tabFromNotificacionTipo(tipo, titulo) {
  const t = normalizeNotificacionTipo(tipo, titulo);
  const map = {
    partidos: "partidos",
    partidos_generats: "partidos",
    partidos_generados: "partidos",
    jugador_sancionat: "partidos",
    sancio_aplicada: null,
    resultados: "resultados",
    resultat_validat: "resultados",
    resultat_introduit: "resultados",
    jugar: "jugar",
    slot_obert: "jugar",
    inscripcio: "jugar",
    baixa: "jugar",
    agenda: "agenda"
  };
  return map[t] ?? null;
}

export function iconoNotificacionTipo(tipo, titulo) {
  const t = normalizeNotificacionTipo(tipo, titulo);
  const map = {
    partidos: "🔄",
    partidos_generats: "🔄",
    partidos_generados: "🔄",
    resultados: "📋",
    resultat_validat: "📋",
    resultat_introduit: "📋",
    jugar: "📅",
    slot_obert: "📅",
    inscripcio: "📅",
    baixa: "📅",
    agenda: "🗓️"
  };
  return map[t] ?? "🔔";
}

function normalizeFechaKey(value) {
  if (!value) return "";
  const m = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

/** Resol navegació (pestanya + deep links) des d'una notificació. */
export function resolveNotificacionDeepLink(notif) {
  const tipo = normalizeNotificacionTipo(notif?.tipo, notif?.titulo);
  const data = parseNotifData(notif?.data);
  const fechaKey = normalizeFechaKey(data?.fecha ?? data?.fechaPartido ?? data?.date ?? notif?.createdAt);
  const slotId = data?.slot_id ?? data?.slotId ?? null;

  if (["partidos_generats", "partidos_generados", "partidos"].includes(tipo)) {
    return {
      tab: "partidos",
      partidosDeepLink: {
        fechaKey: fechaKey || normalizeFechaKey(notif?.createdAt),
        slotId: slotId ?? null
      },
      jugarDeepLink: null
    };
  }

  if (tipo === "slot_obert") {
    return {
      tab: "jugar",
      partidosDeepLink: null,
      jugarDeepLink: { openLista: false }
    };
  }

  if (["inscripcio", "baixa", "jugar"].includes(tipo)) {
    return {
      tab: "jugar",
      partidosDeepLink: null,
      jugarDeepLink: {
        openLista: true,
        slotBaseId: slotId ?? null,
        fechaKey: fechaKey || normalizeFechaKey(notif?.createdAt)
      }
    };
  }

  if (["resultat_validat", "resultat_introduit", "resultados"].includes(tipo)) {
    return { tab: "resultados", partidosDeepLink: null, jugarDeepLink: null };
  }

  if (tipo === "agenda") {
    return { tab: "agenda", partidosDeepLink: null, jugarDeepLink: null };
  }

  if (tipo === "sancio_aplicada") {
    return { tab: null, partidosDeepLink: null, jugarDeepLink: null };
  }

  const tab = tabFromNotificacionTipo(tipo, notif?.titulo);
  return { tab, partidosDeepLink: null, jugarDeepLink: null };
}

export function formatNotificacionTs(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(DATE_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function useNotificaciones(currentUser) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const channelRef = useRef(null);

  const jugadorId = normalizeJugadorUuid(currentUser?.id);
  const useFallback =
    !supabase ||
    !currentUser?.id ||
    currentUser.fromFallback === true ||
    !isJugadorUuid(jugadorId);

  const applyRealtimePayload = useCallback(
    (payload) => {
      const rowJugador = normalizeJugadorUuid(payload.new?.jugador_id ?? payload.old?.jugador_id);
      if (rowJugador !== jugadorId) return;

      if (payload.eventType === "INSERT") {
        const row = mapNotificacionRow(payload.new);
        if (!row) return;
        setNotificaciones((prev) => {
          if (prev.some((n) => n.id === row.id)) return prev;
          return sortNotificaciones([row, ...prev]);
        });
        return;
      }

      if (payload.eventType === "UPDATE") {
        const row = mapNotificacionRow(payload.new);
        if (!row) return;
        setNotificaciones((prev) => sortNotificaciones(prev.map((n) => (n.id === row.id ? row : n))));
        return;
      }

      if (payload.eventType === "DELETE") {
        const id = payload.old?.id;
        if (!id) return;
        setNotificaciones((prev) => prev.filter((n) => n.id !== id));
      }
    },
    [jugadorId]
  );

  const purgeNotificacionesAntiguas = useCallback(async () => {
    if (useFallback) return { ok: true, deleted: 0 };
    const cutoff = cutoffNotificacionesAntiguas();
    const { data, error: delError } = await supabase
      .from("notificaciones")
      .delete()
      .eq("jugador_id", jugadorId)
      .lt("created_at", cutoff)
      .select("id");
    if (delError) {
      console.warn("[useNotificaciones] purge:", delError.message);
      return { ok: false, error: delError.message };
    }
    const deleted = data?.length ?? 0;
    if (deleted > 0) {
      const deletedIds = new Set(data.map((r) => r.id));
      setNotificaciones((prev) => prev.filter((n) => !deletedIds.has(n.id)));
    }
    return { ok: true, deleted };
  }, [useFallback, jugadorId]);

  const fetchNotificaciones = useCallback(
    async ({ showLoading = false } = {}) => {
      if (useFallback) {
        setNotificaciones([]);
        setError("");
        return;
      }
      if (showLoading) setLoading(true);
      setError("");
      const { data, error: fetchError } = await supabase.rpc("get_notificaciones", {
        p_jugador_id: jugadorId
      });
      if (showLoading) setLoading(false);
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      setNotificaciones(sortNotificaciones(rowsFromRpc(data).map(mapNotificacionRow).filter(Boolean)));
    },
    [useFallback, jugadorId]
  );

  const removeRealtimeChannel = useCallback(async () => {
    const ch = channelRef.current;
    channelRef.current = null;
    if (ch) await supabase.removeChannel(ch);
  }, []);

  const subscribeRealtime = useCallback(async () => {
    if (useFallback || !supabase) return;

    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session) return;

    await removeRealtimeChannel();

    const filter = `jugador_id=eq.${jugadorId}`;
    const channel = supabase
      .channel(`notificaciones:${jugadorId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones", filter },
        applyRealtimePayload
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notificaciones", filter },
        applyRealtimePayload
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "notificaciones", filter },
        applyRealtimePayload
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[useNotificaciones] Realtime:", status, err?.message ?? err);
          void fetchNotificaciones({ showLoading: false });
        }
      });

    channelRef.current = channel;
  }, [useFallback, jugadorId, applyRealtimePayload, removeRealtimeChannel, fetchNotificaciones]);

  useEffect(() => {
    if (useFallback) {
      setNotificaciones([]);
      setError("");
      void removeRealtimeChannel();
      return undefined;
    }

    let cancelled = false;

    void (async () => {
      await purgeNotificacionesAntiguas();
      if (!cancelled) await fetchNotificaciones({ showLoading: true });
    })();

    void (async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (session && !cancelled) await subscribeRealtime();
    })();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session || cancelled) return;
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void subscribeRealtime();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      void removeRealtimeChannel();
    };
  }, [
    useFallback,
    jugadorId,
    fetchNotificaciones,
    purgeNotificacionesAntiguas,
    subscribeRealtime,
    removeRealtimeChannel
  ]);

  const noLeidas = useMemo(
    () => notificaciones.filter((n) => !n.leida).length,
    [notificaciones]
  );

  async function marcarLeida(id) {
    if (!id || useFallback) return { ok: true };
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    const { error: upError } = await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
    if (upError) {
      await fetchNotificaciones({ showLoading: false });
      return { ok: false, error: upError.message };
    }
    return { ok: true };
  }

  async function marcarTodasLeidas() {
    if (useFallback) return { ok: true };
    const ids = notificaciones.filter((n) => !n.leida).map((n) => n.id);
    if (!ids.length) return { ok: true };
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    const { error: upError } = await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("jugador_id", jugadorId)
      .eq("leida", false);
    if (upError) {
      await fetchNotificaciones({ showLoading: false });
      return { ok: false, error: upError.message };
    }
    return { ok: true };
  }

  return {
    notificaciones,
    loading,
    error,
    noLeidas,
    loadNotificaciones: async () => {
      await purgeNotificacionesAntiguas();
      return fetchNotificaciones({ showLoading: true });
    },
    marcarLeida,
    marcarTodasLeidas
  };
}
