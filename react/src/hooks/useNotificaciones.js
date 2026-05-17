import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { isJugadorUuid, normalizeJugadorUuid } from "../utils/jugador";

function rowsFromRpc(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [];
}

function mapNotificacionRow(row) {
  return {
    id: row.id,
    jugadorId: row.jugador_id,
    tipo: row.tipo,
    titulo: row.titulo,
    texto: row.texto ?? "",
    leida: Boolean(row.leida),
    createdAt: row.created_at
  };
}

/** Pestaña BottomNav asociada a cada tipo de notificación. */
export function tabFromNotificacionTipo(tipo) {
  const map = {
    partidos: "partidos",
    resultados: "resultados",
    jugar: "jugar",
    agenda: "agenda"
  };
  return map[tipo] ?? null;
}

export function iconoNotificacionTipo(tipo) {
  const map = {
    partidos: "🔄",
    resultados: "📋",
    jugar: "📅",
    agenda: "🗓️"
  };
  return map[tipo] ?? "🔔";
}

export function formatNotificacionTs(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-ES", {
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

  const jugadorId = normalizeJugadorUuid(currentUser?.id);
  const useFallback =
    !supabase ||
    !currentUser?.id ||
    currentUser.fromFallback === true ||
    !isJugadorUuid(jugadorId);

  const loadNotificaciones = useCallback(async () => {
    if (useFallback) {
      setNotificaciones([]);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase.rpc("get_notificaciones", {
      p_jugador_id: jugadorId
    });
    setLoading(false);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setNotificaciones(rowsFromRpc(data).map(mapNotificacionRow));
  }, [useFallback, jugadorId]);

  useEffect(() => {
    loadNotificaciones();
  }, [loadNotificaciones]);

  useEffect(() => {
    if (useFallback) return undefined;
    const channel = supabase
      .channel(`notificaciones_${jugadorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notificaciones",
          filter: `jugador_id=eq.${jugadorId}`
        },
        () => {
          void loadNotificaciones();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [useFallback, jugadorId, loadNotificaciones]);

  const noLeidas = useMemo(
    () => notificaciones.filter((n) => !n.leida).length,
    [notificaciones]
  );

  async function marcarLeida(id) {
    if (!id || useFallback) return { ok: true };
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    const { error: upError } = await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
    if (upError) {
      await loadNotificaciones();
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
      await loadNotificaciones();
      return { ok: false, error: upError.message };
    }
    return { ok: true };
  }

  return {
    notificaciones,
    loading,
    error,
    noLeidas,
    loadNotificaciones,
    marcarLeida,
    marcarTodasLeidas
  };
}
