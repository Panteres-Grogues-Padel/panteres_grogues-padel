import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { createActivityLog, createNotifications } from "../lib/engagement";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";

// Calcula la fecha real del partido a partir del lunes de la semana y el día de la semana del slot
export function getFechaPartido(semana, diaSemana) {
  if (!semana || diaSemana === null || diaSemana === undefined) return "";
  const d = new Date(`${semana}T00:00:00`);
  d.setDate(d.getDate() + Number(diaSemana));
  return d.toISOString().slice(0, 10);
}

// Parejas fijas por set dado un array de 4 jugadores ordenados por posición (1-4)
export function parejasPorSet(jugadores) {
  const [j1, j2, j3, j4] = jugadores;
  if (!j1 || !j2 || !j3 || !j4) return null;
  return [
    { label: "Set 1", p1: [j1, j4], p2: [j2, j3] },
    { label: "Set 2", p1: [j1, j3], p2: [j2, j4] },
    { label: "Set 3", p1: [j1, j2], p2: [j3, j4] },
  ];
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
      .select("id,pista_id,fecha,set1_p1,set1_p2,set2_p1,set2_p2,set3_p1,set3_p2,introducido_por,validado_por,validado_at")
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

  function getResultado(pistaId, fecha) {
    return resultados.find((r) => r.pista_id === pistaId && r.fecha === fecha) ?? null;
  }

  function mapSetsFromResultado(r) {
    return [
      { p1: r.set1_p1, p2: r.set1_p2 },
      { p1: r.set2_p1, p2: r.set2_p2 },
      { p1: r.set3_p1, p2: r.set3_p2 },
    ];
  }

  const pendientesValidacion = useMemo(
    () => resultados.filter((r) => r.introducido_por && !r.validado_por),
    [resultados]
  );

  async function guardarResultado(pistaId, fecha, sets) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const partido = partidos.find((p) => p.id === pistaId);
    if (!partido) return { ok: false, error: "Partido no encontrado." };

    const jugadorId = normalizeJugadorUuid(currentUser.id);
    const esJugadorDelPartido = partido.jugadores.some((j) => jugadoresCoinciden(j.jugadorId, jugadorId));
    if (!isCoord && !esJugadorDelPartido) {
      return { ok: false, error: "No puedes reportar este partido." };
    }

    const prev = getResultado(pistaId, fecha);
    if (prev && !isCoord) {
      return { ok: false, error: "El resultado ya fue introducido. Solo el coordinador puede modificarlo." };
    }

    if (useFallback) return { ok: true };

    const payload = {
      pista_id: pistaId,
      fecha,
      set1_p1: sets[0].p1,
      set1_p2: sets[0].p2,
      set2_p1: sets[1].p1,
      set2_p2: sets[1].p2,
      set3_p1: sets[2].p1,
      set3_p2: sets[2].p2,
      introducido_por: jugadorId,
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
      jugadorId,
      tipo: "resultados",
      texto: `Introduce resultado en pista ${pistaId} (${fecha})`,
    });
    const notifications = partido.jugadores
      .filter((j) => !jugadoresCoinciden(j.jugadorId, jugadorId))
      .map((j) => ({
        jugadorId: j.jugadorId,
        tipo: "resultados",
        titulo: "Resultado pendiente de validacion",
        texto: `Se ha subido un resultado en tu partido (${fecha}).`,
      }));
    await createNotifications(notifications);
    await loadResultados();
    return { ok: true };
  }

  async function validarResultado(pistaId, fecha) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    if (!isCoord) return { ok: false, error: "Solo el coordinador puede validar resultados." };

    const r = getResultado(pistaId, fecha);
    if (!r) return { ok: false, error: "No hay resultado para validar." };
    if (r.validado_por) return { ok: false, error: "Este resultado ya esta validado." };
    if (useFallback) return { ok: true };

    const jugadorId = normalizeJugadorUuid(currentUser.id);

    const { error: valError } = await supabase
      .from("resultados")
      .update({ validado_por: jugadorId, validado_at: new Date().toISOString() })
      .eq("id", r.id);
    if (valError) return { ok: false, error: valError.message };

    const { error: rpcError } = await supabase.rpc("actualizar_ranking", {
      p_resultado_id: r.id,
    });
    if (rpcError) return { ok: false, error: rpcError.message };

    await createActivityLog({
      jugadorId,
      tipo: "resultados",
      texto: `Valida resultado en pista ${pistaId} (${fecha})`,
    });
    const partido = partidos.find((p) => p.id === pistaId);
    if (partido) {
      const notifications = partido.jugadores.map((j) => ({
        jugadorId: j.jugadorId,
        tipo: "resultados",
        titulo: "Resultado validado",
        texto: `El resultado de tu partido (${fecha}) ya esta validado.`,
      }));
      await createNotifications(notifications);
    }

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
    error,
  };
}
