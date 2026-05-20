import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  fechaPartidoFromSlot,
  formatDiaPartidoLabel,
  getLunesDeSemanaLocal,
  mananaLocalStr,
  normalizeSemanaDate
} from "../utils/dates";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";

/**
 * Aviso landing: partido inscrito para mañana (inscripciones vía RPC get_inscripciones).
 */
export function useMananaJuegas(currentUser) {
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    const userId = normalizeJugadorUuid(currentUser?.id);
    if (!supabase || !isJugadorUuid(userId) || currentUser?.fromFallback) {
      setAviso(null);
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
        setAviso(null);
        return;
      }

      const { data: slotsData, error: slotsErr } = await supabase
        .from("slots")
        .select("id,label,club,dia_semana")
        .eq("activo", true);
      if (cancelled) return;
      if (slotsErr) {
        setAviso(null);
        return;
      }

      const slotsById = Object.fromEntries((slotsData ?? []).map((s) => [s.id, s]));
      const misManana = (inscData ?? [])
        .filter((ins) => jugadoresCoinciden(ins.jugador_id, userId))
        .map((ins) => {
          const slot = slotsById[ins.slot_id];
          if (!slot) return null;
          const semana = normalizeSemanaDate(ins.semana);
          const fecha = fechaPartidoFromSlot(semana, slot.dia_semana);
          if (fecha !== manana) return null;
          return { ins, slot, semana, fecha };
        })
        .filter(Boolean);

      if (!misManana.length) {
        setAviso(null);
        return;
      }

      const primero = misManana[0];
      const diaLabel = formatDiaPartidoLabel(primero.fecha);
      if (cancelled) return;

      let chipText = `Mañana juegas · ${diaLabel} — ${primero.slot.club}`;
      if (misManana.length > 1) {
        chipText += ` (+${misManana.length - 1} más)`;
      }

      setAviso({ chipText });
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.fromFallback]);

  return aviso;
}
