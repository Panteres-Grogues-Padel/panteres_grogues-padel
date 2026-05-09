import { supabase } from "./supabase";
import { isJugadorUuid } from "../utils/jugador";

export async function createNotifications(notifications) {
  if (!supabase || !notifications?.length) return { ok: true };
  const payload = notifications
    .filter((n) => isJugadorUuid(n.jugadorId))
    .map((n) => ({
      jugador_id: n.jugadorId,
      tipo: n.tipo,
      titulo: n.titulo,
      texto: n.texto
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
