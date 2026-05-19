import { useCallback, useEffect, useMemo, useState } from "react";
import { EVENTOS_INICIALES } from "../utils/mockData";
import { createActivityLog } from "../lib/engagement";
import { supabase } from "../lib/supabase";
import { isJugadorUuid, jugadoresCoinciden, normalizeJugadorUuid } from "../utils/jugador";
import { getNombre } from "../utils/nombres";

function rowsFromRpc(data) {
  if (data == null) return [];
  return Array.isArray(data) ? data : [data];
}

function mapInscripcionRpcRow(ins) {
  return {
    id: ins.id,
    jugadorId: ins.jugador_id,
    nombre: getNombre(ins) || "Jugador",
    nickname: ins.nickname?.trim() || null,
    nombreCompleto: ins.nombre_completo ?? ins.nombre ?? "Jugador",
    pareja: ins.pareja ?? "",
    pagoConfirmado: Boolean(ins.pago_confirmado)
  };
}

function buildInscripcionesByEvento(insRows) {
  const byEvento = new Map();
  for (const ins of insRows ?? []) {
    const arr = byEvento.get(ins.evento_id) ?? [];
    arr.push(mapInscripcionRpcRow(ins));
    byEvento.set(ins.evento_id, arr);
  }
  return byEvento;
}

/** Lectura de inscripciones_eventos solo vía RPC (jugadores y coordinación). */
async function rpcGetInscripcionesEventos(eventoId = null) {
  const { data, error } = await supabase.rpc("get_inscripciones_eventos", {
    p_evento_id: eventoId
  });
  if (error) return { ok: false, error: error.message, rows: [] };
  return { ok: true, rows: rowsFromRpc(data) };
}

export function useEventos(currentUser, isCoord) {
  const [eventos, setEventos] = useState(EVENTOS_INICIALES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const useFallback =
    !supabase ||
    !currentUser?.id ||
    currentUser.fromFallback === true ||
    !isJugadorUuid(currentUser.id);

  const mergeInscripcionesEnEventos = useCallback((prevEventos, insRows) => {
    const byEvento = buildInscripcionesByEvento(insRows);
    return (prevEventos ?? []).map((e) => {
      const inscritos = byEvento.get(e.id) ?? [];
      const miInscripcion =
        inscritos.find((i) => jugadoresCoinciden(i.jugadorId, currentUser?.id)) ?? null;
      return {
        ...e,
        inscritos,
        totalInscritos: inscritos.length,
        totalPagados: inscritos.filter((i) => i.pagoConfirmado).length,
        miInscripcion
      };
    });
  }, [currentUser?.id]);

  const mapEventosFromRpc = useCallback(
    (eventosData, insRows) => {
      const byEvento = buildInscripcionesByEvento(insRows);

      return eventosData.map((e) => {
        const inscritos = byEvento.get(e.id) ?? [];
        const miInscripcion =
          inscritos.find((i) => jugadoresCoinciden(i.jugadorId, currentUser.id)) ?? null;
        return {
          id: e.id,
          titulo: e.titulo,
          desc: e.descripcion ?? "",
          tipo: e.tipo,
          fecha: e.fecha,
          fechaFin: e.fecha_fin ?? e.fecha,
          hora: e.hora ?? null,
          aforoMaximo: e.aforo_maximo != null ? Number(e.aforo_maximo) : null,
          precio: Number(e.precio ?? 0),
          inscritos,
          totalInscritos: inscritos.length,
          totalPagados: inscritos.filter((i) => i.pagoConfirmado).length,
          miInscripcion
        };
      });
    },
    [currentUser?.id]
  );

  /** Solo inscripciones vía RPC get_inscripciones_eventos (incluye pago_confirmado). */
  const reloadInscripcionesEventos = useCallback(
    async ({ silent = false } = {}) => {
      if (useFallback) return { ok: false, skipped: true };

      const insRes = await rpcGetInscripcionesEventos(null);
      if (!insRes.ok) {
        if (!silent) setError(insRes.error);
        return { ok: false, error: insRes.error };
      }

      setEventos((prev) => mergeInscripcionesEnEventos(prev, insRes.rows));
      return { ok: true };
    },
    [useFallback, mergeInscripcionesEnEventos]
  );

  /** Recarga eventos + inscripciones vía RPC (get_eventos, get_inscripciones_eventos). */
  const loadEventos = useCallback(
    async ({ silent = false } = {}) => {
      if (useFallback) return { ok: false, skipped: true };
      if (!silent) {
        setLoading(true);
        setError("");
      }

      const { data: eventosRaw, error: eventosError } = await supabase.rpc("get_eventos");
      if (eventosError) {
        if (!silent) setLoading(false);
        setError(eventosError.message);
        return { ok: false, error: eventosError.message };
      }

      const insRes = await rpcGetInscripcionesEventos(null);
      if (!silent) setLoading(false);
      if (!insRes.ok) {
        setError(insRes.error);
        return { ok: false, error: insRes.error };
      }

      setEventos(mapEventosFromRpc(rowsFromRpc(eventosRaw), insRes.rows));
      return { ok: true };
    },
    [useFallback, mapEventosFromRpc]
  );

  useEffect(() => {
    loadEventos();
  }, [loadEventos]);

  const eventosOrdenados = useMemo(() => {
    const sorted = [...eventos].sort((a, b) => a.fecha.localeCompare(b.fecha));
    return sorted.map((e) => {
      const inscritos = e.inscritos ?? [];
      const miInscripcion = currentUser
        ? inscritos.find((i) => jugadoresCoinciden(i.jugadorId, currentUser.id)) ?? null
        : null;
      return {
        ...e,
        inscritos,
        miInscripcion,
        totalInscritos: inscritos.length,
        totalPagados: inscritos.filter((i) => i.pagoConfirmado).length
      };
    });
  }, [eventos, currentUser]);

  async function crearEvento({ titulo, fechaInicio, fechaFin, hora, descripcion, aforoMaximo }) {
    if (!isCoord) return { ok: false, error: "Solo coordinación." };
    const tituloTrim = String(titulo ?? "").trim();
    if (!tituloTrim) return { ok: false, error: "El título es obligatorio." };
    const fecha = fechaInicio;
    const fin = fechaFin || fechaInicio;
    if (!fecha) return { ok: false, error: "La fecha de inicio es obligatoria." };
    if (!fin) return { ok: false, error: "La fecha de fin es obligatoria." };
    if (fin < fecha) return { ok: false, error: "La fecha de fin no puede ser anterior a la de inicio." };

    let aforo = null;
    if (aforoMaximo !== "" && aforoMaximo != null) {
      aforo = Number(aforoMaximo);
      if (!Number.isInteger(aforo) || aforo < 1) {
        return { ok: false, error: "El aforo debe ser un número entero mayor que 0." };
      }
    }

    const horaVal = hora ? String(hora).trim() : null;

    if (useFallback) {
      setEventos((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          titulo: tituloTrim,
          desc: String(descripcion ?? "").trim(),
          tipo: "otro",
          fecha,
          fechaFin: fin,
          hora: horaVal,
          aforoMaximo: aforo,
          precio: 0,
          inscritos: [],
          totalInscritos: 0,
          totalPagados: 0,
          miInscripcion: null
        }
      ]);
      return { ok: true };
    }

    const uid = normalizeJugadorUuid(currentUser.id);
    const { error: insError } = await supabase.from("eventos").insert({
      titulo: tituloTrim,
      fecha,
      fecha_fin: fin,
      descripcion: String(descripcion ?? "").trim() || null,
      tipo: "otro",
      precio: 0,
      hora: horaVal,
      aforo_maximo: aforo,
      creado_por: uid
    });
    if (insError) return { ok: false, error: insError.message };

    await createActivityLog({
      jugadorId: uid,
      tipo: "agenda",
      texto: `Crea evento: ${tituloTrim} (${fecha}${fin !== fecha ? ` – ${fin}` : ""})`
    });
    await loadEventos({ silent: true });
    return { ok: true };
  }

  /** Inscripción individual: sin pareja en el alta (torneos y resto). */
  async function apuntarseEvento(eventoId) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento) return { ok: false, error: "Evento no encontrado." };

    if (evento.aforoMaximo != null && (evento.inscritos?.length ?? 0) >= evento.aforoMaximo) {
      return { ok: false, error: "El evento está completo (aforo máximo alcanzado)." };
    }

    if (useFallback) {
      setEventos((prev) =>
        prev.map((e) => {
          if (e.id !== eventoId) return e;
          if (e.inscritos.some((i) => jugadoresCoinciden(i.jugadorId, currentUser.id))) return e;
          return {
            ...e,
            inscritos: [
              ...e.inscritos,
              {
                id: `tmp-${Date.now()}`,
                jugadorId: currentUser.id,
                nombre: currentUser.nombre,
                nombreCompleto: currentUser.nombreCompleto,
                pareja: "",
                pagoConfirmado: false
              }
            ]
          };
        })
      );
      return { ok: true };
    }

    const uid = normalizeJugadorUuid(currentUser.id);
    const { error: insError } = await supabase.from("inscripciones_eventos").insert({
      evento_id: eventoId,
      jugador_id: uid,
      pareja: null
    });
    if (insError) return { ok: false, error: insError.message };
    await createActivityLog({
      jugadorId: uid,
      tipo: "agenda",
      texto: `Se apunta a ${evento.titulo} (${evento.fecha})`
    });
    await reloadInscripcionesEventos({ silent: true });
    return { ok: true };
  }

  /** Pareja = `jugador_id` del compañer@ (debe estar ya inscrito en el mismo torneo). */
  async function setParejaTorneo(eventoId, parejaJugadorId) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const pid = normalizeJugadorUuid(parejaJugadorId);
    if (!isJugadorUuid(pid)) return { ok: false, error: "Selecciona una pareja válida." };
    if (jugadoresCoinciden(pid, currentUser.id)) {
      return { ok: false, error: "No puedes emparejarte contigo mism@." };
    }

    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento || evento.tipo !== "torneo") return { ok: false, error: "Solo aplica a torneos." };
    const inscritos = evento.inscritos ?? [];
    const parejaInscrita = inscritos.some((i) => jugadoresCoinciden(i.jugadorId, pid));
    if (!parejaInscrita) return { ok: false, error: "Esa persona no está inscrita en este torneo." };

    if (useFallback) {
      setEventos((prev) =>
        prev.map((e) => {
          if (e.id !== eventoId) return e;
          return {
            ...e,
            inscritos: e.inscritos.map((i) =>
              jugadoresCoinciden(i.jugadorId, currentUser.id) ? { ...i, pareja: pid } : i
            )
          };
        })
      );
      return { ok: true };
    }

    const { error: upError } = await supabase
      .from("inscripciones_eventos")
      .update({ pareja: pid })
      .eq("evento_id", eventoId)
      .eq("jugador_id", normalizeJugadorUuid(currentUser.id));
    if (upError) return { ok: false, error: upError.message };
    await reloadInscripcionesEventos({ silent: true });
    return { ok: true };
  }

  async function bajaEvento(eventoId) {
    if (!currentUser) return { ok: false, error: "Debes iniciar sesion." };
    const uid = normalizeJugadorUuid(currentUser.id);

    if (useFallback) {
      setEventos((prev) =>
        prev.map((e) => {
          if (e.id !== eventoId) return e;
          return {
            ...e,
            inscritos: e.inscritos
              .filter((i) => !jugadoresCoinciden(i.jugadorId, currentUser.id))
              .map((i) => (jugadoresCoinciden(i.pareja, uid) ? { ...i, pareja: "" } : i))
          };
        })
      );
      return { ok: true };
    }

    const { error: clearErr } = await supabase
      .from("inscripciones_eventos")
      .update({ pareja: null })
      .eq("evento_id", eventoId)
      .eq("pareja", uid);
    if (clearErr) return { ok: false, error: clearErr.message };

    const evento = eventos.find((e) => e.id === eventoId);
    const { error: delError } = await supabase
      .from("inscripciones_eventos")
      .delete()
      .eq("evento_id", eventoId)
      .eq("jugador_id", uid);
    if (delError) return { ok: false, error: delError.message };
    await createActivityLog({
      jugadorId: uid,
      tipo: "agenda",
      texto: `Se da de baja de ${evento?.titulo ?? "evento"} (${evento?.fecha ?? eventoId})`
    });
    await reloadInscripcionesEventos({ silent: true });
    return { ok: true };
  }

  async function borrarEvento(eventoId) {
    if (!isCoord) return { ok: false, error: "Solo coordinación." };
    const evento = eventos.find((e) => e.id === eventoId);

    if (useFallback) {
      setEventos((prev) => prev.filter((e) => e.id !== eventoId));
      return { ok: true };
    }

    const { error: delError } = await supabase.from("eventos").delete().eq("id", eventoId);
    if (delError) return { ok: false, error: delError.message };

    await createActivityLog({
      jugadorId: normalizeJugadorUuid(currentUser.id),
      tipo: "agenda",
      texto: `Elimina evento: ${evento?.titulo ?? eventoId}`
    });
    await loadEventos({ silent: true });
    return { ok: true };
  }

  /** Marca o desmarca pago del inscrito (coordinador) vía RPC. */
  async function validarPago(eventoId, inscripcionId, pagado = true) {
    if (!isCoord) return { ok: false, error: "Solo coordinacion." };
    if (!inscripcionId) return { ok: false, error: "Inscripción no válida." };

    const marcado = Boolean(pagado);

    const patchPagoLocal = (prev) =>
      prev.map((e) => {
        if (e.id !== eventoId) return e;
        const inscritos = e.inscritos.map((i) =>
          String(i.id) === String(inscripcionId) ? { ...i, pagoConfirmado: marcado } : i
        );
        return {
          ...e,
          inscritos,
          totalPagados: inscritos.filter((i) => i.pagoConfirmado).length
        };
      });

    if (useFallback) {
      setEventos(patchPagoLocal);
      return { ok: true };
    }

    let snapshot = null;
    setEventos((prev) => {
      snapshot = prev;
      return patchPagoLocal(prev);
    });

    const { data, error: rpcError } = await supabase.rpc("marcar_pago_inscripcion_evento", {
      p_inscripcion_id: inscripcionId,
      p_pagado: marcado
    });

    const revert = () => {
      if (snapshot) setEventos(snapshot);
    };

    if (rpcError) {
      revert();
      return { ok: false, error: rpcError.message };
    }

    const payload = data && typeof data === "object" && !Array.isArray(data) ? data : {};
    if (payload.ok === false) {
      revert();
      return { ok: false, error: payload.error ?? "No se pudo marcar el pago." };
    }

    await reloadInscripcionesEventos({ silent: true });
    return { ok: true };
  }

  return {
    eventos: eventosOrdenados,
    crearEvento,
    borrarEvento,
    apuntarseEvento,
    setParejaTorneo,
    bajaEvento,
    validarPago,
    loading,
    error
  };
}
