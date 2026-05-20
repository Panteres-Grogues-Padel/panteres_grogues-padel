import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  fechaPartidoFromSlot,
  getLunesDeSemanaLocal,
  mananaLocalStr,
  normalizeSemanaDate
} from "../utils/dates";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";

/**
 * true si el jugador tiene inscripción con partido mañana (RPC get_inscripciones).
 */
export function useMananaJuegas(currentUser) {
  const [tienePartidoManana, setTienePartidoManana] = useState(false);

  useEffect(() => {
    const userId = normalizeJugadorUuid(currentUser?.id);
    if (!supabase || !isJugadorUuid(userId) || currentUser?.fromFallback) {
      setTienePartidoManana(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const manana = mananaLocalStr();
      const lunesSemana = getLunesDeSemanaLocal(new Date(`${manana}T12:00:00`));
      const domingoSemana = fechaPartidoFromSlot(lunesSemana, 6);

      const { data: inscData, error: inscErr } = await supabase.rpc("get_inscripciones", {
        p_desde: lunesSemana,
        p_hasta: domingoSemana
      });
      if (cancelled) return;
      if (inscErr) {
        setTienePartidoManana(false);
        return;
      }

      const { data: slotsData, error: slotsErr } = await supabase
        .from("slots")
        .select("id,dia_semana")
        .eq("activo", true);
      if (cancelled) return;
      if (slotsErr) {
        setTienePartidoManana(false);
        return;
      }

      const slotsById = Object.fromEntries((slotsData ?? []).map((s) => [s.id, s]));
      const hayManana = (inscData ?? []).some((ins) => {
        if (!jugadoresCoinciden(ins.jugador_id, userId)) return false;
        const slot = slotsById[ins.slot_id];
        if (!slot) return false;
        const fecha = fechaPartidoFromSlot(normalizeSemanaDate(ins.semana), slot.dia_semana);
        return fecha === manana;
      });

      setTienePartidoManana(hayManana);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.fromFallback]);

  return tienePartidoManana;
}
