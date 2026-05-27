import { supabase } from "./supabase";
import { isJugadorUuid } from "../utils/jugador";

export async function notificacionDuplicada({ jugadorId, tipo, titulo, texto }) {
  if (!supabase || !isJugadorUuid(jugadorId)) return false;
  const { data, error } = await supabase.rpc("notificacion_duplicada", {
    p_jugador_id: jugadorId,
    p_tipo: tipo,
    p_titulo: titulo,
    p_texto: texto
  });
  if (error) {
    console.warn("[notificacionDuplicada]", error.message);
    return false;
  }
  return Boolean(data);
}

export async function createNotifications(notifications) {
  if (!supabase || !notifications?.length) return { ok: true };
  const payload = notifications
    .filter((n) => isJugadorUuid(n.jugadorId))
    .map((n) => ({
      jugador_id: n.jugadorId,
      tipo: n.tipo,
      titulo: n.titulo,
      texto: n.texto,
      data: n.data ?? {}
    }));
  if (!payload.length) return { ok: true };
  const { error } = await supabase.from("notificaciones").insert(payload);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createActivityLog({ jugadorId, tipo, texto }) {
  if (!supabase || !jugadorId || !isJugadorUuid(jugadorId)) return { ok: true };
  const { error } = await supabase.from("activity_log").insert({
    jugador_id: jugadorId,
    tipo,
    texto
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
