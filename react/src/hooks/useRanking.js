import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { JUGADORES_INICIALES } from "../utils/mockData";
import { rankearJugadores } from "../utils/ranking";

function rowsFromRpc(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [];
}

function mapRankingRow(row) {
  const j = row.jugadores ?? {};
  return {
    id: j.id ?? row.jugador_id,
    nombre: j.nombre,
    nombreCompleto: j.nombre_completo,
    telefono: j.telefono ?? "",
    instagram: j.instagram ?? "",
    foto_url: j.foto_url ?? null,
    mostrar_telefono: Boolean(j.mostrar_telefono),
    autoriza_instagram: Boolean(j.autoriza_instagram),
    pj: row.partidos_jugados ?? 0,
    pg: row.partidos_ganados ?? 0,
    jj: row.juegos_jugados ?? 0,
    jg: row.juegos_ganados ?? 0,
    eficacia: Number(row.eficacia ?? 0),
    penalizacion: Number(row.penalizacion ?? 0),
    score: Number(row.score ?? 0)
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

      const { data, error: fetchError } = await supabase.rpc("get_ranking");

      if (!mounted) return;
      if (fetchError) {
        setError(fetchError.message);
        setRanking(rankearJugadores(JUGADORES_INICIALES));
        setLoading(false);
        return;
      }

      setRanking(rowsFromRpc(data).map(mapRankingRow));
      setLoading(false);
    }

    loadRanking();

    let channel;
    if (supabase) {
      channel = supabase
        .channel("ranking_changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ranking" },
          () => {
            loadRanking();
          }
        )
        .subscribe();
    }

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  function getPosicion(nombre) {
    return ranking.findIndex((j) => j.nombre === nombre) + 1;
  }

  const hasData = useMemo(() => ranking.length > 0, [ranking.length]);

  return { ranking, getPosicion, loading, error, hasData };
}
