import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { JUGADORES_INICIALES } from "../utils/mockData";
import { rankearJugadores } from "../utils/ranking";

function rowsFromRpc(data) {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "object") return [data];
  return [];
}

function numRanking(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mapRankingRow(row) {
  if (!row) return null;
  // Compat: payloads antics amb objecte `jugadores` nidat.
  const j = row.jugadores ?? {};
  const id = row.jugador_id ?? j.id;
  if (!id) return null;
  const nombre = row.nombre ?? j.nombre ?? "";
  const nicknameRaw = row.nickname ?? j.nickname ?? null;
  return {
    id,
    nombre,
    nickname: typeof nicknameRaw === "string" ? nicknameRaw.trim() || null : null,
    pj: row.partidos_jugados ?? 0,
    pg: row.partidos_ganados ?? 0,
    jj: row.juegos_jugados ?? 0,
    jg: row.juegos_ganados ?? 0,
    eficacia: numRanking(row.eficacia),
    penalizacion: numRanking(row.penalizacion),
    score: numRanking(row.score)
  };
}

export function useRanking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadRanking() {
      setLoading(true);
      setError("");

      if (!supabase) {
        if (!mounted) return;
        setRanking(rankearJugadores(JUGADORES_INICIALES));
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase.rpc("get_ranking");

        if (!mounted) return;
        if (fetchError) {
          setError(fetchError.message);
          setRanking(rankearJugadores(JUGADORES_INICIALES));
          return;
        }

        const rows = rowsFromRpc(data).map(mapRankingRow).filter(Boolean);
        setRanking(rows.length ? rows : rankearJugadores(JUGADORES_INICIALES));
      } catch (err) {
        if (!mounted) return;
        setError(err?.message ?? String(err));
        setRanking(rankearJugadores(JUGADORES_INICIALES));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadRanking();

    let rankingChannel;
    let jugadoresChannel;
    const onPerfilActualizado = () => {
      void loadRanking();
    };
    if (supabase) {
      rankingChannel = supabase
        .channel("ranking_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ranking" },
          () => {
            loadRanking();
          }
        )
        .subscribe();

      jugadoresChannel = supabase
        .channel("jugadores_profile_changes")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "jugadores" },
          (payload) => {
            loadRanking();
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("jugador-actualizado", {
                  detail: { jugadorId: payload.new?.id }
                })
              );
            }
          }
        )
        .subscribe();
    }
    if (typeof window !== "undefined") {
      window.addEventListener("perfil-actualizado", onPerfilActualizado);
    }

    return () => {
      mounted = false;
      if (rankingChannel) supabase.removeChannel(rankingChannel);
      if (jugadoresChannel) supabase.removeChannel(jugadoresChannel);
      if (typeof window !== "undefined") {
        window.removeEventListener("perfil-actualizado", onPerfilActualizado);
      }
    };
  }, []);

  function getPosicion(nombre) {
    return ranking.findIndex((j) => j.nombre === nombre) + 1;
  }

  const hasData = useMemo(() => ranking.length > 0, [ranking.length]);

  return { ranking, getPosicion, loading, error, hasData };
}
