import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { mapJugadorAdminRow } from "../utils/adminJugador";

export function useAdminAccess() {
  const [access, setAccess] = useState({
    loading: true,
    superAdmin: false,
    tesorero: false,
    canAccess: false
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!supabase) {
        if (!cancelled) {
          setAccess({ loading: false, superAdmin: false, tesorero: false, canAccess: false });
        }
        return;
      }

      const [saRes, teRes] = await Promise.all([
        supabase.rpc("es_super_admin"),
        supabase.rpc("es_tesorero")
      ]);

      if (cancelled) return;

      const superAdmin = saRes.data === true;
      const tesorero = teRes.data === true;
      setAccess({
        loading: false,
        superAdmin,
        tesorero,
        canAccess: superAdmin || tesorero
      });
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  return access;
}

export function useAdminJugadores(enabled) {
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!enabled || !supabase) return { ok: false };
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("get_jugadores_admin");
    setLoading(false);
    if (rpcError) {
      setError(rpcError.message);
      setJugadores([]);
      return { ok: false, error: rpcError.message };
    }
    const list = Array.isArray(data) ? data.map(mapJugadorAdminRow).filter(Boolean) : [];
    setJugadores(list);
    return { ok: true, jugadores: list };
  }, [enabled]);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const editarJugador = useCallback(
    async (jugadorId, fields) => {
      if (!supabase) return { ok: false, error: "No connection" };
      const { data, error: rpcError } = await supabase.rpc("editar_jugador_admin", {
        p_jugador_id: jugadorId,
        p_nombre: fields.nombre ?? null,
        p_primer_apellido: fields.primer_apellido ?? null,
        p_segundo_apellido: fields.segundo_apellido ?? null,
        p_nickname: fields.nickname ?? null,
        p_email: fields.email ?? null,
        p_numero_socio: fields.numero_socio ?? null,
        p_id_app_antigua: fields.id_app_antigua ?? null,
        p_pronombre: fields.pronombre ?? null,
        p_documento_identidad: fields.documento_identidad ?? null,
        p_email_contacto: fields.email_contacto ?? null,
        p_telefono: fields.telefono ?? null,
        p_fecha_nacimiento: fields.fecha_nacimiento ?? null,
        p_es_coordinador: fields.es_coordinador ?? null,
        p_es_tesorero: fields.es_tesorero ?? null,
        p_es_super_admin: fields.es_super_admin ?? null,
        p_activo: fields.activo ?? null
      });
      if (rpcError) return { ok: false, error: rpcError.message };
      await reload();
      return { ok: true, jugador: mapJugadorAdminRow(data) };
    },
    [reload]
  );

  const fetchCuotas = useCallback(async (jugadorId) => {
    if (!supabase) return { ok: false, cuotas: [], error: "No connection" };
    const { data, error: rpcError } = await supabase.rpc("get_cuotas", { p_jugador_id: jugadorId });
    if (rpcError) return { ok: false, cuotas: [], error: rpcError.message };
    return { ok: true, cuotas: Array.isArray(data) ? data : [] };
  }, []);

  const marcarCuotaPagada = useCallback(async (jugadorId, tipo, periodo, fechas = null) => {
    if (!supabase) return { ok: false, error: "No connection" };
    const { error: rpcError } = await supabase.rpc("marcar_cuota_pagada", {
      p_jugador_id: jugadorId,
      p_tipo: tipo,
      p_periodo: periodo,
      p_fecha_inicio: fechas?.fecha_inicio ?? null,
      p_fecha_fin: fechas?.fecha_fin ?? null
    });
    if (rpcError) return { ok: false, error: rpcError.message };
    return { ok: true };
  }, []);

  const desmarcarCuotaPagada = useCallback(async (jugadorId, tipo, periodo) => {
    if (!supabase) return { ok: false, error: "No connection" };
    const { error: rpcError } = await supabase.rpc("desmarcar_cuota_pagada", {
      p_jugador_id: jugadorId,
      p_tipo: tipo,
      p_periodo: periodo
    });
    if (rpcError) return { ok: false, error: rpcError.message };
    return { ok: true };
  }, []);

  return {
    jugadores,
    loading,
    error,
    reload,
    editarJugador,
    fetchCuotas,
    marcarCuotaPagada,
    desmarcarCuotaPagada
  };
}
