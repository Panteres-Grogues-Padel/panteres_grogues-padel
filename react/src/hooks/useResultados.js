import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { createActivityLog, createNotifications } from "../lib/engagement";
import { isJugadorUuid } from "../utils/jugador";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function useResultados(partidos, currentUser, isCoord) {
  const [resultados, setResultados] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const useFallback =
    !supabase ||
    !currentUser?.id ||
    currentUser.fromFallback === true ||
    !isJugadorUuid(currentUser.id);
  const pistaIdsKey = partidos.map((p) => p.id).sort().join("|");

  async function loadResultados() {
    if (useFallback || partidos.length === 0) {
      setResultados([]);
      return;
    }
    setLoading(true);
    setError("");
    const pistaIds = partidos.map((p) => p.id);
    const { data, error: fetchError } = await supabase
      .from("resultados")
      .select("id,pista_id,fecha,set1_p1,set1_p2,set2_p1,set2_p2,set3_p1,set3_p2,introducido_por,validado_por")
      .in("pista_id", pistaIds)
      .order("fecha", { ascending: false });
    setLoading(false);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setResultados(data ?? []);
  }

  useEffect(() => {
    loadResultados();
  }, [useFallback, pistaIdsKey]);

  useEffect(() => {
    if (useFallback) return undefined;
    const channel = supabase
      .channel("resultados_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "resultados" }, loadResultados)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [useFallback]);

  function getResultado(partidoId, fecha) {
    return resultados.find((r) => r.pista_id === partidoId && r.fecha === fecha) ?? null;
  }

  function mapSetsFromResultado(r) {
    return [
      { p1: r.set1_p1, p2: r.set1_p2 },
      { p1: r.set2_p1, p2: r.set2_p2 },
      { p1: r.set3_p1, p2: r.set3_p2 }
    ];
  }

  const pendientesValidacion = useMemo(
    () => resultados.filter((r) => r.introducido_por && !r.validado_por),
    [resultados]
  );

  async function guardarResultado(partidoId, fecha, sets) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const partido = partidos.find((p) => p.id === partidoId);
    if (!partido) return { ok: false, error: "Partido no encontrado." };
    const esJugadorDelPartido = partido.jugadores.some((j) => j.jugadorId === currentUser.id);
    if (!isCoord && !esJugadorDelPartido) return { ok: false, error: "No puedes reportar este partido." };
    if (!isCoord && fecha !== todayStr()) {
      return { ok: false, error: "Solo puedes introducir el marcador del partido del dia." };
    }

    if (useFallback) return { ok: true };

    const prev = getResultado(partidoId, fecha);
    const payload = {
      pista_id: partidoId,
      fecha,
      set1_p1: sets[0].p1,
      set1_p2: sets[0].p2,
      set2_p1: sets[1].p1,
      set2_p2: sets[1].p2,
      set3_p1: sets[2].p1,
      set3_p2: sets[2].p2,
      introducido_por: currentUser.id
    };

    let query;
    if (prev) {
      query = supabase.from("resultados").update(payload).eq("id", prev.id);
    } else {
      query = supabase.from("resultados").insert(payload);
    }
    const { error: saveError } = await query;
    if (saveError) return { ok: false, error: saveError.message };
    await createActivityLog({
      jugadorId: currentUser.id,
      tipo: "resultados",
      texto: `Introduce resultado en pista ${partidoId} (${fecha})`
    });
    const notifications = partido.jugadores
      .filter((j) => j.jugadorId !== currentUser.id)
      .map((j) => ({
        jugadorId: j.jugadorId,
        tipo: "resultados",
        titulo: "Resultado pendiente de validacion",
        texto: `Se ha subido un resultado en tu partido (${fecha}).`
      }));
    await createNotifications(notifications);
    await loadResultados();
    return { ok: true };
  }

  async function validarResultado(partidoId, fecha) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const partido = partidos.find((p) => p.id === partidoId);
    if (!partido) return { ok: false, error: "Partido no encontrado." };
    const esJugadorDelPartido = partido.jugadores.some((j) => j.jugadorId === currentUser.id);
    if (!isCoord && !esJugadorDelPartido) return { ok: false, error: "No puedes validar este partido." };

    const r = getResultado(partidoId, fecha);
    if (!r) return { ok: false, error: "No hay resultado para validar." };
    if (r.introducido_por === currentUser.id) {
      return { ok: false, error: "No puedes validar tu propio resultado." };
    }
    if (useFallback) return { ok: true };

    const { error: valError } = await supabase
      .from("resultados")
      .update({ validado_por: currentUser.id, validado_at: new Date().toISOString() })
      .eq("id", r.id);
    if (valError) return { ok: false, error: valError.message };

    const { error: rpcError } = await supabase.rpc("actualizar_ranking", {
      p_resultado_id: r.id
    });
    if (rpcError) return { ok: false, error: rpcError.message };

    await createActivityLog({
      jugadorId: currentUser.id,
      tipo: "resultados",
      texto: `Valida resultado en pista ${partidoId} (${fecha})`
    });
    const notifications = partido.jugadores
      .filter((j) => j.jugadorId !== currentUser.id)
      .map((j) => ({
        jugadorId: j.jugadorId,
        tipo: "resultados",
        titulo: "Resultado validado",
        texto: `El resultado de tu partido (${fecha}) ya esta validado.`
      }));
    await createNotifications(notifications);

    await loadResultados();
    return { ok: true };
  }

  return {
    pendientesValidacion,
    guardarResultado,
    validarResultado,
    getResultado,
    mapSetsFromResultado,
    loading,
    error
  };
}
