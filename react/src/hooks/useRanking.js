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
  const j = row.jugadores ?? {};
  const id = j.id ?? row.jugador_id;
  if (!id) return null;
  const nombre = row.nombre ?? j.nombre ?? "";
  return {
    id,
    nombre,
    nombreCompleto: row.nombre_completo ?? j.nombre_completo ?? nombre,
    telefono: j.telefono ?? "",
    instagram: j.instagram ?? "",
    foto_url: j.foto_url ?? null,
    mostrar_telefono: Boolean(j.mostrar_telefono),
    autoriza_instagram: Boolean(j.autoriza_instagram),
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
