import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  fechaPartidoFromSlot,
  formatDiaPartidoLabel,
  formatHoraInput,
  getLunesDeSemanaLocal,
  mananaLocalStr,
  normalizeSemanaDate
} from "../utils/dates";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";

function rowsFromRpcPartidos(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [data];
}

async function horaPartidoJugador(slotId, semana, jugadorId) {
  const { data, error } = await supabase.rpc("get_partidos_slot", {
    p_slot_id: slotId,
    p_semana: semana
  });
  if (error) return null;

  const uid = normalizeJugadorUuid(jugadorId);
  for (const pg of rowsFromRpcPartidos(data)) {
    for (const pista of pg.pistas_partido ?? []) {
      const enPista = (pista.jugadores_pista ?? []).some((jp) =>
        jugadoresCoinciden(jp.jugador_id, uid)
      );
      if (enPista && pista.hora) return formatHoraInput(pista.hora);
    }
  }
  return null;
}

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
      const hora = await horaPartidoJugador(primero.slot.id, primero.semana, userId);
      if (cancelled) return;

      let detalle = `${diaLabel} · ${primero.slot.label} — ${primero.slot.club}`;
      if (hora) detalle += ` · ${hora}`;
      if (misManana.length > 1) {
        detalle += ` (+${misManana.length - 1} más)`;
      }

      setAviso({ detalle });
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, currentUser?.fromFallback]);

  return aviso;
}
