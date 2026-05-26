import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";
import { t } from "../i18n";

function rowsFromRpc(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [data];
}

function mapJugadorRow(row) {
  return {
    id: normalizeJugadorUuid(row.id),
    nombre: row.nombre ?? t("common.player"),
    nickname: row.nickname?.trim() || null,
    nombreCompleto: row.nombre_completo ?? row.nombre ?? t("common.player"),
    padrinoId: row.padrino_id ? normalizeJugadorUuid(row.padrino_id) : null,
    padrinoNombre: row.padrino_nombre ?? null,
    foto_url: row.foto_url ?? null,
    sancionat: Boolean(row.sancionat),
    sancio_fins: row.sancio_fins ?? null
  };
}

export function usePadrinos(currentUser) {
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const useFallback =
    !supabase ||
    !currentUser?.id ||
    currentUser.fromFallback === true ||
    !isJugadorUuid(currentUser.id);

  const miId = normalizeJugadorUuid(currentUser?.id);

  const loadJugadores = useCallback(async () => {
    if (useFallback) {
      setJugadores([]);
      return { ok: true };
    }

    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("get_jugadores", {});
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return { ok: false, error: rpcError.message };
    }

    setJugadores(rowsFromRpc(data).map(mapJugadorRow).filter((j) => isJugadorUuid(j.id)));
    return { ok: true };
  }, [useFallback]);

  useEffect(() => {
    void loadJugadores();
  }, [loadJugadores]);

  const yo = useMemo(
    () => jugadores.find((j) => jugadoresCoinciden(j.id, miId)) ?? null,
    [jugadores, miId]
  );

  const miPadrino = useMemo(() => {
    if (!yo?.padrinoId) return null;
    const hit = jugadores.find((j) => jugadoresCoinciden(j.id, yo.padrinoId));
    if (hit) return hit;
    return {
      id: yo.padrinoId,
      nombre: yo.padrinoNombre ?? t("common.player"),
      nombreCompleto: yo.padrinoNombre ?? t("common.player")
    };
  }, [jugadores, yo]);

  const misAhijados = useMemo(
    () => jugadores.filter((j) => jugadoresCoinciden(j.padrinoId, miId)),
    [jugadores, miId]
  );

  const candidatosPadrino = useCallback(
    (ahijadoId) =>
      jugadores.filter((j) => !jugadoresCoinciden(j.id, ahijadoId)).sort((a, b) =>
        (a.nombreCompleto ?? a.nombre).localeCompare(b.nombreCompleto ?? b.nombre, "es")
      ),
    [jugadores]
  );

  async function asignarPadrino(ahijadoId, padrinoId) {
    if (!isJugadorUuid(ahijadoId)) return { ok: false, error: t("padrinos.errors.invalidPlayer") };
    if (padrinoId != null && !isJugadorUuid(padrinoId)) {
      return { ok: false, error: t("padrinos.errors.invalidGodparent") };
    }
    if (padrinoId != null && jugadoresCoinciden(ahijadoId, padrinoId)) {
      return { ok: false, error: t("padrinos.errors.selfGodparent") };
    }

    if (useFallback) {
      setJugadores((prev) =>
        prev.map((j) =>
          jugadoresCoinciden(j.id, ahijadoId)
            ? {
                ...j,
                padrinoId: padrinoId ? normalizeJugadorUuid(padrinoId) : null,
                padrinoNombre: padrinoId
                  ? prev.find((p) => jugadoresCoinciden(p.id, padrinoId))?.nombre ?? null
                  : null
              }
            : j
        )
      );
      return { ok: true };
    }

    const { error: rpcError } = await supabase.rpc("asignar_padrino", {
      p_ahijado_id: ahijadoId,
      p_padrino_id: padrinoId
    });
    if (rpcError) return { ok: false, error: rpcError.message };

    await loadJugadores();
    return { ok: true };
  }

  async function desasignarPadrino(ahijadoId) {
    return asignarPadrino(ahijadoId, null);
  }

  return {
    jugadores,
    loading,
    error,
    miPadrino,
    misAhijados,
    candidatosPadrino,
    asignarPadrino,
    desasignarPadrino,
    reload: loadJugadores
  };
}
