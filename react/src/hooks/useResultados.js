import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { createActivityLog, createNotifications } from "../lib/engagement";
import { ayerLocalStr, enVentanaCoordResultados, hoyLocalStr } from "../utils/dates";
import { isJugadorUuid } from "../utils/jugador";
import { t } from "../i18n";

function rowsFromRpcResultados(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [data];
}

function normalizeFechaResultado(fecha) {
  if (fecha == null) return "";
  if (typeof fecha === "string") return fecha.slice(0, 10);
  return String(fecha).slice(0, 10);
}

const REALTIME_REFETCH_MS = 400;
const IGNORE_REALTIME_AFTER_SAVE_MS = 2000;

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
  const realtimeRefetchTimerRef = useRef(null);
  const lastSaveRef = useRef(0);

  const loadResultados = useCallback(async () => {
    if (useFallback || !pistaIdsKey) {
      setResultados([]);
      return;
    }
    const pistaIds = pistaIdsKey.split("|").filter(Boolean);
    setLoading(true);
    setError("");
    const { data, error: fetchError } = await supabase.rpc("get_resultados", {
      p_pista_ids: pistaIds
    });
    setLoading(false);
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    const rows = rowsFromRpcResultados(data).map((r) => ({
      ...r,
      fecha: normalizeFechaResultado(r.fecha)
    }));
    setResultados(rows);
  }, [useFallback, pistaIdsKey]);

  useEffect(() => {
    void loadResultados();
  }, [loadResultados]);

  useEffect(() => {
    if (useFallback) return undefined;
    const onDbChange = () => {
      if (Date.now() - lastSaveRef.current < IGNORE_REALTIME_AFTER_SAVE_MS) {
        return;
      }
      if (realtimeRefetchTimerRef.current) {
        clearTimeout(realtimeRefetchTimerRef.current);
      }
      realtimeRefetchTimerRef.current = setTimeout(() => {
        realtimeRefetchTimerRef.current = null;
        if (Date.now() - lastSaveRef.current < IGNORE_REALTIME_AFTER_SAVE_MS) {
          return;
        }
        void loadResultados();
      }, REALTIME_REFETCH_MS);
    };
    const channel = supabase
      .channel("resultados_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "resultados" }, onDbChange)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "resultados" }, onDbChange)
      .subscribe();
    return () => {
      if (realtimeRefetchTimerRef.current) {
        clearTimeout(realtimeRefetchTimerRef.current);
        realtimeRefetchTimerRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [useFallback, loadResultados]);

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

  function puedeGuardarPartido(partido, prev) {
    const fecha = partido.fechaPartido;
    if (!fecha) return { ok: false, error: t("hooks.resultados.dateUnavailable") };

    if (isCoord) {
      if (!enVentanaCoordResultados(fecha)) {
        return { ok: false, error: t("hooks.resultados.coordWindow") };
      }
      return { ok: true };
    }

    const esJugador = partido.jugadores.some((j) => String(j.jugadorId) === String(currentUser.id));
    if (!esJugador) return { ok: false, error: t("hooks.resultados.cannotReport") };

    const hoy = hoyLocalStr();
    const ayer = ayerLocalStr();
    if (fecha !== hoy && fecha !== ayer) {
      return { ok: false, error: t("hooks.resultados.todayYesterdayOnly") };
    }
    if (prev) {
      return { ok: false, error: t("hooks.resultados.cannotModifyIntroduced") };
    }
    return { ok: true };
  }

  async function guardarResultado(partidoId, fecha, sets) {
    if (!currentUser) return { ok: false, error: t("hooks.resultados.mustLogin") };
    const partido = partidos.find((p) => p.id === partidoId);
    if (!partido) return { ok: false, error: t("hooks.resultados.matchNotFound") };

    const fechaPartido = partido.fechaPartido || fecha;
    const prev = getResultado(partidoId, fechaPartido);
    const perm = puedeGuardarPartido(partido, prev);
    if (!perm.ok) return perm;

    if (useFallback) return { ok: true };

    const payload = {
      pista_id: partidoId,
      fecha: fechaPartido,
      set1_p1: sets[0].p1,
      set1_p2: sets[0].p2,
      set2_p1: sets[1].p1,
      set2_p2: sets[1].p2,
      set3_p1: sets[2].p1,
      set3_p2: sets[2].p2,
      introducido_por: prev?.introducido_por ?? currentUser.id,
      validado_por: null,
      validado_at: null
    };

    let query;
    if (prev) {
      query = supabase.from("resultados").update(payload).eq("id", prev.id);
    } else {
      query = supabase.from("resultados").insert(payload);
    }
    const { error: saveError } = await query;
    if (saveError) return { ok: false, error: saveError.message };

    lastSaveRef.current = Date.now();

    await createActivityLog({
      jugadorId: currentUser.id,
      tipo: "resultados",
      texto: prev
        ? t("hooks.resultados.activity.modify", { id: partidoId, date: fechaPartido })
        : t("hooks.resultados.activity.introduce", { id: partidoId, date: fechaPartido })
    });

    if (!isCoord) {
      const notifications = partido.jugadores
        .filter((j) => j.jugadorId !== currentUser.id)
        .map((j) => ({
          jugadorId: j.jugadorId,
          tipo: "resultat_introduit",
          titulo: t("hooks.resultados.notifications.pendingTitle"),
          texto: t("hooks.resultados.notifications.pendingText", { date: fechaPartido }),
          data: { fecha: fechaPartido }
        }));
      await createNotifications(notifications);
    }

    await loadResultados();
    return { ok: true };
  }

  async function validarResultado(partidoId, fecha) {
    if (!currentUser) return { ok: false, error: t("hooks.resultados.mustLogin") };
    if (!isCoord) return { ok: false, error: t("hooks.resultados.coordOnlyValidate") };

    const partido = partidos.find((p) => p.id === partidoId);
    if (!partido) return { ok: false, error: t("hooks.resultados.matchNotFound") };

    const fechaPartido = partido.fechaPartido || fecha;
    const r = getResultado(partidoId, fechaPartido);
    if (!r) return { ok: false, error: t("hooks.resultados.noResultToValidate") };

    if (!enVentanaCoordResultados(fechaPartido)) {
      return { ok: false, error: t("hooks.resultados.outsideCoordWindow") };
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
      texto: `Valida resultado en pista ${partidoId} (${fechaPartido})`
    });

    const notifications = partido.jugadores
      .filter((j) => j.jugadorId !== currentUser.id)
      .map((j) => ({
        jugadorId: j.jugadorId,
        tipo: "resultat_validat",
        titulo: t("hooks.resultados.notifications.validatedTitle"),
        texto: t("hooks.resultados.notifications.validatedText", { date: fechaPartido }),
        data: { fecha: fechaPartido }
      }));
    await createNotifications(notifications);

    await loadResultados();
    return { ok: true };
  }

  async function modificarResultado(partidoId, fecha) {
    if (!currentUser) return { ok: false, error: t("hooks.resultados.mustLogin") };
    if (!isCoord) return { ok: false, error: t("hooks.resultados.coordOnlyModify") };

    const partido = partidos.find((p) => p.id === partidoId);
    if (!partido) return { ok: false, error: t("hooks.resultados.matchNotFound") };

    const fechaPartido = partido.fechaPartido || fecha;
    if (!enVentanaCoordResultados(fechaPartido)) {
      return { ok: false, error: t("hooks.resultados.outsideCoordWindow") };
    }

    const r = getResultado(partidoId, fechaPartido);
    if (!r) return { ok: false, error: t("hooks.resultados.noResultToModify") };
    if (!r.validado_por) return { ok: true, yaPendiente: true };

    if (useFallback) return { ok: true };

    const { error: modError } = await supabase.rpc("modificar_resultado", {
      p_resultado_id: r.id
    });
    if (modError) return { ok: false, error: modError.message };

    await createActivityLog({
      jugadorId: currentUser.id,
      tipo: "resultados",
      texto: t("hooks.resultados.activity.unlock", { id: partidoId, date: fechaPartido })
    });

    await loadResultados();
    return { ok: true };
  }

  return {
    pendientesValidacion,
    guardarResultado,
    modificarResultado,
    validarResultado,
    getResultado,
    mapSetsFromResultado,
    loading,
    error
  };
}
