import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { JUGADORES_INICIALES } from "../utils/mockData";
import { rankearJugadores } from "../utils/ranking";

function mapRankingRow(row) {
  const j = row.jugadores;
  return {
    id: j.id,
    nombre: j.nombre,
    nombreCompleto: j.nombre_completo,
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

      const { data, error: fetchError } = await supabase
        .from("ranking")
        .select(
          "partidos_jugados,partidos_ganados,juegos_jugados,juegos_ganados,eficacia,penalizacion,score,jugadores!inner(id,nombre,nombre_completo)"
        )
        .order("score", { ascending: false });

      if (!mounted) return;
      if (fetchError) {
        setError(fetchError.message);
        setRanking(rankearJugadores(JUGADORES_INICIALES));
        setLoading(false);
        return;
      }

      setRanking((data ?? []).map(mapRankingRow));
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
