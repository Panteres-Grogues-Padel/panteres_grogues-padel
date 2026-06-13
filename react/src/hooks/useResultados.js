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

const MARCADORES_SET_VALIDOS = [
  [6, 0],
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [7, 5],
  [7, 6]
];

/** Marcador de set válido en pádel (6-0…6-4, 7-5, 7-6 o al revés). */
export function isSetValido(p1, p2) {
  const a = Number(p1);
  const b = Number(p2);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return MARCADORES_SET_VALIDOS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

function setParaGuardar(set) {
  const p1 = set?.p1 ?? 0;
  const p2 = set?.p2 ?? 0;
  if (!isSetValido(p1, p2)) return { p1: 0, p2: 0 };
  return { p1: Number(p1), p2: Number(p2) };
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
      if (prev?.validado_por) {
        return { ok: false, error: t("hooks.resultados.coordOnlyModify") };
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

    const algunSetNormalizadoA00 = [sets[0], sets[1], sets[2]].some(
      (s) => !isSetValido(s?.p1 ?? 0, s?.p2 ?? 0)
    );

    const set1 = setParaGuardar(sets[0]);
    const set2 = setParaGuardar(sets[1]);
    const set3 = setParaGuardar(sets[2]);
    const validadoAt = new Date().toISOString();

    const payload = {
      pista_id: partidoId,
      fecha: fechaPartido,
      set1_p1: set1.p1,
      set1_p2: set1.p2,
      set2_p1: set2.p1,
      set2_p2: set2.p2,
      set3_p1: set3.p1,
      set3_p2: set3.p2,
      introducido_por: prev?.introducido_por ?? currentUser.id,
      validado_por: currentUser.id,
      validado_at: validadoAt
    };

    let resultadoId;
    if (prev) {
      const { error: saveError } = await supabase.from("resultados").update(payload).eq("id", prev.id);
      if (saveError) return { ok: false, error: saveError.message };
      resultadoId = prev.id;
    } else {
      const { data, error: saveError } = await supabase
        .from("resultados")
        .insert(payload)
        .select("id")
        .single();
      if (saveError) return { ok: false, error: saveError.message };
      resultadoId = data?.id;
    }

    if (!resultadoId) return { ok: false, error: t("hooks.resultados.noResultToValidate") };

    lastSaveRef.current = Date.now();

    const { error: rpcError } = await supabase.rpc("actualizar_ranking", {
      p_resultado_id: resultadoId
    });
    if (rpcError) return { ok: false, error: rpcError.message };

    await createActivityLog({
      jugadorId: currentUser.id,
      tipo: "resultados",
      texto: prev
        ? t("hooks.resultados.activity.modify", { id: partidoId, date: fechaPartido })
        : t("hooks.resultados.activity.introduce", { id: partidoId, date: fechaPartido })
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

    if (algunSetNormalizadoA00) {
      return {
        ok: true,
        warning: "Algun set tenia un marcador no vàlid i s'ha guardat com 0-0."
      };
    }
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
